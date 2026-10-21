/** Turn a Supabase/PostgREST error into a string the UI can show. */
export function formatDbError(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    const e = err as { message?: unknown; details?: unknown; hint?: unknown };
    const parts = [e.message, e.details, e.hint]
      .filter((part): part is string => typeof part === "string" && part.length > 0);
    if (parts.length) return parts.join(" — ");
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
