/**
 * Canonical error message extractor.
 *
 * Handles Error instances, Supabase-style error objects ({ message, code }),
 * plain strings, and unknown values. Returns a trimmed, human-readable string.
 */
export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const msg = String((error as { message?: unknown }).message ?? "").trim();
    if (msg) return msg;
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  return fallback;
}
