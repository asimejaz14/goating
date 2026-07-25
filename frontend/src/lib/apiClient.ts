"use client";

import { getStoredToken } from "./authToken";
import { API_URL } from "./env";

/** An error carrying the backend's human-readable `detail` message. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }

  /** True when the session expired or was never established. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number>;

export type QueryParams = Record<string, QueryValue>;

/**
 * Build a query string, dropping empties.
 *
 * Array values repeat the key (`status=active&status=sold`) to match the
 * repeatable `Query(...)` parameters FastAPI declares.
 */
export function buildQuery(params: QueryParams = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry !== null && entry !== undefined && entry !== "") {
          search.append(key, String(entry));
        }
      }
    } else {
      search.append(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  params?: QueryParams;
  signal?: AbortSignal;
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    const detail = payload?.detail;
    if (typeof detail === "string") return detail;
    // FastAPI validation errors arrive as a list of {loc, msg, type}.
    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((item: { loc?: unknown[]; msg?: string }) => {
          const field = Array.isArray(item.loc) ? item.loc.at(-1) : null;
          return field ? `${String(field)}: ${item.msg}` : item.msg;
        })
        .filter(Boolean)
        .join("; ");
    }
  } catch {
    /* Not JSON — fall through to the status-based message. */
  }
  if (response.status === 401) return "Your session has expired. Please sign in again.";
  if (response.status >= 500) return "The server had a problem. Please try again.";
  return `Request failed (${response.status}).`;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params, signal } = options;
  const token = getStoredToken();

  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}${buildQuery(params)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "Cannot reach the server. Check your connection.");
  }

  if (!response.ok) throw new ApiError(response.status, await readError(response));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, params?: QueryParams, signal?: AbortSignal) =>
    request<T>(path, { params, signal }),
  post: <T>(path: string, body?: unknown, params?: QueryParams) =>
    request<T>(path, { method: "POST", body: body ?? {}, params }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
};
