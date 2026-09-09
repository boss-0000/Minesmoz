import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { listPublicMines } from "@/lib/repositories/mines";

// Always rendered per request. A cached copy could otherwise keep serving a
// mine that has since been unpublished.
export const dynamic = "force-dynamic";

export default async function PublicDirectoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, tMine, mines] = await Promise.all([
    getTranslations("publicDirectory"),
    getTranslations("mine"),
    listPublicMines(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("subtitle")}</p>
      </div>

      {mines.length === 0 ? (
        <div className="card text-sm text-[var(--muted)]">{t("none")}</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {mines.map((mine) => (
            <li key={mine.publicId}>
              <Link
                href={`/${locale}/mines/${mine.publicId}`}
                className="card block h-full transition hover:border-[var(--accent)]"
              >
                <p className="font-medium">{mine.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {tMine(`mineral.${mine.mineralType}`)} · {mine.province}
                  {mine.district ? `, ${mine.district}` : ""}
                </p>
                <p className="hint mt-2">
                  {t("operator")}: {mine.organization.name}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
