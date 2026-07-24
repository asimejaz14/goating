"use client";

import { ArrowDownWideNarrow } from "lucide-react";

import { cn } from "@/lib/cn";
import type { Filters } from "@/lib/useFilters";

import { Select } from "./Field";

/** Consistent label styling for every control on the filter row. */
function ControlShell({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block min-w-0 lg:w-44", className)}>
      <span className="soft-label">{label}</span>
      {children}
    </label>
  );
}

export function FilterSelect({
  filters,
  filterKey,
  label,
  options,
  anyLabel = "Any",
  className,
}: {
  filters: Filters;
  filterKey: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  anyLabel?: string;
  className?: string;
}) {
  return (
    <ControlShell label={label} className={className}>
      <Select
        value={filters.get(filterKey)}
        onChange={(event) => filters.setFilter(filterKey, event.target.value || undefined)}
      >
        <option value="">{anyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </ControlShell>
  );
}

export function FilterDate({
  filters,
  filterKey,
  label,
  className,
}: {
  filters: Filters;
  filterKey: string;
  label: string;
  className?: string;
}) {
  return (
    <ControlShell label={label} className={className}>
      <input
        type="date"
        value={filters.get(filterKey)}
        onChange={(event) => filters.setFilter(filterKey, event.target.value || undefined)}
        className="soft-input tap"
      />
    </ControlShell>
  );
}

export function FilterMonth({
  filters,
  filterKey = "month",
  label = "Month",
  className,
}: {
  filters: Filters;
  filterKey?: string;
  label?: string;
  className?: string;
}) {
  return (
    <ControlShell label={label} className={className}>
      <input
        type="month"
        value={filters.get(filterKey)}
        onChange={(event) => filters.setFilter(filterKey, event.target.value || undefined)}
        className="soft-input tap"
      />
    </ControlShell>
  );
}

export function FilterNumber({
  filters,
  filterKey,
  label,
  placeholder,
  min = 0,
  className,
}: {
  filters: Filters;
  filterKey: string;
  label: string;
  placeholder?: string;
  min?: number;
  className?: string;
}) {
  return (
    <ControlShell label={label} className={className}>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        placeholder={placeholder}
        value={filters.get(filterKey)}
        onChange={(event) => filters.setFilter(filterKey, event.target.value || undefined)}
        className="soft-input tnum tap"
      />
    </ControlShell>
  );
}

/** Segmented multi-select — used for goat status, where several values combine. */
export function FilterChipGroup({
  filters,
  filterKey,
  label,
  options,
  defaults = [],
}: {
  filters: Filters;
  filterKey: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  defaults?: string[];
}) {
  const selected = filters.getAll(filterKey);
  const effective = selected.length ? selected : defaults;

  return (
    <div className="min-w-0">
      <span className="soft-label">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = effective.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => {
                const next = active
                  ? effective.filter((entry) => entry !== option.value)
                  : [...effective, option.value];
                filters.setFilter(filterKey, next.length ? next : undefined);
              }}
              className={cn(
                "h-10 rounded-xl px-3 text-sm font-semibold transition-all duration-150",
                active
                  ? "bg-pasture-600 text-cream-50 shadow-soft"
                  : "border border-cream-300 bg-cream-50 text-ink-muted hover:bg-cream-100",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SortSelect({
  filters,
  options,
  defaultValue,
}: {
  filters: Filters;
  options: Array<{ value: string; label: string }>;
  /** `sort_by:sort_dir` used when the URL says nothing. */
  defaultValue: string;
}) {
  const current =
    filters.sortBy && filters.sortDir ? `${filters.sortBy}:${filters.sortDir}` : defaultValue;

  return (
    <label className="block lg:w-52">
      <span className="soft-label flex items-center gap-1.5">
        <ArrowDownWideNarrow className="h-3.5 w-3.5" aria-hidden />
        Sort by
      </span>
      <Select
        value={current}
        onChange={(event) => {
          const [sortBy, sortDir] = event.target.value.split(":");
          filters.setFilters({ sort_by: sortBy, sort_dir: sortDir });
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
