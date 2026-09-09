"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { type ActionState } from "@/lib/actions/shared";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  locale: z.string().default("pt"),
});

/**
 * One sign-in form for both roles. The landing page differs by role, but the
 * credentials check does not — and a failed attempt always returns the same
 * message whether the account is missing, has the wrong password, or is an
 * administrator, so the form cannot be used to enumerate accounts.
 */
export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    locale: formData.get("locale") ?? "pt",
  });

  if (!parsed.success) {
    return { ok: false, message: "Incorrect email or password." };
  }

  const { email, password, locale } = parsed.data;

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "Incorrect email or password." };
    }
    throw error;
  }

  // The session cookie is set on the response, so auth() cannot see it yet
  // within this same request. Read the role directly to choose the landing page.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, organizationId: true },
  });

  if (user?.role === "ADMIN") redirect(`/${locale}/admin`);
  if (user && !user.organizationId) redirect(`/${locale}/dashboard/organization`);
  redirect(`/${locale}/dashboard`);
}
