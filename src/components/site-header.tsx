import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getActor } from "@/lib/authz";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out-button";

export async function SiteHeader({ locale }: { locale: string }) {
  const [t, tc, actor] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    getActor(),
  ]);

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
        <Link href={`/${locale}`} className="text-base font-semibold tracking-tight">
          Mines<span className="text-[var(--accent)]">Moz</span>
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link href={`/${locale}/mines`} className="text-[var(--muted)] hover:text-[var(--foreground)]">
            {t("directory")}
          </Link>

          {actor?.role === "MINE_OWNER" && (
            <>
              <Link
                href={`/${locale}/dashboard`}
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                {t("dashboard")}
              </Link>
              <Link
                href={`/${locale}/dashboard/organization`}
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                {t("organization")}
              </Link>
            </>
          )}

          {actor?.role === "ADMIN" && (
            <Link
              href={`/${locale}/admin`}
              className="font-medium text-[var(--accent)] hover:opacity-80"
            >
              {t("admin")}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher currentLocale={locale} />
          {actor ? (
            <SignOutButton locale={locale} email={actor.email} />
          ) : (
            <Link href={`/${locale}/login`} className="text-sm font-medium text-[var(--accent)]">
              {tc("signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
