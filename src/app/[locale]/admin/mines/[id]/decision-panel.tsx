"use client";

import { useActionState } from "react";

import { FieldError, FormMessage, SubmitButton } from "@/components/form-bits";
import { approveMineAction, rejectMineAction } from "@/lib/actions/moderation";
import { idle } from "@/lib/actions/shared";

export function DecisionPanel({
  mineId,
  labels,
}: {
  mineId: string;
  labels: {
    approve: string;
    reject: string;
    rejectReason: string;
    rejectReasonHint: string;
  };
}) {
  const [approveState, approve] = useActionState(approveMineAction, idle);
  const [rejectState, reject] = useActionState(rejectMineAction, idle);

  return (
    <section className="card space-y-5">
      <form action={approve} className="space-y-3">
        <input type="hidden" name="mineId" value={mineId} />
        <FormMessage state={approveState} />
        <SubmitButton>{labels.approve}</SubmitButton>
      </form>

      <form action={reject} className="space-y-3 border-t border-[var(--border)] pt-5">
        <input type="hidden" name="mineId" value={mineId} />

        <div>
          <label className="label" htmlFor="reason">
            {labels.rejectReason}
          </label>
          <textarea id="reason" name="reason" rows={3} minLength={10} className="input" />
          <p className="hint mt-1">{labels.rejectReasonHint}</p>
          <FieldError errors={rejectState.fieldErrors?.reason} />
        </div>

        <FormMessage state={rejectState} />
        <SubmitButton variant="danger">{labels.reject}</SubmitButton>
      </form>
    </section>
  );
}
