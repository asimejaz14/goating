"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/cn";
import type { Filters } from "@/lib/useFilters";
import { useSearchField } from "@/lib/useFilters";

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
  /** The everyday filters — always visible, never behind a click. */
  children: React.ReactNode;
  /** Less-common filters, expanded in place rather than hidden in a popover. */
  more?: React.ReactNode;
  sort?: React.ReactNode;
  className?: string;
}

/**
 * Search and the everyday filters sit in one row, always on screen — a
 * control that is one click away from view still costs a click, and on a
 * tool used the same way every day that adds up. Filters used only
 * occasionally expand in place behind "More filters" instead of crowding
 * the row that is visible on every visit.
 */
export function FilterBar({
  filters,
  searchPlaceholder,
  chips,
  children,
  more,
  sort,
  className,
}: FilterBarProps) {
  const [query, setQuery] = useSearchField(filters);
  const [expanded, setExpanded] = useState(false);

  const removeChip = (chip: ActiveChip) => {
    if (chip.value === undefined) {
      filters.setFilter(chip.key, undefined);
      return;
    }
    const remaining = filters.getAll(chip.key).filter((entry) => entry !== chip.value);
    filters.setFilter(chip.key, remaining.length ? remaining : undefined);
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-end gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={searchPlaceholder}
          className="basis-full shrink-0 sm:w-56 sm:shrink sm:basis-auto"
        />
        {children}
        {more && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors",
              expanded
                ? "border-border-strong bg-muted text-foreground"
                : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {expanded ? "Fewer filters" : "More filters"}
          </button>
        )}
        {sort && <div className="ml-auto">{sort}</div>}
      </div>

      <AnimatePresence initial={false}>
        {more && expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-border pt-3">{more}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {chips.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 flex flex-wrap items-center gap-1.5 overflow-hidden"
          >
            {chips.map((chip) => (
              <li key={`${chip.key}:${chip.value ?? ""}`}>
                <button
                  type="button"
                  onClick={() => removeChip(chip)}
                  className="group inline-flex items-center gap-1 rounded-sm border border-border bg-surface py-1 pl-2.5 pr-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
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
                className="rounded-sm px-2 py-1 text-xs font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
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
