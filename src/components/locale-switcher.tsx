"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { routing } from "@/i18n/routing";

/**
 * Swaps the locale segment of the current path and keeps the user where they
 * are, rather than bouncing to the home page.
 */
export function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(next: string) {
    const segments = pathname.split("/");
    // segments[0] is the empty string before the leading slash.
    if (routing.locales.includes(segments[1] as never)) {
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }

    startTransition(() => router.replace(segments.join("/") || `/${next}`));
  }

  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">{t("language")}</span>
      <select
        value={currentLocale}
        onChange={(event) => onChange(event.target.value)}
        disabled={isPending}
        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs
                   text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
      >
        <option value="pt">{t("portuguese")}</option>
        <option value="en">{t("english")}</option>
      </select>
    </label>
  );
}
