"use client";

import { motion } from "framer-motion";
import { useId } from "react";

import { cn } from "@/lib/cn";

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; hint?: string }>;
  className?: string;
}

/**
 * Two or three mutually exclusive choices, shown all at once.
 *
 * Used for the decisions that shape a form — doe/buck, born here/purchased —
 * where a dropdown would hide half the question behind a tap.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: SegmentedControlProps<T>) {
  const groupId = useId();

  return (
    <div
      role="radiogroup"
      className={cn(
        "grid gap-1 rounded-2xl bg-cream-200 p-1",
        options.length === 2 ? "grid-cols-2" : "grid-cols-3",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex min-h-[44px] flex-col items-center justify-center rounded-xl px-2 py-1.5 text-sm font-semibold transition-colors duration-150",
              active ? "text-pasture-800" : "text-ink-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={`segment-${groupId}`}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 rounded-xl bg-cream-50 shadow-soft"
              />
            )}
            <span className="relative">{option.label}</span>
            {option.hint && (
              <span className="relative text-[11px] font-normal text-ink-faint">
                {option.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
