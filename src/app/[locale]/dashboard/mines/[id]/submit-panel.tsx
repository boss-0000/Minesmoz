"use client";

import { useActionState } from "react";

import { FormMessage, SubmitButton } from "@/components/form-bits";
import { submitMineAction } from "@/lib/actions/mines";
import { idle } from "@/lib/actions/shared";

export function SubmitPanel({
  locale,
  mineId,
  canSubmit,
  labels,
}: {
  locale: string;
  mineId: string;
  canSubmit: boolean;
  labels: { submit: string; requiresDocument: string };
}) {
  const [state, formAction] = useActionState(submitMineAction, idle);

  return (
    <section className="card">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="mineId" value={mineId} />

        <FormMessage state={state} />

        {/*
          Disabling the button is a courtesy only. The same rule is enforced in
          submitMineForReview(), so posting this form directly without a
          document still fails.
        */}
        {canSubmit ? (
          <SubmitButton>{labels.submit}</SubmitButton>
        ) : (
          <p className="text-sm text-[var(--muted)]">{labels.requiresDocument}</p>
        )}
      </form>
    </section>
  );
}
