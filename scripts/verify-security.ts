/**
 * Automated check of the security claims in README section 4.
 *
 * Run against a server that is already up, with the database seeded:
 *
 *   pnpm db:seed
 *   pnpm dev                     # in one terminal
 *   pnpm verify:security         # in another
 *
 * Every assertion below corresponds to something the reviewer was invited to
 * test by hand. This does the same thing repeatably and exits non-zero if any
 * guarantee regresses.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";

const ACCOUNTS = {
  ownerA: { email: "owner@minesmoz.test", password: "Owner!Demo2026" },
  ownerB: { email: "owner2@minesmoz.test", password: "Owner2!Demo2026" },
  admin: { email: "admin@minesmoz.test", password: "Admin!Demo2026" },
};

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];

function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}\n        ${detail}`);
}

/* ------------------------------------------------------------ cookie jar */

function parseCookies(response: Response, jar: Map<string, string>) {
  for (const raw of response.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(";");
    const index = pair.indexOf("=");
    if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

/** Performs the Auth.js credentials flow and returns a populated cookie jar. */
async function login(account: { email: string; password: string }): Promise<Map<string, string>> {
  const jar = new Map<string, string>();

  const csrfResponse = await fetch(`${BASE}/api/auth/csrf`);
  parseCookies(csrfResponse, jar);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const body = new URLSearchParams({
    csrfToken,
    email: account.email,
    password: account.password,
    callbackUrl: `${BASE}/`,
  });

  const signInResponse = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(jar),
    },
    body,
    redirect: "manual",
  });

  parseCookies(signInResponse, jar);

  const hasSession = [...jar.keys()].some((name) => name.includes("session-token"));
  if (!hasSession) {
    throw new Error(`Login failed for ${account.email} (status ${signInResponse.status})`);
  }

  return jar;
}

function get(path: string, jar?: Map<string, string>) {
  return fetch(`${BASE}${path}`, {
    headers: jar ? { Cookie: cookieHeader(jar) } : {},
    redirect: "manual",
  });
}

/* ---------------------------------------------------------------- checks */

