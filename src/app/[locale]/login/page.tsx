import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LoginForm } from "./login-form";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, tc] = await Promise.all([
    getTranslations("auth"),
    getTranslations("common"),
  ]);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">{t("loginTitle")}</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">{t("loginSubtitle")}</p>

      <div className="card mt-6">
        <LoginForm
          locale={locale}
          labels={{
            email: tc("email"),
            password: tc("password"),
            submit: tc("signIn"),
          }}
        />
      </div>

      <p className="mt-4 text-sm text-[var(--muted)]">
        {t("noAccount")}{" "}
        <Link href={`/${locale}/register`} className="font-medium text-[var(--accent)]">
          {tc("register")}
        </Link>
      </p>
    </div>
  );
}
