import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { MineStatusBadge } from "@/components/status-badge";
import { requireOwnerPage } from "@/lib/authz";
import { listOwnedMines } from "@/lib/repositories/mines";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireOwnerPage(locale, `/${locale}/dashboard`);
  const t = await getTranslations("mine");
  const tOrg = await getTranslations("organization");

  if (!actor.organizationId) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">{tOrg("createTitle")}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{tOrg("mustCreateFirst")}</p>
        <Link href={`/${locale}/dashboard/organization`} className="btn-primary mt-4">
          {tOrg("title")}
        </Link>
      </div>
    );
  }

  const mines = await listOwnedMines(actor);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("listTitle")}</h1>
        <Link href={`/${locale}/dashboard/mines/new`} className="btn-primary">
          {t("create")}
        </Link>
      </div>

      {mines.length === 0 ? (
        <div className="card text-sm text-[var(--muted)]">{t("none")}</div>
      ) : (
        <ul className="space-y-3">
          {mines.map((mine) => (
            <li key={mine.id}>
              <Link
                href={`/${locale}/dashboard/mines/${mine.id}`}
                className="card flex flex-wrap items-center justify-between gap-3 transition hover:border-[var(--accent)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{mine.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {t(`mineral.${mine.mineralType}`)} · {mine.province} ·{" "}
                    {mine._count.documents} doc
                    {mine._count.documents === 1 ? "" : "s"}
                  </p>
                </div>
                <MineStatusBadge status={mine.status} label={t(`status.${mine.status}`)} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
