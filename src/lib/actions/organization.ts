"use server";

import { revalidatePath } from "next/cache";

import { requireMineOwner } from "@/lib/authz";
import {
  createOrganizationForOwner,
  updateOrganization,
} from "@/lib/repositories/organizations";
import { organizationSchema } from "@/lib/validation";
import { type ActionState, toActionState } from "@/lib/actions/shared";

export async function saveOrganizationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireMineOwner();

    const input = organizationSchema.parse({
      name: formData.get("name"),
      registrationNumber: formData.get("registrationNumber"),
      province: formData.get("province"),
      contactEmail: formData.get("contactEmail"),
      contactPhone: formData.get("contactPhone"),
      description: formData.get("description"),
    });

    if (actor.organizationId) {
      await updateOrganization(actor, input);
    } else {
      await createOrganizationForOwner(actor, input);
    }

    revalidatePath("/", "layout");
    return { ok: true, message: "Organization saved." };
  } catch (error) {
    return toActionState(error);
  }
}
