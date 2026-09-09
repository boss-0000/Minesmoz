import { ZodError } from "zod";

import { ConflictError, ForbiddenError, UnauthorizedError } from "@/lib/authz";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const idle: ActionState = { ok: false };

/**
 * Maps a thrown error to something safe to render.
 *
 * Authorization failures are reported to the user in generic terms and the
 * detail is kept server-side; validation and state-machine conflicts carry a
 * useful message because they describe the user's own input.
 */
export function toActionState(error: unknown): ActionState {
  if (error instanceof ZodError) {
    return {
      ok: false,
      fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
      message: "Please correct the highlighted fields.",
    };
  }

  if (error instanceof ConflictError) {
    return { ok: false, message: error.message };
  }

  if (error instanceof UnauthorizedError) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }

  if (error instanceof ForbiddenError) {
    return { ok: false, message: "You do not have permission to do that." };
  }

  console.error("Unhandled action error:", error);
  return { ok: false, message: "Something went wrong. Please try again." };
}

/** Next's redirect() and notFound() signal by throwing; never swallow them. */
export function isFrameworkSignal(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (error as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}
