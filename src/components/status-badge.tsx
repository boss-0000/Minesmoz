import type { MineStatus, VerificationStatus } from "@prisma/client";

const MINE_TONE: Record<MineStatus, string> = {
  DRAFT: "bg-[var(--accent-soft)] text-[var(--muted)] border-[var(--border)]",
  SUBMITTED: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  REJECTED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
};

const VERIFY_TONE: Record<VerificationStatus, string> = {
  UNVERIFIED: "bg-[var(--accent-soft)] text-[var(--muted)] border-[var(--border)]",
  PENDING: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  VERIFIED: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  REJECTED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
};

const base =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

export function MineStatusBadge({ status, label }: { status: MineStatus; label: string }) {
  return <span className={`${base} ${MINE_TONE[status]}`}>{label}</span>;
}

export function VerificationBadge({
  status,
  label,
}: {
  status: VerificationStatus;
  label: string;
}) {
  return <span className={`${base} ${VERIFY_TONE[status]}`}>{label}</span>;
}
