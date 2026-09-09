import type { Role } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";

// Compared against when the email does not exist, so that a missing account and
// a wrong password take the same amount of time. Prevents user enumeration via
// response timing on the login endpoint.
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.7Ip9k4rL0kM7Uu5Xd6Tq2z0Vb3xJZ0y";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * The claims this application adds to the Auth.js token.
 *
 * `next-auth/jwt` only re-exports its JWT interface from `@auth/core`, so a
 * `declare module` augmentation does not merge into the interface the callbacks
 * actually use. Rather than rely on that, the extra claims are modelled here and
 * applied through one narrow cast per callback — the shape stays explicit and
 * checked at every use site.
 */
type AppClaims = {
  uid: string;
  role: Role;
  organizationId: string | null;
};

type TokenWithClaims = Record<string, unknown> & Partial<AppClaims>;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT strategy: the Credentials provider cannot use database sessions.
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          await bcrypt.compare(parsed.data.password, DUMMY_HASH);
          return null;
        }

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      const claims = token as TokenWithClaims;

      if (user) {
        claims.uid = user.id as string;
        claims.role = user.role;
        claims.organizationId = user.organizationId;
      }

      // An owner creates their organization after registering, so the claim in
      // the token goes stale. Re-read it when the session is refreshed.
      if (trigger === "update" && typeof claims.uid === "string") {
        const fresh = await prisma.user.findUnique({
          where: { id: claims.uid },
          select: { role: true, organizationId: true },
        });

        if (fresh) {
          claims.role = fresh.role;
          claims.organizationId = fresh.organizationId;
        }
      }

      return token;
    },

    async session({ session, token }) {
      const claims = token as TokenWithClaims;

      if (session.user) {
        // If a claim is missing the session is left without an id, and
        // getActor() then treats the request as anonymous rather than guessing.
        session.user.id = claims.uid ?? "";
        session.user.role = claims.role ?? "MINE_OWNER";
        session.user.organizationId = claims.organizationId ?? null;
      }

      return session;
    },
  },
});
