"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { QueryParams } from "./apiClient";

export type FilterValue = string | string[] | undefined;
export type FilterDefaults = Record<string, FilterValue>;

/** Keys the filter chips and "clear all" ignore — they aren't filters. */
const CONTROL_KEYS = new Set(["page", "page_size", "sort_by", "sort_dir"]);

/**
 * Filter state lives in the URL query string.
 *
 * That makes every filtered view shareable and bookmarkable, and it survives a
 * refresh and the browser's back button for free — no client state to sync.
 */
export function useFilters(defaults: FilterDefaults = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // `defaults` is written inline by callers, so a new object arrives every
  // render; the serialised form is what actually identifies it.
  const defaultsKey = JSON.stringify(defaults);

  const get = useCallback(
    (key: string): string => {
      const fromUrl = searchParams.get(key);
      if (fromUrl !== null) return fromUrl;
      const fallback = defaults[key];
      return typeof fallback === "string" ? fallback : "";
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, defaultsKey],
  );

  const getAll = useCallback(
    (key: string): string[] => {
      const fromUrl = searchParams.getAll(key);
      if (fromUrl.length) return fromUrl;
      const fallback = defaults[key];
      return Array.isArray(fallback) ? fallback : [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, defaultsKey],
  );

  const write = useCallback(
    (patch: FilterDefaults, options: { keepPage?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(patch)) {
        next.delete(key);
        if (value === undefined || value === "") continue;
        if (Array.isArray(value)) {
          value.filter(Boolean).forEach((entry) => next.append(key, entry));
        } else {
          next.set(key, value);
        }
      }

      // Changing a filter while on page 7 would otherwise land on an empty page.
      if (!options.keepPage && !("page" in patch)) next.delete("page");

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setFilter = useCallback(
    (key: string, value: FilterValue) => write({ [key]: value }),
    [write],
  );

  const toggleInList = useCallback(
    (key: string, value: string) => {
      const current = getAll(key);
      const next = current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value];
      write({ [key]: next });
    },
    [getAll, write],
  );

  const clearAll = useCallback(() => {
    const next = new URLSearchParams();
    // Sorting is a view preference, not a filter — it survives "clear all".
    for (const key of ["sort_by", "sort_dir"]) {
      const value = searchParams.get(key);
      if (value) next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  /** Filters the user actually set — drives the chip row and the badge count. */
  const activeKeys = useMemo(() => {
    const keys = new Set<string>();
    searchParams.forEach((_value, key) => {
      if (!CONTROL_KEYS.has(key)) keys.add(key);
    });
    return [...keys];
  }, [searchParams]);

  const page = Number(searchParams.get("page") ?? 1) || 1;
  const setPage = useCallback(
    (value: number) => write({ page: value > 1 ? String(value) : undefined }, { keepPage: true }),
    [write],
  );

  return {
    get,
    getAll,
    setFilter,
    setFilters: write,
    toggleInList,
    clearAll,
    activeKeys,
    activeCount: activeKeys.length,
    page,
    setPage,
    sortBy: searchParams.get("sort_by") ?? "",
    sortDir: searchParams.get("sort_dir") ?? "",
    queryString: searchParams.toString(),
  };
}

export type Filters = ReturnType<typeof useFilters>;

/** Turn the URL's filter keys into API query params. */
export function toQueryParams(
  filters: Filters,
  spec: { scalar?: string[]; list?: string[] },
): QueryParams {
  const params: QueryParams = {};
  for (const key of spec.scalar ?? []) {
    const value = filters.get(key);
    if (value) params[key] = value;
  }
  for (const key of spec.list ?? []) {
    const value = filters.getAll(key);
    if (value.length) params[key] = value;
  }
  return params;
}

/** Debounce a fast-changing value — used so typing doesn't fire a request a key. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * A text input that owns its own keystrokes but pushes to the URL on a delay.
 *
 * Writing every keystroke straight to the query string makes the caret jump on
 * slower phones, so the field stays local until the user pauses.
 */
export function useSearchField(filters: Filters, key = "q", delay = 300) {
  const urlValue = filters.get(key);
  const [value, setValue] = useState(urlValue);
  const debounced = useDebounced(value, delay);
  const lastPushed = useRef(urlValue);

  // Back/forward navigation and "clear all" change the URL underneath us.
  useEffect(() => {
    if (urlValue !== lastPushed.current) {
      lastPushed.current = urlValue;
      setValue(urlValue);
    }
  }, [urlValue]);

  useEffect(() => {
    if (debounced === lastPushed.current) return;
    lastPushed.current = debounced;
    filters.setFilter(key, debounced || undefined);
    // `filters` is rebuilt each render; the debounced value is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, key]);

  return [value, setValue] as const;
}
