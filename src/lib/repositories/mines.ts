import type { MineralType, MineStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ConflictError, ForbiddenError, type Actor } from "@/lib/authz";

/**
 * Field allowlist for anything reachable without a session.
 *
 * This is an allowlist, not a blocklist, and it is the only projection used by
 * the public page and the public API. Internal id, documents, rejectionReason,
 * moderation history and contact details are absent by construction, so they
 * cannot leak later by someone adding a field to the model.
 */
export const PUBLIC_MINE_SELECT = {
  publicId: true,
  name: true,
  mineralType: true,
  province: true,
  district: true,
  latitude: true,
  longitude: true,
  description: true,
  investmentMinUsd: true,
  investmentMaxUsd: true,
  reviewedAt: true,
  organization: {
    select: {
      name: true,
      province: true,
      verificationStatus: true,
    },
  },
} satisfies Prisma.MineSelect;

export type PublicMine = Prisma.MineGetPayload<{ select: typeof PUBLIC_MINE_SELECT }>;

export type MineInput = {
  name: string;
  mineralType: MineralType;
  province: string;
  district?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  licenceReference?: string | null;
  investmentMinUsd?: number | null;
  investmentMaxUsd?: number | null;
};

/**
 * The only permitted status transitions. Anything not listed here is rejected
 * before a query is issued.
 */
const TRANSITIONS: Record<MineStatus, MineStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["APPROVED", "REJECTED"],
  REJECTED: ["SUBMITTED"],
  APPROVED: [],
};

/** Statuses an owner is still allowed to edit. Approved records are frozen. */
const EDITABLE: MineStatus[] = ["DRAFT", "REJECTED"];

export function canTransition(from: MineStatus, to: MineStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/* ------------------------------------------------------------------ public */

/**
 * Public read. The APPROVED filter is part of the query, not a check on the
 * result, so a non-approved mine is indistinguishable from one that does not
 * exist: the caller gets null and the route returns 404. Returning 403 here
 * would confirm the record exists and make publicIds enumerable.
 */
export async function getPublicMine(publicId: string) {
  if (!publicId) return null;
  return prisma.mine.findFirst({
    where: { publicId, status: "APPROVED" },
    select: PUBLIC_MINE_SELECT,
  });
}

export async function listPublicMines(
  params: { mineralType?: MineralType; province?: string } = {},
) {
  return prisma.mine.findMany({
    where: {
      status: "APPROVED",
      ...(params.mineralType ? { mineralType: params.mineralType } : {}),
      ...(params.province ? { province: params.province } : {}),
    },
    select: PUBLIC_MINE_SELECT,
    orderBy: { reviewedAt: "desc" },
    take: 100,
  });
}

/* ------------------------------------------------------------------- owner */

/** Scoped to the actor's organization. There is no unscoped owner read. */
export async function listOwnedMines(actor: Actor) {
  if (!actor.organizationId) return [];
  return prisma.mine.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { documents: true } } },
  });
}

/**
 * Returns null rather than throwing when the mine belongs to another
 * organization, so a cross-tenant probe is answered with 404, not 403.
 */
export async function getOwnedMine(actor: Actor, id: string) {
  if (!actor.organizationId || !id) return null;
  return prisma.mine.findFirst({
    where: { id, organizationId: actor.organizationId },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          documentType: true,
          createdAt: true,
        },
      },
      moderationEvents: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true, role: true } } },
      },
    },
  });
}

export async function createMine(
  actor: Actor & { organizationId: string },
  data: MineInput,
) {
  return prisma.mine.create({
    data: {
      ...data,
      organizationId: actor.organizationId,
      status: "DRAFT",
    },
  });
}

export async function updateMineDraft(
  actor: Actor & { organizationId: string },
  id: string,
  data: MineInput,
) {
  // The ownership and status predicates live in the WHERE clause: a mine owned
  // by another organization, or one already submitted or approved, matches zero
  // rows and is never written.
  const result = await prisma.mine.updateMany({
    where: { id, organizationId: actor.organizationId, status: { in: EDITABLE } },
    data,
  });

  if (result.count === 0) {
    throw new ConflictError("Mine is not editable, or does not belong to this organization");
  }
}

/**
 * DRAFT -> SUBMITTED, or REJECTED -> SUBMITTED once the owner has revised it.
 * The status predicate is in the WHERE clause so two concurrent submissions
 * cannot both succeed.
 */
export async function submitMineForReview(
  actor: Actor & { organizationId: string },
  id: string,
) {
  return prisma.$transaction(async (tx) => {
    const mine = await tx.mine.findFirst({
      where: { id, organizationId: actor.organizationId },
      select: { id: true, status: true, _count: { select: { documents: true } } },
    });

    if (!mine) throw new ConflictError("Mine not found for this organization");
    if (!canTransition(mine.status, "SUBMITTED")) {
      throw new ConflictError("Cannot submit a mine with status " + mine.status);
    }
    if (mine._count.documents === 0) {
      throw new ConflictError("At least one supporting document is required");
    }

    const updated = await tx.mine.updateMany({
      where: { id, organizationId: actor.organizationId, status: { in: EDITABLE } },
      data: { status: "SUBMITTED", submittedAt: new Date(), rejectionReason: null },
    });

    if (updated.count === 0) throw new ConflictError("Mine status changed, please retry");

    await tx.moderationEvent.create({
      data: { mineId: id, action: "SUBMITTED", actorId: actor.id },
    });
  });
}

/* ------------------------------------------------------------------- admin */

export async function listReviewQueue(actor: Actor, status: MineStatus = "SUBMITTED") {
  if (actor.role !== "ADMIN") throw new ForbiddenError();
  return prisma.mine.findMany({
    where: { status },
    orderBy: { submittedAt: "asc" },
    include: {
      organization: { select: { name: true, verificationStatus: true } },
      _count: { select: { documents: true } },
    },
  });
}

export async function getMineForReview(actor: Actor, id: string) {
  if (actor.role !== "ADMIN") throw new ForbiddenError();
  return prisma.mine.findUnique({
    where: { id },
    include: {
      organization: true,
      documents: { orderBy: { createdAt: "desc" } },
      moderationEvents: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true, role: true } } },
      },
    },
  });
}

/**
 * Admin decision, guarded on status = SUBMITTED in the WHERE clause so a mine
 * cannot be approved twice and no race can move a record from DRAFT straight
 * to APPROVED.
 */
async function decide(
  actor: Actor,
  id: string,
  decision: "APPROVED" | "REJECTED",
  reason?: string,
) {
  if (actor.role !== "ADMIN") throw new ForbiddenError();

  const trimmedReason = reason?.trim() ?? "";
  if (decision === "REJECTED" && !trimmedReason) {
    throw new ConflictError("A reason is required when rejecting");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.mine.updateMany({
      where: { id, status: "SUBMITTED" },
      data: {
        status: decision,
        reviewedAt: new Date(),
        reviewedById: actor.id,
        rejectionReason: decision === "REJECTED" ? trimmedReason : null,
      },
    });

    if (updated.count === 0) {
      throw new ConflictError("Mine is not awaiting review; it may already have been decided");
    }

    await tx.moderationEvent.create({
      data: {
        mineId: id,
        action: decision,
        reason: decision === "REJECTED" ? trimmedReason : null,
        actorId: actor.id,
      },
    });
  });
}

export function approveMine(actor: Actor, id: string) {
  return decide(actor, id, "APPROVED");
}

export function rejectMine(actor: Actor, id: string, reason: string) {
  return decide(actor, id, "REJECTED", reason);
}
