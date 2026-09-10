/**
 * Exercises the moderation workflow against a real database.
 *
 * The security suite (verify-security.ts) proves what cannot be read. This one
 * proves the write path behaves: every legal transition works, every illegal
 * one is refused, and publication follows approval rather than intent.
 *
 *   pnpm db:seed
 *   pnpm verify:workflow
 *
 * It creates its own mine and removes it afterwards, so it can be run
 * repeatedly without reseeding.
 */

import { PrismaClient } from "@prisma/client";

import type { Actor } from "../src/lib/authz";
import { addDocumentToMine } from "../src/lib/repositories/documents";
import {
  approveMine,
  createMine,
  getOwnedMine,
  getPublicMine,
  rejectMine,
  submitMineForReview,
  updateMineDraft,
} from "../src/lib/repositories/mines";

const prisma = new PrismaClient();

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}\n        ${detail}`);
}

/** Asserts a condition holds. */
function expectTrue(name: string, condition: boolean, detail: string) {
  record(name, condition, detail);
}

/** Asserts the operation is refused, and reports the reason given. */
async function expectRejected(name: string, operation: () => Promise<unknown>) {
  try {
    await operation();
    record(name, false, "the operation succeeded, but it should have been refused");
  } catch (error) {
    record(name, true, `refused: ${(error as Error).message}`);
  }
}

async function statusOf(id: string) {
  const mine = await prisma.mine.findUnique({
    where: { id },
    select: { status: true, rejectionReason: true, reviewedAt: true, publicId: true },
  });
  if (!mine) throw new Error("mine vanished");
  return mine;
}

const DRAFT_INPUT = {
  name: "Verification Test Pit",
  mineralType: "GARNET" as const,
  province: "Manica",
  district: "Sussundenga",
  description: "Created by verify-workflow.ts.",
  latitude: null,
  longitude: null,
  licenceReference: null,
  investmentMinUsd: 50000,
  investmentMaxUsd: 90000,
};

async function main() {
  const [adminUser, ownerAUser, ownerBUser] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: "admin@minesmoz.test" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "owner@minesmoz.test" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "owner2@minesmoz.test" } }),
  ]);

  const admin: Actor = {
    id: adminUser.id,
    email: adminUser.email,
    role: "ADMIN",
    organizationId: null,
  };
  const ownerA = {
    id: ownerAUser.id,
    email: ownerAUser.email,
    role: "MINE_OWNER" as const,
    organizationId: ownerAUser.organizationId!,
  };
  const ownerB = {
    id: ownerBUser.id,
    email: ownerBUser.email,
    role: "MINE_OWNER" as const,
    organizationId: ownerBUser.organizationId!,
  };

  console.log("\nExercising the moderation workflow\n");

  // --- draft ---------------------------------------------------------------
  console.log("Draft");
  const mine = await createMine(ownerA, DRAFT_INPUT);
  expectTrue(
    "A new mine starts as DRAFT",
    (await statusOf(mine.id)).status === "DRAFT",
    `status is ${(await statusOf(mine.id)).status}`,
  );
  expectTrue(
    "A draft is not publicly visible",
    (await getPublicMine(mine.publicId)) === null,
    "getPublicMine returned null",
  );

  // --- submission requires a document --------------------------------------
  console.log("\nSubmission");
  await expectRejected("A mine cannot be submitted without a document", () =>
    submitMineForReview(ownerA, mine.id),
  );

  await addDocumentToMine(
    ownerA,
    mine.id,
    { name: "licenca.pdf", type: "application/pdf", bytes: Buffer.from("%PDF-1.4\n%%EOF\n") },
    "MINING_LICENSE",
  );

  await submitMineForReview(ownerA, mine.id);
  expectTrue(
    "With a document attached, submission succeeds",
    (await statusOf(mine.id)).status === "SUBMITTED",
    "status is SUBMITTED",
  );
  expectTrue(
    "A submitted mine is still not public",
    (await getPublicMine(mine.publicId)) === null,
    "getPublicMine returned null",
  );

  await expectRejected("A submitted mine can no longer be edited by its owner", () =>
    updateMineDraft(ownerA, mine.id, { ...DRAFT_INPUT, name: "Renamed while under review" }),
  );
  await expectRejected("A mine cannot be submitted twice", () =>
    submitMineForReview(ownerA, mine.id),
  );

  // --- who may decide ------------------------------------------------------
  console.log("\nAuthority to decide");
  await expectRejected("An owner cannot approve their own mine", () =>
    approveMine(ownerA as unknown as Actor, mine.id),
  );
  await expectRejected("An owner cannot approve another organization's mine", () =>
    approveMine(ownerB as unknown as Actor, mine.id),
  );
  await expectRejected("Rejection without a reason is refused", () =>
    rejectMine(admin, mine.id, "   "),
  );

  // --- rejection and correction -------------------------------------------
  console.log("\nRejection and resubmission");
  await rejectMine(admin, mine.id, "The licence reference is missing from the submission.");
  const rejected = await statusOf(mine.id);
  expectTrue(
    "An administrator can reject with a reason",
    rejected.status === "REJECTED" && !!rejected.rejectionReason,
    `status ${rejected.status}, reason recorded`,
  );
  expectTrue(
    "A rejected mine is not public",
    (await getPublicMine(mine.publicId)) === null,
    "getPublicMine returned null",
  );

  await updateMineDraft(ownerA, mine.id, {
    ...DRAFT_INPUT,
    licenceReference: "DPMRE/MN/2026/0001",
  });
  expectTrue(
    "The owner can correct a rejected mine",
    (await getOwnedMine(ownerA, mine.id))?.licenceReference === "DPMRE/MN/2026/0001",
    "the correction persisted",
  );

  await submitMineForReview(ownerA, mine.id);
  const resubmitted = await statusOf(mine.id);
  expectTrue(
    "A corrected mine can be resubmitted",
    resubmitted.status === "SUBMITTED" && resubmitted.rejectionReason === null,
    "status SUBMITTED and the stale rejection reason was cleared",
  );

  // --- approval and publication -------------------------------------------
  console.log("\nApproval");
  await approveMine(admin, mine.id);
  const approved = await statusOf(mine.id);
  expectTrue(
    "An administrator can approve",
    approved.status === "APPROVED" && approved.reviewedAt !== null,
    "status APPROVED with reviewedAt recorded",
  );
  expectTrue(
    "Only now does the mine become public",
    (await getPublicMine(mine.publicId)) !== null,
    "getPublicMine returned the record",
  );

  await expectRejected("A mine cannot be approved twice", () => approveMine(admin, mine.id));
  await expectRejected("An approved mine is frozen against owner edits", () =>
    updateMineDraft(ownerA, mine.id, { ...DRAFT_INPUT, name: "Renamed after approval" }),
  );

  // --- tenant isolation on the write path ----------------------------------
  console.log("\nTenant isolation");
  expectTrue(
    "Another organization cannot read the mine",
    (await getOwnedMine(ownerB, mine.id)) === null,
    "getOwnedMine returned null for owner2",
  );
  await expectRejected("Another organization cannot attach a document to it", () =>
    addDocumentToMine(
      ownerB,
      mine.id,
      { name: "x.pdf", type: "application/pdf", bytes: Buffer.from("%PDF-1.4\n") },
      "OTHER",
    ),
  );

  // --- audit trail ---------------------------------------------------------
  const events = await prisma.moderationEvent.findMany({
    where: { mineId: mine.id },
    orderBy: { createdAt: "asc" },
    select: { action: true },
  });
  expectTrue(
    "Every decision is recorded in the audit trail",
    events.map((e) => e.action).join(" → ") === "SUBMITTED → REJECTED → SUBMITTED → APPROVED",
    events.map((e) => e.action).join(" → "),
  );

  // --- cleanup -------------------------------------------------------------
  await prisma.mine.delete({ where: { id: mine.id } });

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed.` +
      (failed.length ? ` ${failed.length} FAILED.\n` : "\n"),
  );
  if (failed.length) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("\nWorkflow verification aborted:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
