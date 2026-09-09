import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { signOut } from "@/lib/auth";

export async function SignOutButton({ locale, email }: { locale: string; email: string }) {
  const t = await getTranslations("common");

  async function doSignOut() {
    "use server";
    await signOut({ redirect: false });
    redirect(`/${locale}`);
  }

  return (
    <form action={doSignOut} className="flex items-center gap-2">
      <span className="hidden max-w-[16ch] truncate text-xs text-[var(--muted)] sm:inline">
        {email}
      </span>
      <button type="submit" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        {t("signOut")}
      </button>
    </form>
  );
}
