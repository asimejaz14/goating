/**
 * The signed-in session token.
 *
 * The backend mints its own long-lived JWT (60 days by default) instead of
 * delegating to Supabase Auth, so there is no client library managing a
 * session — this is the whole of it: read/write one key in `localStorage`.
 * That storage (not `sessionStorage`) is deliberate — a farm partner should
 * stay signed in across browser restarts, not just the current tab.
 */

const STORAGE_KEY = "goat-farm-token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  window.localStorage.setItem(STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
