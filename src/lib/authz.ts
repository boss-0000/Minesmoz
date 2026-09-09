import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";

/**
 * The authenticated principal, resolved once per request from the session.
 *
 * Authorization in this codebase is enforced here and in the repository layer —
 * never in middleware. Middleware runs before the route and has historically
 * been bypassable (see CVE-2025-29927); more importantly it cannot see which
 * row a request is about, so it can only ever guard path prefixes. Every read
 * and write below is scoped by the actor's organization or role at the point
 * the query is built, so an unauthorized request fails even if it reaches the
 * handler directly.
 */
export type Actor = {
  id: string;
  email: string;
  role: Role;
  organizationId: string | null;
};

export class UnauthorizedError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Not permitted") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends Error {
  constructor(message = "State changed since it was read") {
    super(message);
    this.name = "ConflictError";
  }
}

export async function getActor(): Promise<Actor | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    role: session.user.role,
    organizationId: session.user.organizationId,
  };
}

/** Throws rather than redirecting. Use inside server actions and route handlers. */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new UnauthorizedError();
  return actor;
}

export async function requireAdmin(): Promise<Actor> {
  const actor = await requireActor();
  if (actor.role !== "ADMIN") throw new ForbiddenError("Administrator role required");
  return actor;
}

export async function requireMineOwner(): Promise<Actor> {
  const actor = await requireActor();
  if (actor.role !== "MINE_OWNER") throw new ForbiddenError("Mine owner role required");
  return actor;
}

/** An owner cannot touch mines until they have created their organization. */
export async function requireOrganization(): Promise<Actor & { organizationId: string }> {
  const actor = await requireMineOwner();
  if (!actor.organizationId) throw new ForbiddenError("No organization on this account");
  return actor as Actor & { organizationId: string };
}

/** Page-level guards: redirect instead of throwing, so the UX is a login bounce. */
export async function requireActorPage(locale: string, next: string): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect(`/${locale}/login?next=${encodeURIComponent(next)}`);
  return actor;
}

export async function requireAdminPage(locale: string, next: string): Promise<Actor> {
  const actor = await requireActorPage(locale, next);
  if (actor.role !== "ADMIN") redirect(`/${locale}/dashboard`);
  return actor;
}

export async function requireOwnerPage(locale: string, next: string): Promise<Actor> {
  const actor = await requireActorPage(locale, next);
  if (actor.role !== "MINE_OWNER") redirect(`/${locale}/admin`);
  return actor;
}
