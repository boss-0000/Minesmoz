import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { VerificationBadge } from "@/components/status-badge";
import { getPublicMine } from "@/lib/repositories/mines";

/**
 * Rendered per request, never prerendered and never cached.
 *
 * This matters as much as the query filter: an ISR copy generated while a mine
 * was approved would keep being served after it was unpublished, which is
 * exactly the leak the status filter is there to prevent.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicMinePage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale, publicId } = await params;
  setRequestLocale(locale);

  // Returns null for a draft, a submitted mine, a rejected mine, or one that
  // never existed. All four are answered identically with a 404.
  const mine = await getPublicMine(publicId);
  if (!mine) notFound();

  const [t, tMine, tOrg, format] = await Promise.all([
    getTranslations("publicDirectory"),
    getTranslations("mine"),
    getTranslations("organization"),
    getFormatter(),
  ]);

  const investment =
    mine.investmentMinUsd != null || mine.investmentMaxUsd != null
      ? `USD ${mine.investmentMinUsd?.toLocaleString() ?? "—"} – ${
          mine.investmentMaxUsd?.toLocaleString() ?? "—"
        }`
      : null;

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-medium text-[var(--accent)]">
          {tMine(`mineral.${mine.mineralType}`)}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{mine.name}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {t("location")}: {mine.province}
          {mine.district ? `, ${mine.district}` : ""}
        </p>
      </header>

      {mine.description && (
        <section className="card">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{mine.description}</p>
        </section>
      )}

      <section className="card">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {investment && (
            <div>
              <dt className="hint">{t("investmentRange")}</dt>
              <dd className="text-sm">{investment}</dd>
            </div>
          )}

          {mine.latitude != null && mine.longitude != null && (
            <div>
              <dt className="hint">{t("coordinates")}</dt>
              <dd className="font-mono text-sm">
                {mine.latitude}, {mine.longitude}
              </dd>
            </div>
          )}

          {mine.reviewedAt && (
            <div>
              <dt className="hint">{t("approvedOn")}</dt>
              <dd className="text-sm">
                {format.dateTime(mine.reviewedAt, { dateStyle: "medium" })}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="hint">{t("operator")}</p>
          <p className="font-medium">{mine.organization.name}</p>
        </div>
        <VerificationBadge
          status={mine.organization.verificationStatus}
          label={tOrg(`status.${mine.organization.verificationStatus}`)}
        />
      </section>
    </article>
  );
}
