"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";
import { rangeLabel } from "@/lib/format";

import { Button } from "./Button";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (page: number) => void;
  /** Shown while the next page is in flight, so the pager cannot double-fire. */
  loading?: boolean;
}

/**
 * Numbered pager with a windowed page list.
 *
 * Desktop gets real page numbers; phones get the prev/next pair plus the
 * "Showing 1–20 of 137" counter, which is all that fits at 375px.
 */
export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  hasNext,
  hasPrev,
  onPageChange,
  loading,
}: PaginationProps) {
  if (total === 0) return null;

  const pages = windowed(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
    >
      <p className="tnum text-sm text-ink-muted">{rangeLabel(page, pageSize, total)}</p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            disabled={!hasPrev || loading}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Prev</span>
          </Button>

          <ul className="hidden items-center gap-1 sm:flex">
            {pages.map((entry, index) =>
              entry === "gap" ? (
                <li key={`gap-${index}`} className="px-1.5 text-ink-faint">
                  …
                </li>
              ) : (
                <li key={entry}>
                  <button
                    type="button"
                    onClick={() => onPageChange(entry)}
                    aria-current={entry === page ? "page" : undefined}
                    className={cn(
                      "tnum h-9 min-w-9 rounded-xl px-2.5 text-sm font-semibold transition-colors",
                      entry === page
                        ? "bg-pasture-600 text-cream-50 shadow-soft"
                        : "text-ink-muted hover:bg-cream-200 hover:text-ink",
                    )}
                  >
                    {entry}
                  </button>
                </li>
              ),
            )}
          </ul>

          <span className="tnum text-sm font-medium text-ink-muted sm:hidden">
            {page} / {totalPages}
          </span>

          <Button
            variant="secondary"
            size="sm"
            disabled={!hasNext || loading}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <span className="sr-only sm:not-sr-only">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </nav>
  );
}

/** First, last, and a window around the current page — the rest collapse to "…". */
function windowed(page: number, totalPages: number): Array<number | "gap"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = new Set<number>([1, totalPages, page]);
  for (const offset of [-1, 1]) {
    const candidate = page + offset;
    if (candidate > 1 && candidate < totalPages) pages.add(candidate);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];
  let previous = 0;
  for (const entry of sorted) {
    if (previous && entry - previous > 1) result.push("gap");
    result.push(entry);
    previous = entry;
  }
  return result;
}
