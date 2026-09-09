import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RegisterForm } from "./register-form";

export default async function RegisterPage({
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
      <h1 className="text-2xl font-semibold tracking-tight">{t("registerTitle")}</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">{t("registerSubtitle")}</p>

      <div className="card mt-6">
        <RegisterForm
          locale={locale}
          labels={{
            name: tc("name"),
            email: tc("email"),
            password: tc("password"),
            passwordHint: t("passwordHint"),
            submit: tc("register"),
            signIn: tc("signIn"),
          }}
        />
      </div>

      <p className="mt-4 text-sm text-[var(--muted)]">
        {t("haveAccount")}{" "}
        <Link href={`/${locale}/login`} className="font-medium text-[var(--accent)]">
          {tc("signIn")}
        </Link>
      </p>
    </div>
  );
}
