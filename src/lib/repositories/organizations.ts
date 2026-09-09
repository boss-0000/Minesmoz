import { prisma } from "@/lib/db";
import { ConflictError, type Actor } from "@/lib/authz";

export type OrganizationInput = {
  name: string;
  registrationNumber?: string | null;
  province?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  description?: string | null;
};

export async function getOrganizationForActor(actor: Actor) {
  if (!actor.organizationId) return null;
  return prisma.organization.findUnique({
    where: { id: actor.organizationId },
    include: { _count: { select: { mines: true, members: true } } },
  });
}

/**
 * Creates the owner's organization and links the account to it in one
 * transaction, so an account can never end up pointing at an organization that
 * failed to persist. Verification starts at UNVERIFIED: an organization becomes
 * VERIFIED only through administrator action, never by self-declaration.
 */
export async function createOrganizationForOwner(actor: Actor, data: OrganizationInput) {
  if (actor.organizationId) {
    throw new ConflictError("This account already belongs to an organization");
  }

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: data.name.trim(),
        registrationNumber: data.registrationNumber?.trim() || null,
        province: data.province?.trim() || null,
        contactEmail: data.contactEmail?.trim().toLowerCase() || null,
        contactPhone: data.contactPhone?.trim() || null,
        description: data.description?.trim() || null,
        verificationStatus: "UNVERIFIED",
      },
    });

    // Guarded on organizationId still being null, so two concurrent submissions
    // cannot both attach an organization to the same account.
    const linked = await tx.user.updateMany({
      where: { id: actor.id, organizationId: null },
      data: { organizationId: organization.id },
    });

    if (linked.count === 0) {
      throw new ConflictError("This account already belongs to an organization");
    }

    return organization;
  });
}

export async function updateOrganization(actor: Actor, data: OrganizationInput) {
  if (!actor.organizationId) throw new ConflictError("No organization on this account");

  const result = await prisma.organization.updateMany({
    where: { id: actor.organizationId },
    data: {
      name: data.name.trim(),
      registrationNumber: data.registrationNumber?.trim() || null,
      province: data.province?.trim() || null,
      contactEmail: data.contactEmail?.trim().toLowerCase() || null,
      contactPhone: data.contactPhone?.trim() || null,
      description: data.description?.trim() || null,
      // verificationStatus is deliberately absent: an owner cannot verify itself.
    },
  });

  if (result.count === 0) throw new ConflictError("Organization not found");
}
