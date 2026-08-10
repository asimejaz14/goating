"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cloneElement, useEffect, useId, useState } from "react";

import { cn } from "@/lib/cn";

type Side = "top" | "bottom" | "left" | "right";

const SIDES: Record<Side, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
  left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
  right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
};

/** The direction a tooltip grows from — it enters *out* of its trigger. */
const OFFSET: Record<Side, string> = {
  top: "translateY(4px)",
  bottom: "translateY(-4px)",
  left: "translateX(4px)",
  right: "translateX(-4px)",
};

/** Scale from the edge nearest the trigger, not from the middle of the bubble. */
const ORIGIN: Record<Side, string> = {
  top: "bottom center",
  bottom: "top center",
  left: "right center",
  right: "left center",
};

interface TooltipProps {
  label: React.ReactNode;
  side?: Side;
  /** The trigger. Must forward ref-less DOM props — a plain element or button. */
  children: React.ReactElement<Record<string, unknown>>;
  className?: string;
  /**
   * Stretch the wrapper to the full width of its parent. The wrapper is
   * `inline-flex` by default, which shrink-wraps the trigger — fine for an
   * icon button, wrong for a nav row that has to fill the rail.
   */
  block?: boolean;
}

/**
 * A hover/focus tooltip that also answers to the keyboard.
 *
 * `title` attributes were doing this job before, but they cannot be styled,
 * take ~1s to appear, and never show for keyboard users. This wraps the
 * trigger, describes it with `aria-describedby`, and stays out of the
 * accessibility tree otherwise.
 */
export function Tooltip({ label, side = "top", children, className, block }: TooltipProps) {
  const [hovering, setHovering] = useState(false);
  const [open, setOpen] = useState(false);
  const id = useId();

  // The open delay lives in an effect rather than a timer ref so there is no
  // mutable handle to clean up — leaving the trigger cancels it by itself.
  useEffect(() => {
    if (!hovering) {
      setOpen(false);
      return;
    }
    const timer = setTimeout(() => setOpen(true), 140);
    return () => clearTimeout(timer);
  }, [hovering]);

  const trigger = cloneElement(children, {
    "aria-describedby": open ? id : undefined,
    onMouseEnter: () => setHovering(true),
    onMouseLeave: () => setHovering(false),
    onFocus: () => setHovering(true),
    onBlur: () => setHovering(false),
  });

  return (
    <span className={cn("relative", block ? "flex w-full" : "inline-flex")}>
      {trigger}
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            style={{ transformOrigin: ORIGIN[side] }}
            initial={{ opacity: 0, transform: `${OFFSET[side]} scale(0.96)` }}
            animate={{ opacity: 1, transform: "translate(0px, 0px) scale(1)" }}
            exit={{ opacity: 0, transform: `${OFFSET[side]} scale(0.96)` }}
            transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
            className={cn(
              "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-foreground",
              "px-2 py-1 text-xs font-medium text-background shadow-md",
              SIDES[side],
              className,
            )}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
