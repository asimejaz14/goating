"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  size?: "sm" | "md";
  children: React.ReactNode;
}

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
} as const;

/**
 * A small, centred dialog reserved for confirmations — "delete this?",
 * "mark expired?", "settle up ₨X?". Anything with a real form belongs in
 * `Drawer` instead; keeping the two visually distinct is what makes a
 * confirmation feel appropriately quick rather than like another form to fill in.
 */
export function Modal({ open, onClose, title, description, footer, size = "sm", children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => panelRef.current?.focus(), 60);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/45"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            /* One transform string so the whole thing can be composited, and
               a scale that starts at 0.98 rather than 0 — nothing in the real
               world arrives from nothing, and a dialog that grows from a point
               reads as a special effect rather than as a panel appearing.
               A modal is not anchored to a trigger, so it keeps a centred
               origin; the popovers are the ones that scale from their field. */
            initial={{ opacity: 0, transform: "translateY(8px) scale(0.98)" }}
            animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
            exit={{ opacity: 0, transform: "translateY(4px) scale(0.98)" }}
            transition={{ duration: open ? 0.2 : 0.15, ease: [0.23, 1, 0.32, 1] }}
            className={cn(
              "relative flex w-full flex-col rounded-lg border border-border bg-surface shadow-lg",
              SIZES[size],
            )}
          >
            <div className="px-5 pb-1 pt-5">
              <h2 className="text-base font-semibold leading-tight text-foreground">{title}</h2>
              {description && (
                <p className="mt-1 text-sm leading-snug text-muted-foreground">{description}</p>
              )}
            </div>

            <div className="px-5 py-3">{children}</div>

            {footer && (
              <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-sunken px-5 py-3">
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