async function main() {
  const [approved, submitted, draft] = await Promise.all([
    prisma.mine.findFirst({ where: { status: "APPROVED" }, select: { publicId: true, id: true } }),
    prisma.mine.findFirst({ where: { status: "SUBMITTED" }, select: { publicId: true, id: true } }),
    prisma.mine.findFirst({
      where: { status: "DRAFT", organization: { name: { contains: "Rovuma" } } },
      select: { publicId: true, id: true },
    }),
  ]);

  const otherOrgMine = await prisma.mine.findFirst({
    where: { organization: { name: { contains: "Lichinga" } } },
    select: { id: true },
  });

  const ownerADoc = await prisma.mineDocument.findFirst({
    where: { mine: { organization: { name: { contains: "Rovuma" } } } },
    select: { id: true },
  });

  if (!approved || !submitted || !draft || !otherOrgMine || !ownerADoc) {
    throw new Error("Expected seed data is missing. Run `pnpm db:seed` first.");
  }

  console.log(`\nVerifying ${BASE}\n`);

  // 4.1 — non-approved mines are not publicly reachable
  console.log("4.1  Unapproved mines are not publicly reachable");
  check(
    "Approved mine is served by the public API",
    (await get(`/api/public/mines/${approved.publicId}`)).status === 200,
    `GET /api/public/mines/${approved.publicId} expected 200`,
  );
  for (const [label, mine] of [
    ["submitted", submitted],
    ["draft", draft],
  ] as const) {
    const status = (await get(`/api/public/mines/${mine.publicId}`)).status;
    check(
      `Public API returns 404 for a ${label} mine`,
      status === 404,
      `GET /api/public/mines/${mine.publicId} returned ${status}, expected 404`,
    );
    const pageStatus = (await get(`/pt/mines/${mine.publicId}`)).status;
    check(
      `Public page returns 404 for a ${label} mine`,
      pageStatus === 404,
      `GET /pt/mines/${mine.publicId} returned ${pageStatus}, expected 404`,
    );
  }

  // 4.2 — the list endpoint agrees with the detail endpoint
  console.log("\n4.2  The list endpoint cannot leak what the detail endpoint refuses");
  const listResponse = await get("/api/public/mines");
  const list = (await listResponse.json()) as {
    mines: { publicId: string }[];
  };
  const listedIds = new Set(list.mines.map((m) => m.publicId));
  check(
    "Public list contains only approved mines",
    listedIds.has(approved.publicId) &&
      !listedIds.has(submitted.publicId) &&
      !listedIds.has(draft.publicId),
    `list returned ${list.mines.length} mine(s); draft and submitted absent`,
  );
  check(
    "Public projection omits internal fields",
    list.mines.every(
      (m) =>
        !("id" in m) &&
        !("status" in m) &&
        !("rejectionReason" in m) &&
        !("documents" in m),
    ),
    "no id, status, rejectionReason or documents in the public payload",
  );

  // 4.4 — documents are private
  console.log("\n4.4  Documents stay private");
  const anonDoc = (await get(`/api/documents/${ownerADoc.id}`)).status;
  check(
    "Anonymous document request returns 404",
    anonDoc === 404,
    `GET /api/documents/${ownerADoc.id} returned ${anonDoc}, expected 404`,
  );

  const ownerAJar = await login(ACCOUNTS.ownerA);
  const ownerBJar = await login(ACCOUNTS.ownerB);
  const adminJar = await login(ACCOUNTS.admin);

  const ownerAccess = await get(`/api/documents/${ownerADoc.id}`, ownerAJar);
  check(
    "The owning organization can fetch its document",
    ownerAccess.status === 200 || ownerAccess.status === 302,
    `returned ${ownerAccess.status} (200 streamed, or 302 to a signed URL)`,
  );

  const crossOrgDoc = (await get(`/api/documents/${ownerADoc.id}`, ownerBJar)).status;
  check(
    "Another organization gets 404 for the same document",
    crossOrgDoc === 404,
    `owner2 requesting owner1's document returned ${crossOrgDoc}, expected 404`,
  );

  const adminDoc = await get(`/api/documents/${ownerADoc.id}`, adminJar);
  check(
    "An administrator can fetch it for review",
    adminDoc.status === 200 || adminDoc.status === 302,
    `returned ${adminDoc.status}`,
  );

  // 4.5 — role and organization separation
  console.log("\n4.5  Roles and organizations are separated");
  const crossOrgMine = (await get(`/pt/dashboard/mines/${otherOrgMine.id}`, ownerAJar)).status;
  check(
    "An owner gets 404 on another organization's mine",
    crossOrgMine === 404,
    `GET /pt/dashboard/mines/${otherOrgMine.id} as owner1 returned ${crossOrgMine}, expected 404`,
  );

  const ownerHitsAdmin = (await get("/pt/admin", ownerAJar)).status;
  check(
    "An owner is redirected away from the admin area",
    ownerHitsAdmin === 307 || ownerHitsAdmin === 302,
    `GET /pt/admin as an owner returned ${ownerHitsAdmin}, expected a redirect`,
  );

  const anonHitsAdmin = (await get("/pt/admin")).status;
  check(
    "An anonymous visitor is redirected away from the admin area",
    anonHitsAdmin === 307 || anonHitsAdmin === 302,
    `GET /pt/admin anonymously returned ${anonHitsAdmin}, expected a redirect`,
  );

  const anonDashboard = (await get("/pt/dashboard")).status;
  check(
    "An anonymous visitor is redirected away from the dashboard",
    anonDashboard === 307 || anonDashboard === 302,
    `GET /pt/dashboard anonymously returned ${anonDashboard}, expected a redirect`,
  );

  // 4.8 — response hardening
  console.log("\n4.8  Response hardening");
  const publicPage = await get(`/pt/mines/${approved.publicId}`);
  check(
    "Security headers are present",
    publicPage.headers.get("x-frame-options") === "DENY" &&
      publicPage.headers.get("x-content-type-options") === "nosniff",
    `x-frame-options=${publicPage.headers.get("x-frame-options")}, x-content-type-options=${publicPage.headers.get("x-content-type-options")}`,
  );
  check(
    "X-Powered-By is not advertised",
    publicPage.headers.get("x-powered-by") === null,
    "no x-powered-by header",
  );

  /* -------------------------------------------------------------- summary */

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed.` +
      (failed.length ? ` ${failed.length} FAILED.\n` : "\n"),
  );

  if (failed.length) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("\nVerification aborted:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
