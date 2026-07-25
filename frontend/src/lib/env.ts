/**
 * Public runtime configuration.
 *
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time, so each one has to
 * be written out in full — a computed lookup like `process.env[name]` returns
 * undefined in the browser bundle.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `${name} is not set. Copy frontend/.env.local.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);
export const PHOTO_BUCKET = process.env.NEXT_PUBLIC_PHOTO_BUCKET ?? "goat-photos";

export function requireSupabaseEnv(): { url: string; anonKey: string } {
  return {
    url: required(SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: required(SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}
