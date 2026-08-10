"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

import { IconButton } from "./Button";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Sticky action row at the bottom, always in view without scrolling the form. */
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const SIZES = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
} as const;

/**
 * A panel that slides in from the right for creating and editing records.
 *
 * Editing in place, beside the list that led here, keeps the list's scroll
 * position and filters intact — a full page navigation would lose both. Full
 * height on every screen size (unlike `Modal`, which is reserved for short
 * yes/no confirmations) because a record's whole form needs the room.
 */
export function Drawer({ open, onClose, title, description, footer, size = "md", children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(
        "input, select, textarea, button:not([aria-label='Close'])",
      );
      (target ?? panelRef.current)?.focus();
    }, 60);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            /* A full `transform` string rather than Motion's `x` shorthand:
               the shorthand animates as a separate value on the main thread
               every frame, while a single transform can be handed to the
               compositor. A drawer opens over a list that is still fetching,
               which is exactly when main-thread work drops frames.

               `100%` is the panel's own width, so the same line is correct at
               every breakpoint. Closing is quicker than opening — a dismissal
               should get out of the way, and matching the open duration makes
               it feel reluctant. */
            initial={{ transform: "translateX(100%)" }}
            animate={{ transform: "translateX(0%)" }}
            exit={{ transform: "translateX(100%)" }}
            transition={{
              duration: open ? 0.32 : 0.22,
              ease: [0.32, 0.72, 0, 1],
            }}
            className={cn(
              "relative flex h-full w-full flex-col overflow-hidden border-l border-border bg-surface shadow-lg",
              // Rounded on the leading edge only — the other three meet the
              // window, where a radius would just show a sliver of page behind.
              // Clipped so the header rule and the tinted footer follow the
              // curve instead of squaring off the corners they sit in.
              "sm:rounded-l-2xl",
              SIZES[size],
            )}
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-6 py-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold leading-tight text-foreground">{title}</h2>
                {description && (
                  <p className="mt-1 text-sm leading-snug text-muted-foreground">{description}</p>
                )}
              </div>
              <IconButton label="Close" hideTooltip onClick={onClose} className="-mr-1.5 -mt-1 shrink-0">
                <X className="h-[18px] w-[18px]" />
              </IconButton>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

            {footer && (
              <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-surface-sunken px-6 py-3.5">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
