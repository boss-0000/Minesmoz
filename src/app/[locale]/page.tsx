import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");

  const steps = [
    "1. Register",
    "2. Organization",
    "3. Mine draft",
    "4. Private document",
    "5. Submit",
    "6. Admin decision",
    "7. Public page",
  ];

  return (
    <div className="space-y-8">
      <section className="card">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">{t("subtitle")}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/${locale}/mines`} className="btn-primary">
            {t("browse")}
          </Link>
          <Link href={`/${locale}/login`} className="btn-secondary">
            {t("ownerCta")}
          </Link>
        </div>

        <p className="hint mt-5">{t("scopeNote")}</p>
      </section>

      <section aria-label="Workflow" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div
            key={step}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)]"
          >
            {step}
          </div>
        ))}
      </section>
    </div>
  );
}
