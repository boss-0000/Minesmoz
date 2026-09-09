"use client";

import { useActionState } from "react";

import { FieldError, FormMessage, SubmitButton } from "@/components/form-bits";
import { saveOrganizationAction } from "@/lib/actions/organization";
import { idle } from "@/lib/actions/shared";

type Defaults = {
  name: string;
  registrationNumber: string;
  province: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
};

export function OrganizationForm({
  locale,
  provinces,
  defaults,
  labels,
}: {
  locale: string;
  provinces: string[];
  defaults: Defaults;
  labels: Record<keyof Defaults | "save" | "optional", string>;
}) {
  const [state, formAction] = useActionState(saveOrganizationAction, idle);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <label className="label" htmlFor="name">
          {labels.name}
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={defaults.name}
          className="input"
        />
        <FieldError errors={state.fieldErrors?.name} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="registrationNumber">
            {labels.registrationNumber}{" "}
            <span className="hint">({labels.optional})</span>
          </label>
          <input
            id="registrationNumber"
            name="registrationNumber"
            defaultValue={defaults.registrationNumber}
            className="input"
          />
          <FieldError errors={state.fieldErrors?.registrationNumber} />
        </div>

        <div>
          <label className="label" htmlFor="province">
            {labels.province} <span className="hint">({labels.optional})</span>
          </label>
          <select
            id="province"
            name="province"
            defaultValue={defaults.province}
            className="input"
          >
            <option value="">—</option>
            {provinces.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors?.province} />
        </div>

        <div>
          <label className="label" htmlFor="contactEmail">
            {labels.contactEmail} <span className="hint">({labels.optional})</span>
          </label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={defaults.contactEmail}
            className="input"
          />
          <FieldError errors={state.fieldErrors?.contactEmail} />
        </div>

        <div>
          <label className="label" htmlFor="contactPhone">
            {labels.contactPhone} <span className="hint">({labels.optional})</span>
          </label>
          <input
            id="contactPhone"
            name="contactPhone"
            defaultValue={defaults.contactPhone}
            className="input"
          />
          <FieldError errors={state.fieldErrors?.contactPhone} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">
          {labels.description} <span className="hint">({labels.optional})</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaults.description}
          className="input"
        />
        <FieldError errors={state.fieldErrors?.description} />
      </div>

      <FormMessage state={state} />

      <SubmitButton>{labels.save}</SubmitButton>
    </form>
  );
}
