"use client";

import { useActionState } from "react";

import { FieldError, FormMessage, SubmitButton } from "@/components/form-bits";
import { uploadDocumentAction } from "@/lib/actions/mines";
import { idle } from "@/lib/actions/shared";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentPanel({
  locale,
  mineId,
  editable,
  documents,
  docTypes,
  labels,
}: {
  locale: string;
  mineId: string;
  editable: boolean;
  documents: { id: string; originalName: string; sizeBytes: number; typeLabel: string }[];
  docTypes: { value: string; label: string }[];
  labels: Record<string, string>;
}) {
  const [state, formAction] = useActionState(uploadDocumentAction, idle);

  return (
    <section className="card">
      <h2 className="text-lg font-medium">{labels.heading}</h2>
      <p className="hint mt-1">{labels.note}</p>

      {documents.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">{labels.none}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{doc.originalName}</p>
                <p className="hint">
                  {doc.typeLabel} · {formatSize(doc.sizeBytes)}
                </p>
              </div>
              {/*
                Points at an authorized route, not at the object store. The route
                checks the session and the organization before it mints a
                short-lived signed URL, so this href is useless to anyone else.
              */}
              <a
                href={`/api/documents/${doc.id}`}
                className="text-sm font-medium text-[var(--accent)] hover:underline"
              >
                {labels.download}
              </a>
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <form action={formAction} className="mt-5 space-y-3 border-t border-[var(--border)] pt-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="mineId" value={mineId} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="documentType">
                {labels.type}
              </label>
              <select id="documentType" name="documentType" className="input">
                {docTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="file">
                {labels.upload}
              </label>
              <input
                id="file"
                name="file"
                type="file"
                required
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                className="input file:mr-3 file:rounded file:border-0 file:bg-[var(--accent-soft)] file:px-2 file:py-1 file:text-xs"
              />
              <FieldError errors={state.fieldErrors?.file} />
            </div>
          </div>

          <FormMessage state={state} />

          <SubmitButton variant="secondary">{labels.upload}</SubmitButton>
        </form>
      )}
    </section>
  );
}
