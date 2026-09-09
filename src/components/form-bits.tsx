"use client";

import { useFormStatus } from "react-dom";

import type { ActionState } from "@/lib/actions/shared";

export function SubmitButton({
  children,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const cls =
    variant === "primary" ? "btn-primary" : variant === "danger" ? "btn-danger" : "btn-secondary";

  return (
    <button type="submit" disabled={pending} className={`${cls} ${className}`}>
      {pending ? "…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;

  return (
    <p
      role="status"
      className={`rounded-md px-3 py-2 text-sm ${
        state.ok
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {state.message}
    </p>
  );
}

export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="error">{errors[0]}</p>;
}
