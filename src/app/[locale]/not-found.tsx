import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";

export default async function LocaleNotFound() {
  const [t, tc, locale] = await Promise.all([
    getTranslations("publicDirectory"),
    getTranslations("common"),
    getLocale(),
  ]);

  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <p className="font-mono text-sm text-[var(--muted)]">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("notFoundTitle")}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{t("notFoundBody")}</p>
      <Link href={`/${locale}`} className="btn-secondary mt-6">
        {tc("back")}
      </Link>
    </div>
  );
}
