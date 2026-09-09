import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { MineForm } from "@/components/mine-form";
import { requireOwnerPage } from "@/lib/authz";
import { getMineFormProps } from "@/lib/ui/mine-form-props";

const EMPTY = {
  name: "",
  mineralType: "",
  province: "",
  district: "",
  description: "",
  latitude: "",
  longitude: "",
  licenceReference: "",
  investmentMinUsd: "",
  investmentMaxUsd: "",
};

export default async function NewMinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireOwnerPage(locale, `/${locale}/dashboard/mines/new`);

  // A mine cannot exist without an organization to own it.
  if (!actor.organizationId) redirect(`/${locale}/dashboard/organization`);

  const t = await getTranslations("mine");
  const formProps = await getMineFormProps();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("newTitle")}</h1>

      <div className="card">
        <MineForm locale={locale} defaults={EMPTY} {...formProps} />
      </div>
    </div>
  );
}
