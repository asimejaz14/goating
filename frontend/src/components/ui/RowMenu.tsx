"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

import { IconButton } from "./Button";

export interface RowMenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  danger?: boolean;
}

/**
 * The "…" overflow menu for a table row's secondary actions.
 *
 * `onMouseLeave` closes nothing here on purpose — that only works for a mouse,
 * and half the farm runs this from a phone. A real outside-click/Escape
 * listener is what makes it dismissible on touch and from the keyboard alike.
 */
export function RowMenu({ items, label = "Row actions" }: { items: RowMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <IconButton
        label={label}
        size="sm"
        hideTooltip
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </IconButton>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-md"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium transition-colors",
                item.danger
                  ? "text-danger hover:bg-danger-soft"
                  : "text-foreground hover:bg-muted",
              )}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
