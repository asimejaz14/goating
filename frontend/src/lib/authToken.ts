/**
 * The signed-in session, cached in `localStorage`.
 *
 * The backend mints a long-lived JWT (60 days by default), so there is no
 * client library managing a session — this is the whole of it. The signed-in
 * user is cached alongside the token so a returning visit can render the app
 * immediately instead of blocking on `/me`; the request still goes out, it
 * just no longer sits in front of every other query on the page.
 *
 * `localStorage` (not `sessionStorage`) is deliberate — a farm partner should
 * stay signed in across browser restarts, not just the current tab.
 */

import type { CurrentUser } from "./types";

const TOKEN_KEY = "goat-farm-token";
const USER_KEY = "goat-farm-user";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

/** The last user `/me` returned, or null when nothing is cached yet. */
export function getStoredUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CurrentUser;
    return parsed?.id ? parsed : null;
  } catch {
    // Corrupt entry is not worth crashing the app over — revalidation will
    // replace it a moment later anyway.
    return null;
  }
}

export function setStoredUser(user: CurrentUser): void {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
