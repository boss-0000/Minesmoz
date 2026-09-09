import type { MineStatus } from "@prisma/client";
import Link from "next/link";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { MineStatusBadge } from "@/components/status-badge";
import { requireAdminPage } from "@/lib/authz";
import { listReviewQueue } from "@/lib/repositories/mines";

const TABS: MineStatus[] = ["SUBMITTED", "APPROVED", "REJECTED"];

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminPage(locale, `/${locale}/admin`);

  const { status } = await searchParams;
  const active: MineStatus = TABS.includes(status as MineStatus)
    ? (status as MineStatus)
    : "SUBMITTED";

  const [t, tMine, format, mines] = await Promise.all([
    getTranslations("admin"),
    getTranslations("mine"),
    getFormatter(),
    listReviewQueue(actor, active),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("subtitle")}</p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={`/${locale}/admin?status=${tab}`}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              tab === active
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)]"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
            }`}
          >
            {t(`tabs.${tab}`)}
          </Link>
        ))}
      </nav>

      {mines.length === 0 ? (
        <div className="card text-sm text-[var(--muted)]">{t("none")}</div>
      ) : (
        <ul className="space-y-3">
          {mines.map((mine) => (
            <li key={mine.id}>
              <Link
                href={`/${locale}/admin/mines/${mine.id}`}
                className="card flex flex-wrap items-center justify-between gap-3 transition hover:border-[var(--accent)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{mine.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {mine.organization.name} · {tMine(`mineral.${mine.mineralType}`)} ·{" "}
                    {t("documentCount", { count: mine._count.documents })}
                  </p>
                  {mine.submittedAt && (
                    <p className="hint mt-0.5">
                      {t("submittedAt")}:{" "}
                      {format.dateTime(mine.submittedAt, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  )}
                </div>
                <MineStatusBadge status={mine.status} label={tMine(`status.${mine.status}`)} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
