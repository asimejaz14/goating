"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

import { IconButton } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Sticky action row — on mobile it hugs the bottom above the safe area. */
  footer?: React.ReactNode;
  size?: "md" | "lg";
  children: React.ReactNode;
}

/**
 * A dialog that becomes a bottom sheet on phones.
 *
 * Sheets rise from the thumb, which is where the hand already is — a centred
 * modal on a 375px screen puts the primary action out of easy reach.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = "md",
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog so the keyboard and screen reader follow.
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
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative flex max-h-[92vh] w-full flex-col overflow-hidden bg-cream-50 shadow-soft-lg",
              "rounded-t-3xl sm:rounded-3xl",
              size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg",
            )}
          >
            {/* Grab handle — signals "drag/dismiss" on touch without a chrome bar. */}
            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-cream-300 sm:hidden" />

            <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold leading-tight text-ink">{title}</h2>
                {description && (
                  <p className="mt-1 text-sm leading-snug text-ink-muted">{description}</p>
                )}
              </div>
              <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1 shrink-0">
                <X className="h-5 w-5" />
              </IconButton>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>

            {footer && (
              <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-cream-200 bg-cream-100/80 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:pb-3">
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
