import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";

import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "common" });

  return {
    title: `${t("appName")} — ${t("tagline")}`,
    description: t("tagline"),
    // A prototype has no business being indexed.
    robots: { index: false, follow: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <SiteHeader locale={locale} />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
            {children}
          </main>
          <footer className="border-t border-[var(--border)] px-4 py-5 text-center text-xs text-[var(--muted)]">
            MinesMoz — technical prototype. Not production data.
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
