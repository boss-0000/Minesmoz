"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireOrganization } from "@/lib/authz";
import { addDocumentToMine } from "@/lib/repositories/documents";
import {
  createMine,
  submitMineForReview,
  updateMineDraft,
} from "@/lib/repositories/mines";
import { DOCUMENT_TYPES, mineSchema } from "@/lib/validation";
import { type ActionState, toActionState } from "@/lib/actions/shared";

function readMineForm(formData: FormData) {
  return mineSchema.parse({
    name: formData.get("name"),
    mineralType: formData.get("mineralType"),
    province: formData.get("province"),
    district: formData.get("district"),
    description: formData.get("description"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    licenceReference: formData.get("licenceReference"),
    investmentMinUsd: formData.get("investmentMinUsd"),
    investmentMaxUsd: formData.get("investmentMaxUsd"),
  });
}

function normalize(input: ReturnType<typeof readMineForm>) {
  return {
    name: input.name,
    mineralType: input.mineralType,
    province: input.province,
    district: input.district || null,
    description: input.description || null,
    latitude: input.latitude,
    longitude: input.longitude,
    licenceReference: input.licenceReference || null,
    investmentMinUsd: input.investmentMinUsd,
    investmentMaxUsd: input.investmentMaxUsd,
  };
}

export async function createMineAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale = String(formData.get("locale") ?? "pt");
  let newId: string;

  try {
    const actor = await requireOrganization();
    const mine = await createMine(actor, normalize(readMineForm(formData)));
    newId = mine.id;
  } catch (error) {
    return toActionState(error);
  }

  revalidatePath(`/${locale}/dashboard`);
  redirect(`/${locale}/dashboard/mines/${newId}`);
}

export async function updateMineAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireOrganization();
    const id = z.string().min(1).parse(formData.get("mineId"));

    await updateMineDraft(actor, id, normalize(readMineForm(formData)));

    revalidatePath(`/${String(formData.get("locale") ?? "pt")}/dashboard`);
    return { ok: true, message: "Mine saved." };
  } catch (error) {
    return toActionState(error);
  }
}

export async function uploadDocumentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireOrganization();
    const mineId = z.string().min(1).parse(formData.get("mineId"));
    const documentType = z.enum(DOCUMENT_TYPES).parse(formData.get("documentType"));

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, fieldErrors: { file: ["Choose a file to upload."] } };
    }

    await addDocumentToMine(
      actor,
      mineId,
      {
        name: file.name,
        type: file.type,
        bytes: Buffer.from(await file.arrayBuffer()),
      },
      documentType,
    );

    revalidatePath(`/${String(formData.get("locale") ?? "pt")}/dashboard/mines/${mineId}`);
    return { ok: true, message: "Document uploaded." };
  } catch (error) {
    return toActionState(error);
  }
}

export async function submitMineAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireOrganization();
    const mineId = z.string().min(1).parse(formData.get("mineId"));

    await submitMineForReview(actor, mineId);

    revalidatePath(`/${String(formData.get("locale") ?? "pt")}/dashboard`);
    return { ok: true, message: "Submitted for review." };
  } catch (error) {
    return toActionState(error);
  }
}
