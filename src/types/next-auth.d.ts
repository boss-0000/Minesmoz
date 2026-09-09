import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Session and User carry the role and organization so that every server
 * component and action can authorize without a second database round-trip.
 *
 * The matching JWT claims are typed in src/lib/auth.ts instead of here: the JWT
 * interface is re-exported from @auth/core rather than declared in next-auth, so
 * augmenting it from this file does not merge into the type the callbacks use.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      organizationId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    organizationId: string | null;
  }
}
