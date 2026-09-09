import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { MineForm } from "@/components/mine-form";
import { MineStatusBadge } from "@/components/status-badge";
import { requireOwnerPage } from "@/lib/authz";
import { getOwnedMine } from "@/lib/repositories/mines";
import { getMineFormProps } from "@/lib/ui/mine-form-props";

import { DocumentPanel } from "./document-panel";
import { SubmitPanel } from "./submit-panel";

export default async function MineDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const actor = await requireOwnerPage(locale, `/${locale}/dashboard/mines/${id}`);

  // Scoped to the actor's organization. A mine belonging to someone else
  // resolves to null and is reported as 404, not 403.
  const mine = await getOwnedMine(actor, id);
  if (!mine) notFound();

  const [t, tc, format, formProps] = await Promise.all([
    getTranslations("mine"),
    getTranslations("common"),
    getFormatter(),
    getMineFormProps(),
  ]);

  const editable = mine.status === "DRAFT" || mine.status === "REJECTED";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/${locale}/dashboard`} className="hint hover:underline">
            &larr; {tc("back")}
          </Link>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{mine.name}</h1>
        </div>
        <MineStatusBadge status={mine.status} label={t(`status.${mine.status}`)} />
      </div>

      {mine.status === "REJECTED" && mine.rejectionReason && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/40">
          <p className="font-medium text-red-800 dark:text-red-300">{t("rejectionReason")}</p>
          <p className="mt-1 text-red-700 dark:text-red-300">{mine.rejectionReason}</p>
          <p className="mt-2 text-xs text-red-700/80 dark:text-red-400/80">{t("resubmitNote")}</p>
        </div>
      )}

      {mine.status === "APPROVED" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="font-medium text-emerald-800 dark:text-emerald-300">{t("publicPage")}</p>
          <Link
            href={`/${locale}/mines/${mine.publicId}`}
            className="mt-1 inline-block break-all font-mono text-xs text-emerald-700 underline dark:text-emerald-300"
          >
            /{locale}/mines/{mine.publicId}
          </Link>
          <p className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-400/80">
            {t("lockedNote")}
          </p>
        </div>
      )}

      <section className="card">
        <h2 className="mb-4 text-lg font-medium">{t("editTitle")}</h2>
        <MineForm
          locale={locale}
          mineId={mine.id}
          disabled={!editable}
          defaults={{
            name: mine.name,
            mineralType: mine.mineralType,
            province: mine.province,
            district: mine.district ?? "",
            description: mine.description ?? "",
            latitude: mine.latitude?.toString() ?? "",
            longitude: mine.longitude?.toString() ?? "",
            licenceReference: mine.licenceReference ?? "",
            investmentMinUsd: mine.investmentMinUsd?.toString() ?? "",
            investmentMaxUsd: mine.investmentMaxUsd?.toString() ?? "",
          }}
          {...formProps}
        />
      </section>

      <DocumentPanel
        locale={locale}
        mineId={mine.id}
        editable={editable}
        documents={mine.documents.map((doc) => ({
          id: doc.id,
          originalName: doc.originalName,
          sizeBytes: doc.sizeBytes,
          typeLabel: t(`docType.${doc.documentType}`),
        }))}
        docTypes={(
          [
            "MINING_LICENSE",
            "GEOLOGICAL_SURVEY",
            "OWNERSHIP_PROOF",
            "ENVIRONMENTAL_PERMIT",
            "OTHER",
          ] as const
        ).map((value) => ({ value, label: t(`docType.${value}`) }))}
        labels={{
          heading: t("documents"),
          note: t("documentsNote"),
          none: t("noDocuments"),
          type: t("documentType"),
          upload: t("uploadDocument"),
          download: t("download"),
        }}
      />

      {editable && (
        <SubmitPanel
          locale={locale}
          mineId={mine.id}
          canSubmit={mine.documents.length > 0}
          labels={{
            submit: t("submitForReview"),
            requiresDocument: t("noDocuments"),
          }}
        />
      )}

      {mine.moderationEvents.length > 0 && (
        <section className="card">
          <h2 className="mb-3 text-lg font-medium">{t("history")}</h2>
          <ul className="space-y-2 text-sm">
            {mine.moderationEvents.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap justify-between gap-2 border-b border-[var(--border)] pb-2 last:border-0"
              >
                <span>
                  <span className="font-medium">{event.action}</span>
                  {event.reason && (
                    <span className="text-[var(--muted)]"> — {event.reason}</span>
                  )}
                </span>
                <span className="hint">
                  {format.dateTime(event.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
