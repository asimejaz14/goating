"use client";

import { ArrowDownWideNarrow } from "lucide-react";

import { cn } from "@/lib/cn";
import type { Filters } from "@/lib/useFilters";

import { Select } from "./Field";

/** Consistent label + fixed width so a row of filters lines up and wraps cleanly. */
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
    <label className={cn("block w-[8.5rem]", className)}>
      <span className="field-label">{label}</span>
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
        className="field"
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
        className="field"
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
        className="field tnum"
      />
    </ControlShell>
  );
}

/** Multi-select pills — used for goat status, where several values combine. */
export function FilterChipGroup({
  filters,
  filterKey,
  label,
  options,
  defaults = [],
  className,
}: {
  filters: Filters;
  filterKey: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  defaults?: string[];
  className?: string;
}) {
  const selected = filters.getAll(filterKey);
  const effective = selected.length ? selected : defaults;

  return (
    <div className={cn("block", className)}>
      <span className="field-label">{label}</span>
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
                "h-9 rounded-md border px-2.5 text-[13px] font-medium transition-colors duration-150",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
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
    <label className="block w-44">
      <span className="field-label flex items-center gap-1.5">
        <ArrowDownWideNarrow className="h-3 w-3" aria-hidden />
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
