import { getTranslations, setRequestLocale } from "next-intl/server";

import { VerificationBadge } from "@/components/status-badge";
import { requireOwnerPage } from "@/lib/authz";
import { getOrganizationForActor } from "@/lib/repositories/organizations";
import { PROVINCES } from "@/lib/validation";

import { OrganizationForm } from "./organization-form";

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireOwnerPage(locale, `/${locale}/dashboard/organization`);
  const organization = await getOrganizationForActor(actor);

  const [t, tc] = await Promise.all([
    getTranslations("organization"),
    getTranslations("common"),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {organization ? t("title") : t("createTitle")}
        </h1>
        {!organization && (
          <p className="mt-1 text-sm text-[var(--muted)]">{t("createSubtitle")}</p>
        )}
      </div>

      {organization && (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{t("verification")}</p>
            <p className="hint mt-0.5">{t("verificationNote")}</p>
          </div>
          <VerificationBadge
            status={organization.verificationStatus}
            label={t(`status.${organization.verificationStatus}`)}
          />
        </div>
      )}

      <div className="card">
        <OrganizationForm
          locale={locale}
          provinces={[...PROVINCES]}
          defaults={{
            name: organization?.name ?? "",
            registrationNumber: organization?.registrationNumber ?? "",
            province: organization?.province ?? "",
            contactEmail: organization?.contactEmail ?? "",
            contactPhone: organization?.contactPhone ?? "",
            description: organization?.description ?? "",
          }}
          labels={{
            name: t("name"),
            registrationNumber: t("registrationNumber"),
            province: t("province"),
            contactEmail: t("contactEmail"),
            contactPhone: t("contactPhone"),
            description: t("description"),
            save: tc("save"),
            optional: tc("optional"),
          }}
        />
      </div>
    </div>
  );
}
