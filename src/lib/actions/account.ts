"use server";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { type ActionState, toActionState } from "@/lib/actions/shared";

const BCRYPT_COST = 12;

/**
 * Self-registration always produces a MINE_OWNER.
 *
 * The role is hard-coded rather than read from the form. A `role` field posted
 * by a caller is ignored, so there is no path from public registration to an
 * administrator account. Admin accounts are created by seed or by an existing
 * administrator.
 */
export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const input = registerSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      // Deliberately the same shape as success from the caller's perspective is
      // NOT used here: on a registration form the email must be reported as
      // taken or the user cannot proceed. The trade-off is accepted knowingly.
      return { ok: false, fieldErrors: { email: ["That email is already registered."] } };
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: "MINE_OWNER",
      },
    });

    return { ok: true, message: "Account created. Please sign in." };
  } catch (error) {
    return toActionState(error);
  }
}
