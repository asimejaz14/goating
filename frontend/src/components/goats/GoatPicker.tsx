"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { GoatPhoto } from "@/components/ui/GoatPhoto";
import { cn } from "@/lib/cn";
import { formatAge } from "@/lib/format";
import { useGoats } from "@/lib/queries";
import type { GoatSex, GoatSummary } from "@/lib/types";
import { useDebounced } from "@/lib/useFilters";

interface GoatPickerProps {
  value: string | null;
  onChange: (goat: GoatSummary | null) => void;
  /** Restrict to does or bucks — dams and sires are never interchangeable. */
  sex?: GoatSex;
  label?: string;
  placeholder?: string;
  /** Goats that cannot be picked, e.g. the goat being edited (no self-parent). */
  excludeIds?: string[];
  /** Pre-resolved label so the trigger reads correctly before the list loads. */
  selectedLabel?: string | null;
  id?: string;
  disabled?: boolean;
}

/**
 * Searchable goat chooser.
 *
 * A plain `<select>` stops working the moment the herd passes a screenful, so
 * every "which goat?" question in the portal goes through this instead: type a
 * few characters of a tag or name and tap the row.
 */
export function GoatPicker({
  value,
  onChange,
  sex,
  placeholder = "Choose a goat",
  excludeIds = [],
  selectedLabel,
  id,
  disabled,
}: GoatPickerProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const debounced = useDebounced(term, 250);

  const { data, isFetching } = useGoats({
    q: debounced || undefined,
    sex,
    // Expired and sold goats keep their history but never enter new records.
    status: ["active"],
    page_size: 30,
    sort_by: "tag_number",
    sort_dir: "asc",
  });

  // Callers pass `excludeIds` as an inline array literal, so the identity changes
  // every render — the joined form is what actually identifies it.
  const excludeKey = excludeIds.join(",");
  const options = useMemo(
    () => (data?.items ?? []).filter((goat) => !excludeIds.includes(goat.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, excludeKey],
  );

  const selected = options.find((goat) => goat.id === value);
  const triggerLabel =
    selected?.tag_number ??
    selectedLabel ??
    (value ? "Selected goat" : placeholder);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={cn(
            "soft-input tap flex items-center justify-between gap-2 text-left",
            !value && "text-ink-faint",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <span className="truncate">
            {triggerLabel}
            {selected?.name && (
              <span className="ml-1.5 text-ink-muted">· {selected.name}</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
        </button>
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Clear selection"
            className="tap rounded-xl px-2 text-ink-faint transition hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={sex === "female" ? "Choose a doe" : sex === "male" ? "Choose a buck" : "Choose a goat"}
        description="Search by tag number or name. Only active goats appear here."
      >
        <div className="relative mb-3">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="BGF-MC-01 or a name…"
            aria-label="Search goats"
            className="soft-input tap pl-10"
          />
        </div>

        {options.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            {isFetching ? "Searching…" : "No active goats match that search."}
          </p>
        ) : (
          <ul className="-mx-1 max-h-[45vh] space-y-1 overflow-y-auto px-1">
            {options.map((goat) => (
              <li key={goat.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(goat);
                    setOpen(false);
                    setTerm("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
                    goat.id === value ? "bg-pasture-100" : "hover:bg-cream-200",
                  )}
                >
                  <GoatPhoto src={goat.photo_url} alt="" size={40} rounded="rounded-xl" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {goat.tag_number}
                      {goat.name && <span className="font-normal text-ink-muted"> · {goat.name}</span>}
                    </span>
                    <span className="block truncate text-xs text-ink-faint">
                      {goat.breed_name ?? "Unknown breed"} · {formatAge(goat.age_months)}
                    </span>
                  </span>
                  {goat.id === value && (
                    <Check className="h-4 w-4 shrink-0 text-pasture-600" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 border-t border-cream-200 pt-3">
          <Button variant="ghost" size="sm" block onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
