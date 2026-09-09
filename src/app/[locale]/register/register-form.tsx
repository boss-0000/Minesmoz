"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FieldError, FormMessage, SubmitButton } from "@/components/form-bits";
import { registerAction } from "@/lib/actions/account";
import { idle } from "@/lib/actions/shared";

export function RegisterForm({
  locale,
  labels,
}: {
  locale: string;
  labels: {
    name: string;
    email: string;
    password: string;
    passwordHint: string;
    submit: string;
    signIn: string;
  };
}) {
  const [state, formAction] = useActionState(registerAction, idle);

  if (state.ok) {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <Link href={`/${locale}/login`} className="btn-primary w-full">
          {labels.signIn}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <label className="label" htmlFor="name">
          {labels.name}
        </label>
        <input id="name" name="name" required autoComplete="name" className="input" />
        <FieldError errors={state.fieldErrors?.name} />
      </div>

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
        <FieldError errors={state.fieldErrors?.email} />
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
          minLength={10}
          autoComplete="new-password"
          className="input"
        />
        <p className="hint mt-1">{labels.passwordHint}</p>
        <FieldError errors={state.fieldErrors?.password} />
      </div>

      <FormMessage state={state} />

      <SubmitButton className="w-full">{labels.submit}</SubmitButton>
    </form>
  );
}
