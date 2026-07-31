"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

const PANEL_MAX_HEIGHT = 320;
const GAP = 6;

/**
 * Searchable goat chooser — a dropdown, not a dialog.
 *
 * A plain `<select>` stops working the moment the herd passes a screenful, so
 * every "which goat?" question in the portal goes through this instead: open it
 * and the list is already there, type to narrow, click the row. One click to
 * choose, the way a select behaves.
 *
 * The panel is rendered in a portal and positioned against the trigger's own
 * rectangle rather than nested inside it. Most callers sit in a drawer whose
 * body scrolls, and a normally-positioned panel would simply be cut off at that
 * boundary; escaping to the body means the same component works on a plain page
 * and inside a drawer without either caller knowing the difference.
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const debounced = useDebounced(term, 250);

  const { data, isFetching } = useGoats(
    {
      q: debounced || undefined,
      sex,
      // Expired and sold goats keep their history but never enter new records.
      status: ["active"],
      page_size: 30,
      sort_by: "tag_number",
      sort_dir: "asc",
    },
    // Nothing to fetch until the list is actually on screen.
    { enabled: open },
  );

  // Callers pass `excludeIds` as an inline array literal, so the identity changes
  // every render — the joined form is what actually identifies it.
  const excludeKey = excludeIds.join(",");
  const options = useMemo(
    () => (data?.items ?? []).filter((goat) => !excludeIds.includes(goat.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, excludeKey],
  );

  const selected = options.find((goat) => goat.id === value);
  const triggerLabel = selected?.tag_number ?? selectedLabel ?? (value ? "Selected goat" : placeholder);

  /** Anchor the panel under the trigger, flipping above when the room is below. */
  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const box = trigger.getBoundingClientRect();
    const below = window.innerHeight - box.bottom - GAP;
    const flip = below < 220 && box.top > below;
    setRect({
      top: flip ? Math.max(GAP, box.top - Math.min(PANEL_MAX_HEIGHT, box.top - GAP) - GAP) : box.bottom + GAP,
      left: box.left,
      width: box.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    // `true` catches scrolling of any ancestor — the drawer body included —
    // not just the window, so the panel tracks its trigger instead of drifting.
    const reposition = () => place();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    // Capture, so Escape closes this before the surrounding drawer sees it.
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
    else setTerm("");
  }, [open]);

  // A narrowed list invalidates whatever was highlighted before.
  useEffect(() => setActiveIndex(0), [debounced, open]);

  function choose(goat: GoatSummary) {
    onChange(goat);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onListKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => {
        if (options.length === 0) return 0;
        const next = event.key === "ArrowDown" ? current + 1 : current - 1;
        return (next + options.length) % options.length;
      });
    } else if (event.key === "Enter" && options[activeIndex]) {
      event.preventDefault();
      choose(options[activeIndex]);
    }
  }

  const panel = open && rect && (
    <div
      ref={panelRef}
      style={{ top: rect.top, left: rect.left, width: Math.max(rect.width, 260) }}
      className="fixed z-[70] overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
    >
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint-foreground"
            aria-hidden
          />
          <input
            ref={searchRef}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={onListKeyDown}
            placeholder="Search tag or name…"
            aria-label="Search goats"
            aria-controls={listboxId}
            className="field tap pl-9"
          />
        </div>
      </div>

      {options.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          {isFetching ? "Searching…" : "No active goats match that search."}
        </p>
      ) : (
        <ul
          id={listboxId}
          role="listbox"
          className="max-h-[264px] overflow-y-auto p-1.5"
        >
          {options.map((goat, index) => (
            <li key={goat.id}>
              <button
                type="button"
                role="option"
                aria-selected={goat.id === value}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(goat)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                  goat.id === value
                    ? "bg-primary-soft"
                    : index === activeIndex
                      ? "bg-muted"
                      : "hover:bg-muted",
                )}
              >
                <GoatPhoto src={goat.photo_url} alt="" size={32} rounded="rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-foreground">
                    {goat.tag_number}
                    {goat.name && (
                      <span className="font-normal text-muted-foreground"> · {goat.name}</span>
                    )}
                  </span>
                  <span className="block truncate text-[11px] text-faint-foreground">
                    {goat.breed_name ?? "Unknown breed"} · {formatAge(goat.age_months)}
                  </span>
                </span>
                {goat.id === value && (
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      <button
        id={id}
        ref={triggerRef}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "field tap flex items-center justify-between gap-2 text-left",
          !value && "text-faint-foreground",
          open && "border-primary ring-2 ring-ring/20",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="truncate">
          {triggerLabel}
          {selected?.name && <span className="ml-1.5 text-muted-foreground">· {selected.name}</span>}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-faint-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Clear selection"
          className="tap rounded-lg px-2 text-faint-foreground transition hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {typeof document !== "undefined" && panel && createPortal(panel, document.body)}
    </div>
  );
}
