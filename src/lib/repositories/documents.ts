import type { DocumentType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ConflictError, type Actor } from "@/lib/authz";
import { buildStorageKey, putObject } from "@/lib/storage";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB

/** Uploads are restricted to document formats; no HTML or SVG, which can script. */
export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/**
 * Resolves a document only if the actor is entitled to it.
 *
 * An administrator may read any document, because reviewing them is the job. An
 * owner may read only documents attached to a mine belonging to their own
 * organization. Everyone else — including an authenticated owner from another
 * organization, and any anonymous caller — gets null, which the route turns
 * into a 404.
 */
export async function getDocumentForActor(actor: Actor, documentId: string) {
  if (!documentId) return null;

  if (actor.role === "ADMIN") {
    return prisma.mineDocument.findUnique({ where: { id: documentId } });
  }

  if (!actor.organizationId) return null;

  return prisma.mineDocument.findFirst({
    where: {
      id: documentId,
      mine: { organizationId: actor.organizationId },
    },
  });
}

export async function listDocumentsForMine(actor: Actor, mineId: string) {
  if (actor.role === "ADMIN") {
    return prisma.mineDocument.findMany({
      where: { mineId },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!actor.organizationId) return [];

  return prisma.mineDocument.findMany({
    where: { mineId, mine: { organizationId: actor.organizationId } },
    orderBy: { createdAt: "desc" },
  });
}

export async function addDocumentToMine(
  actor: Actor & { organizationId: string },
  mineId: string,
  file: { name: string; type: string; bytes: Buffer },
  documentType: DocumentType,
) {
  if (file.bytes.byteLength === 0) throw new ConflictError("The file is empty");
  if (file.bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new ConflictError("The file exceeds the 10 MB limit");
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new ConflictError("Unsupported file type: " + file.type);
  }

  // Ownership is re-checked here rather than trusted from the caller, and the
  // mine must still be in a state the owner may edit.
  const mine = await prisma.mine.findFirst({
    where: { id: mineId, organizationId: actor.organizationId },
    select: { id: true, status: true },
  });

  if (!mine) throw new ConflictError("Mine not found for this organization");
  if (mine.status !== "DRAFT" && mine.status !== "REJECTED") {
    throw new ConflictError("Documents cannot be added once the mine is under review");
  }

  const storageKey = buildStorageKey(mine.id, file.name);
  await putObject(storageKey, file.bytes, file.type);

  return prisma.mineDocument.create({
    data: {
      mineId: mine.id,
      storageKey,
      originalName: file.name.slice(0, 200),
      mimeType: file.type,
      sizeBytes: file.bytes.byteLength,
      documentType,
      uploadedById: actor.id,
    },
    select: { id: true, originalName: true },
  });
}
