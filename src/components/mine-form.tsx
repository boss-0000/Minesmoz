"use client";

import { useActionState } from "react";

import { FieldError, FormMessage, SubmitButton } from "@/components/form-bits";
import { createMineAction, updateMineAction } from "@/lib/actions/mines";
import { idle } from "@/lib/actions/shared";

export type MineFormDefaults = {
  name: string;
  mineralType: string;
  province: string;
  district: string;
  description: string;
  latitude: string;
  longitude: string;
  licenceReference: string;
  investmentMinUsd: string;
  investmentMaxUsd: string;
};

export function MineForm({
  locale,
  mineId,
  provinces,
  minerals,
  defaults,
  labels,
  disabled = false,
}: {
  locale: string;
  mineId?: string;
  provinces: string[];
  minerals: { value: string; label: string }[];
  defaults: MineFormDefaults;
  labels: Record<string, string>;
  disabled?: boolean;
}) {
  const [state, formAction] = useActionState(
    mineId ? updateMineAction : createMineAction,
    idle,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {mineId && <input type="hidden" name="mineId" value={mineId} />}

      <fieldset disabled={disabled} className="space-y-4">
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
            <label className="label" htmlFor="mineralType">
              {labels.mineralType}
            </label>
            <select
              id="mineralType"
              name="mineralType"
              defaultValue={defaults.mineralType || "RUBY"}
              className="input"
            >
              {minerals.map((mineral) => (
                <option key={mineral.value} value={mineral.value}>
                  {mineral.label}
                </option>
              ))}
            </select>
            <FieldError errors={state.fieldErrors?.mineralType} />
          </div>

          <div>
            <label className="label" htmlFor="province">
              {labels.province}
            </label>
            <select
              id="province"
              name="province"
              defaultValue={defaults.province || provinces[0]}
              className="input"
            >
              {provinces.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
            <FieldError errors={state.fieldErrors?.province} />
          </div>

          <div>
            <label className="label" htmlFor="district">
              {labels.district} <span className="hint">({labels.optional})</span>
            </label>
            <input
              id="district"
              name="district"
              defaultValue={defaults.district}
              className="input"
            />
            <FieldError errors={state.fieldErrors?.district} />
          </div>

          <div>
            <label className="label" htmlFor="licenceReference">
              {labels.licenceReference} <span className="hint">({labels.optional})</span>
            </label>
            <input
              id="licenceReference"
              name="licenceReference"
              defaultValue={defaults.licenceReference}
              className="input"
            />
            <FieldError errors={state.fieldErrors?.licenceReference} />
          </div>

          <div>
            <label className="label" htmlFor="latitude">
              {labels.latitude} <span className="hint">({labels.optional})</span>
            </label>
            <input
              id="latitude"
              name="latitude"
              inputMode="decimal"
              placeholder="-13.2543"
              defaultValue={defaults.latitude}
              className="input"
            />
            <FieldError errors={state.fieldErrors?.latitude} />
          </div>

          <div>
            <label className="label" htmlFor="longitude">
              {labels.longitude} <span className="hint">({labels.optional})</span>
            </label>
            <input
              id="longitude"
              name="longitude"
              inputMode="decimal"
              placeholder="39.2894"
              defaultValue={defaults.longitude}
              className="input"
            />
            <FieldError errors={state.fieldErrors?.longitude} />
          </div>

          <div>
            <label className="label" htmlFor="investmentMinUsd">
              {labels.investmentMin} <span className="hint">({labels.optional})</span>
            </label>
            <input
              id="investmentMinUsd"
              name="investmentMinUsd"
              inputMode="numeric"
              defaultValue={defaults.investmentMinUsd}
              className="input"
            />
            <FieldError errors={state.fieldErrors?.investmentMinUsd} />
          </div>

          <div>
            <label className="label" htmlFor="investmentMaxUsd">
              {labels.investmentMax} <span className="hint">({labels.optional})</span>
            </label>
            <input
              id="investmentMaxUsd"
              name="investmentMaxUsd"
              inputMode="numeric"
              defaultValue={defaults.investmentMaxUsd}
              className="input"
            />
            <FieldError errors={state.fieldErrors?.investmentMaxUsd} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="description">
            {labels.description} <span className="hint">({labels.optional})</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            defaultValue={defaults.description}
            className="input"
          />
          <FieldError errors={state.fieldErrors?.description} />
        </div>

        <FormMessage state={state} />

        {!disabled && <SubmitButton>{labels.save}</SubmitButton>}
      </fieldset>
    </form>
  );
}
