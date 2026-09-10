/**
 * Runs the seed during a deployment build, but only when explicitly asked.
 *
 * Seeding is destructive — prisma/seed.ts clears the demo tables first — so it
 * must never happen on an ordinary deploy. Set RUN_SEED=1 in the environment,
 * deploy once, then remove the variable.
 *
 * This exists because the database credentials are marked Sensitive in Vercel
 * and cannot be read back out, so the seed has to run where the environment
 * already has them: inside the build.
 */

import { spawnSync } from "node:child_process";

if (process.env.RUN_SEED !== "1") {
  console.log("[seed] RUN_SEED is not set to 1 — skipping.");
  process.exit(0);
}

console.log("[seed] RUN_SEED=1 — seeding the database.");

const result = spawnSync("tsx", ["prisma/seed.ts"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

if (result.status !== 0) {
  console.error("[seed] Seeding failed. Failing the build so this is not missed.");
  process.exit(result.status ?? 1);
}

console.log("[seed] Done. Remove RUN_SEED before the next deployment.");
