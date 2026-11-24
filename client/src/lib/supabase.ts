import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isConfigured = Boolean(url && key);

// A placeholder keeps the app from crashing when the env vars are missing;
// App.tsx shows a setup message instead of the site in that case.
export const supabase = createClient(url ?? "https://placeholder.supabase.co", key ?? "placeholder-key");

/** Pull a readable message out of a failed Edge Function call. */
export async function functionError(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
    } catch {
      /* fall through */
    }
  }
  return (error as Error | null)?.message ?? "Something went wrong. Try again.";
}
