"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/cn";
import type { Filters } from "@/lib/useFilters";
import { useSearchField } from "@/lib/useFilters";

import { Button } from "./Button";
import { Modal } from "./Modal";
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
  /** The filter controls themselves — inline on desktop, in a sheet on mobile. */
  children: React.ReactNode;
  sort?: React.ReactNode;
  className?: string;
}

/**
 * One filter surface reused by every list in the portal.
 *
 * Desktop shows the controls inline under the search box; phones get a
 * bottom-sheet with an Apply button and a badge counting active filters, so the
 * list itself keeps the full screen.
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
  const [sheetOpen, setSheetOpen] = useState(false);

  const removeChip = (chip: ActiveChip) => {
    if (chip.value === undefined) {
      filters.setFilter(chip.key, undefined);
      return;
    }
    const remaining = filters.getAll(chip.key).filter((entry) => entry !== chip.value);
    filters.setFilter(chip.key, remaining.length ? remaining : undefined);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} />

        <Button
          variant="secondary"
          onClick={() => setSheetOpen(true)}
          className="relative shrink-0 lg:hidden"
          aria-label="Filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {filters.activeCount > 0 && (
            <span className="tnum absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-pasture-600 px-1 text-[11px] font-bold text-cream-50">
              {filters.activeCount}
            </span>
          )}
        </Button>

        {sort && <div className="hidden shrink-0 lg:block">{sort}</div>}
      </div>

      {/* Desktop: controls always visible — no hunting for a hidden panel. */}
      <div className="hidden flex-wrap items-end gap-3 lg:flex">{children}</div>

      <AnimatePresence initial={false}>
        {chips.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center gap-2 overflow-hidden"
          >
            {chips.map((chip) => (
              <li key={`${chip.key}:${chip.value ?? ""}`}>
                <button
                  type="button"
                  onClick={() => removeChip(chip)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-pasture-100 py-1.5 pl-3 pr-2 text-xs font-semibold text-pasture-800 ring-1 ring-inset ring-pasture-200 transition hover:bg-pasture-200"
                >
                  {chip.label}
                  <X className="h-3.5 w-3.5" aria-label={`Remove ${chip.label}`} />
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={filters.clearAll}
                className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-ink-muted underline underline-offset-2 transition hover:text-ink"
              >
                Clear all
              </button>
            </li>
          </motion.ul>
        )}
      </AnimatePresence>

      <Modal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        description="Narrow the list down. Your choices stay in the page link."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                filters.clearAll();
                setSheetOpen(false);
              }}
            >
              Clear all
            </Button>
            <Button onClick={() => setSheetOpen(false)}>Show results</Button>
          </>
        }
      >
        <div className="space-y-4 pb-2">
          {children}
          {sort && <div className="border-t border-cream-200 pt-4">{sort}</div>}
        </div>
      </Modal>
    </div>
  );
}
