import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { buildStorageKey, putObject } from "../src/lib/storage";

const prisma = new PrismaClient();

/**
 * Test accounts.
 *
 * Two separate mine-owner organizations exist on purpose: the second one is
 * there so cross-tenant isolation can actually be tested. Sign in as the Niassa
 * owner and try to open a Cabo Delgado mine by id — it must 404.
 */
const ACCOUNTS = {
  admin: { email: "admin@minesmoz.test", password: "Admin!Demo2026", name: "Administrador MinesMoz" },
  ownerA: { email: "owner@minesmoz.test", password: "Owner!Demo2026", name: "Amina Sitoe" },
  ownerB: { email: "owner2@minesmoz.test", password: "Owner2!Demo2026", name: "Jorge Macuácua" },
};

function fakePdf(title: string): Buffer {
  // A syntactically minimal PDF, enough for a browser to accept the download.
  return Buffer.from(
    `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n` +
      `2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n` +
      `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]>>endobj\n` +
      `% ${title} — MinesMoz prototype sample document\n` +
      `trailer<</Root 1 0 R>>\n%%EOF\n`,
    "utf8",
  );
}

async function upsertUser(
  account: { email: string; password: string; name: string },
  role: "ADMIN" | "MINE_OWNER",
  organizationId?: string,
) {
  const passwordHash = await bcrypt.hash(account.password, 12);

  return prisma.user.upsert({
    where: { email: account.email },
    update: { passwordHash, name: account.name, role, organizationId: organizationId ?? null },
    create: {
      email: account.email,
      passwordHash,
      name: account.name,
      role,
      organizationId: organizationId ?? null,
      locale: "pt",
    },
  });
}

async function attachDocument(mineId: string, uploadedById: string, title: string) {
  const existing = await prisma.mineDocument.findFirst({ where: { mineId } });
  if (existing) return existing;

  const bytes = fakePdf(title);
  const storageKey = buildStorageKey(mineId, `${title}.pdf`);
  await putObject(storageKey, bytes, "application/pdf");

  return prisma.mineDocument.create({
    data: {
      mineId,
      storageKey,
      originalName: `${title}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: bytes.byteLength,
      documentType: "MINING_LICENSE",
      uploadedById,
    },
  });
}

async function main() {
  // Clean slate for the demo data, leaving the schema intact.
  await prisma.moderationEvent.deleteMany();
  await prisma.mineDocument.deleteMany();
  await prisma.mine.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const admin = await upsertUser(ACCOUNTS.admin, "ADMIN");

  const orgA = await prisma.organization.create({
    data: {
      name: "Rovuma Gems, Lda.",
      registrationNumber: "MZ-100442891",
      province: "Cabo Delgado",
      contactEmail: "geral@rovumagems.test",
      contactPhone: "+258 84 000 0001",
      description:
        "Operadora de rubis e turmalinas na região de Montepuez, activa desde 2016.",
      verificationStatus: "VERIFIED",
    },
  });

  const orgB = await prisma.organization.create({
    data: {
      name: "Lichinga Minerais, Lda.",
      registrationNumber: "MZ-100773115",
      province: "Niassa",
      contactEmail: "geral@lichingaminerais.test",
      contactPhone: "+258 84 000 0002",
      description: "Pequena operadora de granadas e água-marinha no Niassa.",
      verificationStatus: "UNVERIFIED",
    },
  });

  const ownerA = await upsertUser(ACCOUNTS.ownerA, "MINE_OWNER", orgA.id);
  const ownerB = await upsertUser(ACCOUNTS.ownerB, "MINE_OWNER", orgB.id);

  // Approved — visible publicly, so the directory is not empty on first look.
  const approved = await prisma.mine.create({
    data: {
      organizationId: orgA.id,
      name: "Montepuez Ruby Block 4",
      mineralType: "RUBY",
      province: "Cabo Delgado",
      district: "Montepuez",
      latitude: -13.1256,
      longitude: 39.0042,
      description:
        "Concessão aluvionar de rubi com 42 km². Amostragem confirmou teores comerciais em três frentes.",
      licenceReference: "DPMRE/CD/2019/4412",
      investmentMinUsd: 250000,
      investmentMaxUsd: 1200000,
      status: "APPROVED",
      submittedAt: new Date("2026-08-02T09:00:00Z"),
      reviewedAt: new Date("2026-08-05T14:30:00Z"),
      reviewedById: admin.id,
    },
  });
  await attachDocument(approved.id, ownerA.id, "Licenca-Mineira-4412");
  await prisma.moderationEvent.createMany({
    data: [
      { mineId: approved.id, action: "SUBMITTED", actorId: ownerA.id },
      { mineId: approved.id, action: "APPROVED", actorId: admin.id },
    ],
  });

  // Awaiting review — gives the administrator something in the queue.
  const submitted = await prisma.mine.create({
    data: {
      organizationId: orgA.id,
      name: "Namanhumbir Tourmaline Pit",
      mineralType: "TOURMALINE",
      province: "Cabo Delgado",
      district: "Namanhumbir",
      latitude: -13.2543,
      longitude: 39.2894,
      description: "Frente de turmalina com acesso rodoviário existente.",
      licenceReference: "DPMRE/CD/2021/5518",
      investmentMinUsd: 80000,
      investmentMaxUsd: 300000,
      status: "SUBMITTED",
      submittedAt: new Date("2026-09-01T08:15:00Z"),
    },
  });
  await attachDocument(submitted.id, ownerA.id, "Estudo-Geologico-Namanhumbir");
  await prisma.moderationEvent.create({
    data: { mineId: submitted.id, action: "SUBMITTED", actorId: ownerA.id },
  });

  // Draft — not public, not in the queue. This is the record to probe.
  const draft = await prisma.mine.create({
    data: {
      organizationId: orgA.id,
      name: "Ancuabe Graphite Extension",
      mineralType: "GRAPHITE",
      province: "Cabo Delgado",
      district: "Ancuabe",
      description: "Rascunho interno — ainda não submetido.",
      status: "DRAFT",
    },
  });
  await attachDocument(draft.id, ownerA.id, "Rascunho-Ancuabe");

  // Belongs to the other organization: used to test cross-tenant access.
  const otherOrgMine = await prisma.mine.create({
    data: {
      organizationId: orgB.id,
      name: "Lichinga Garnet Claim",
      mineralType: "GARNET",
      province: "Niassa",
      district: "Lichinga",
      description: "Rascunho da segunda organização.",
      status: "DRAFT",
    },
  });

  console.log("\nSeed complete.\n");
  console.table([
    { role: "ADMIN", email: ACCOUNTS.admin.email, password: ACCOUNTS.admin.password },
    { role: "MINE_OWNER (Rovuma Gems)", email: ACCOUNTS.ownerA.email, password: ACCOUNTS.ownerA.password },
    { role: "MINE_OWNER (Lichinga)", email: ACCOUNTS.ownerB.email, password: ACCOUNTS.ownerB.password },
  ]);
  console.log("\nIds worth probing while signed out or as the wrong owner:");
  console.log(`  APPROVED  publicId : ${approved.publicId}   -> 200`);
  console.log(`  SUBMITTED publicId : ${submitted.publicId}   -> 404`);
  console.log(`  DRAFT     publicId : ${draft.publicId}   -> 404`);
  console.log(`  Other org mine id  : ${otherOrgMine.id}   -> 404 for owner@minesmoz.test\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
