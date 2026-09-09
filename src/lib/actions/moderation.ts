"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/authz";
import { approveMine, rejectMine } from "@/lib/repositories/mines";
import { rejectSchema } from "@/lib/validation";
import { type ActionState, toActionState } from "@/lib/actions/shared";

/**
 * Both actions call requireAdmin() before anything else, and the repository
 * re-checks the role independently. The duplication is intentional: a future
 * caller that forgets the guard still cannot approve anything.
 */
export async function approveMineAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const mineId = z.string().min(1).parse(formData.get("mineId"));

    await approveMine(actor, mineId);

    revalidatePath("/", "layout");
    return { ok: true, message: "Mine approved and published." };
  } catch (error) {
    return toActionState(error);
  }
}

export async function rejectMineAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const mineId = z.string().min(1).parse(formData.get("mineId"));
    const { reason } = rejectSchema.parse({ reason: formData.get("reason") });

    await rejectMine(actor, mineId, reason);

    revalidatePath("/", "layout");
    return { ok: true, message: "Mine rejected and returned to the owner." };
  } catch (error) {
    return toActionState(error);
  }
}
