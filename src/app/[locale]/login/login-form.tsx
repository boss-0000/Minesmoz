"use client";

import { useActionState } from "react";

import { FormMessage, SubmitButton } from "@/components/form-bits";
import { signInAction } from "@/lib/actions/session";
import { idle } from "@/lib/actions/shared";

export function LoginForm({
  locale,
  labels,
}: {
  locale: string;
  labels: { email: string; password: string; submit: string };
}) {
  const [state, formAction] = useActionState(signInAction, idle);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <label className="label" htmlFor="email">
          {labels.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          {labels.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
        />
      </div>

      <FormMessage state={state} />

      <SubmitButton className="w-full">{labels.submit}</SubmitButton>
    </form>
  );
}
