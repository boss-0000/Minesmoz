import { getTranslations } from "next-intl/server";

import { MINERAL_TYPES, PROVINCES } from "@/lib/validation";

/** Shared between the create and edit screens so labels cannot drift apart. */
export async function getMineFormProps() {
  const [t, tc] = await Promise.all([
    getTranslations("mine"),
    getTranslations("common"),
  ]);

  return {
    provinces: [...PROVINCES] as string[],
    minerals: MINERAL_TYPES.map((value) => ({
      value,
      label: t(`mineral.${value}`),
    })),
    labels: {
      name: t("name"),
      mineralType: t("mineralType"),
      province: t("province"),
      district: t("district"),
      description: t("description"),
      latitude: t("latitude"),
      longitude: t("longitude"),
      licenceReference: t("licenceReference"),
      investmentMin: t("investmentMin"),
      investmentMax: t("investmentMax"),
      save: tc("save"),
      optional: tc("optional"),
    } as Record<string, string>,
  };
}
