"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import type { Filters } from "@/lib/useFilters";
import { useSearchField } from "@/lib/useFilters";

import { Button } from "./Button";
import { SearchInput } from "./SearchInput";

export interface ActiveChip {
  key: string;
  /** Present for multi-value filters — removing one leaves the rest alone. */
  value?: string;
  label: string;
}

interface FilterBarProps {
  filters: Filters;
  searchPlaceholder?: string;
  /** Human-readable summary of what is currently filtered. */
  chips: ActiveChip[];
  /** The filter controls themselves. */
  children: React.ReactNode;
  sort?: React.ReactNode;
  className?: string;
}

/**
 * Search, one Filters button, and chips for whatever is on.
 *
 * The controls used to sit in an always-visible row of seven dropdowns, which
 * meant every list opened looking like a tax form. They now live behind a
 * single button — a popover on desktop, a sheet on mobile — so the default
 * view is just a search box and the results.
 */
export function FilterBar({
  filters,
  searchPlaceholder,
  chips,
  children,
  sort,
  className,
}: FilterBarProps) {
  const [query, setQuery] = useSearchField(filters);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Click-away and Escape both close the desktop popover.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const removeChip = (chip: ActiveChip) => {
    if (chip.value === undefined) {
      filters.setFilter(chip.key, undefined);
      return;
    }
    const remaining = filters.getAll(chip.key).filter((entry) => entry !== chip.value);
    filters.setFilter(chip.key, remaining.length ? remaining : undefined);
  };

  const panel = (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      {sort && <div className="border-t border-border pt-4 sm:hidden">{sort}</div>}
    </div>
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} />

        <div className="relative shrink-0" ref={popoverRef}>
          <Button
            variant="secondary"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-haspopup="dialog"
            className={cn(open && "border-border-strong bg-muted")}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {filters.activeCount > 0 && (
              <span className="tnum ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                {filters.activeCount}
              </span>
            )}
          </Button>

          <AnimatePresence>
            {open && (
              <>
                {/* Mobile: a sheet. Desktop: an anchored popover. */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setOpen(false)}
                  className="fixed inset-0 z-40 bg-black/40 sm:hidden"
                />
                <motion.div
                  role="dialog"
                  aria-label="Filters"
                  initial={{ opacity: 0, y: 8, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.99 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "z-50 border border-border bg-surface p-4 shadow-lg",
                    "fixed inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl pb-[calc(1rem+env(safe-area-inset-bottom))]",
                    "sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-[min(30rem,calc(100vw-2rem))] sm:rounded-lg sm:pb-4",
                  )}
                >
                  <div className="mb-3 flex items-center justify-between sm:hidden">
                    <h2 className="text-sm font-semibold text-foreground">Filters</h2>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Close filters"
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {panel}

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={filters.clearAll}
                      disabled={filters.activeCount === 0}
                    >
                      Clear all
                    </Button>
                    <Button size="sm" onClick={() => setOpen(false)}>
                      Show results
                    </Button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {sort && <div className="hidden shrink-0 sm:block">{sort}</div>}
      </div>

      <AnimatePresence initial={false}>
        {chips.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center gap-1.5 overflow-hidden"
          >
            {chips.map((chip) => (
              <li key={`${chip.key}:${chip.value ?? ""}`}>
                <button
                  type="button"
                  onClick={() => removeChip(chip)}
                  className="group inline-flex items-center gap-1 rounded-full border border-border bg-surface py-1 pl-2.5 pr-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  {chip.label}
                  <X
                    className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100"
                    aria-label={`Remove ${chip.label}`}
                  />
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={filters.clearAll}
                className="rounded-full px-2 py-1 text-xs font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
              >
                Clear all
              </button>
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
