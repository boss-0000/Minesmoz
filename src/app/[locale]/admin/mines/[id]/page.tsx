import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { MineStatusBadge, VerificationBadge } from "@/components/status-badge";
import { requireAdminPage } from "@/lib/authz";
import { getMineForReview } from "@/lib/repositories/mines";

import { DecisionPanel } from "./decision-panel";

export default async function AdminMineReviewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminPage(locale, `/${locale}/admin/mines/${id}`);

  const mine = await getMineForReview(actor, id);
  if (!mine) notFound();

  const [t, tMine, tOrg, tc, format] = await Promise.all([
    getTranslations("admin"),
    getTranslations("mine"),
    getTranslations("organization"),
    getTranslations("common"),
    getFormatter(),
  ]);

  const facts: [string, string][] = [
    [tMine("mineralType"), tMine(`mineral.${mine.mineralType}`)],
    [tMine("province"), mine.province],
    [tMine("district"), mine.district ?? "—"],
    [tMine("licenceReference"), mine.licenceReference ?? "—"],
    [
      tMine("latitude") + " / " + tMine("longitude"),
      mine.latitude != null && mine.longitude != null
        ? `${mine.latitude}, ${mine.longitude}`
        : "—",
    ],
    [
      tMine("investmentMin") + " – " + tMine("investmentMax"),
      mine.investmentMinUsd != null || mine.investmentMaxUsd != null
        ? `${mine.investmentMinUsd ?? "—"} – ${mine.investmentMaxUsd ?? "—"}`
        : "—",
    ],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/${locale}/admin`} className="hint hover:underline">
            &larr; {tc("back")}
          </Link>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{mine.name}</h1>
        </div>
        <MineStatusBadge status={mine.status} label={tMine(`status.${mine.status}`)} />
      </div>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="hint">{t("organization")}</p>
            <p className="font-medium">{mine.organization.name}</p>
          </div>
          <VerificationBadge
            status={mine.organization.verificationStatus}
            label={tOrg(`status.${mine.organization.verificationStatus}`)}
          />
        </div>
      </section>

      <section className="card">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="hint">{label}</dt>
              <dd className="text-sm">{value}</dd>
            </div>
          ))}
        </dl>

        {mine.description && (
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <p className="hint">{tMine("description")}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{mine.description}</p>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="text-lg font-medium">{tMine("documents")}</h2>
        {mine.documents.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">{tMine("noDocuments")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {mine.documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{doc.originalName}</p>
                  <p className="hint">{tMine(`docType.${doc.documentType}`)}</p>
                </div>
                <a
                  href={`/api/documents/${doc.id}`}
                  className="text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  {tMine("download")}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {mine.status === "SUBMITTED" && (
        <DecisionPanel
          mineId={mine.id}
          labels={{
            approve: t("approve"),
            reject: t("reject"),
            rejectReason: t("rejectReason"),
            rejectReasonHint: t("rejectReasonHint"),
          }}
        />
      )}

      {mine.moderationEvents.length > 0 && (
        <section className="card">
          <h2 className="mb-3 text-lg font-medium">{tMine("history")}</h2>
          <ul className="space-y-2 text-sm">
            {mine.moderationEvents.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap justify-between gap-2 border-b border-[var(--border)] pb-2 last:border-0"
              >
                <span>
                  <span className="font-medium">{event.action}</span>
                  <span className="text-[var(--muted)]"> · {event.actor.name}</span>
                  {event.reason && (
                    <span className="text-[var(--muted)]"> — {event.reason}</span>
                  )}
                </span>
                <span className="hint">
                  {format.dateTime(event.createdAt, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
