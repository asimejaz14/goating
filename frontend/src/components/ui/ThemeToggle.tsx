"use client";

import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useId } from "react";

import { type Theme, useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/cn";

import { Tooltip } from "./Tooltip";

const OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match system", icon: Monitor },
];

/**
 * Three-way theme switch: light, dark, or follow the OS.
 *
 * It used to carry a second, fixed-dark palette for the sidebar, which was the
 * one surface that did not follow the theme. The sidebar follows it now, so
 * the semantic tokens are correct everywhere and that branch is gone.
 *
 * `compact` cycles through the three settings with a single button instead of
 * showing all of them — for the collapsed rail, where a three-up control has
 * nowhere to sit.
 */
export function ThemeToggle({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const groupId = useId();

  if (compact) {
    const index = OPTIONS.findIndex((option) => option.value === theme);
    const current = OPTIONS[index === -1 ? 2 : index];
    const next = OPTIONS[(index === -1 ? 2 : index + 1) % OPTIONS.length];
    return (
      <Tooltip label={`Theme: ${current.label}`} side="right" block>
        <button
          type="button"
          onClick={() => setTheme(next.value)}
          aria-label={`Colour theme: ${current.label}. Switch to ${next.label}.`}
          className={cn(
            "flex h-9 w-full items-center justify-center rounded-xl border border-sidebar-border",
            "text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground",
            className,
          )}
        >
          <current.icon className="h-[15px] w-[15px]" />
        </button>
      </Tooltip>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "inline-grid grid-cols-3 gap-0.5 rounded-md border border-sidebar-border bg-sidebar-hover p-0.5",
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <Tooltip key={option.value} label={option.label}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(option.value)}
              className={cn(
                "relative flex h-7 w-full items-center justify-center rounded-sm transition-colors",
                active
                  ? "text-sidebar-foreground"
                  : "text-sidebar-muted hover:text-sidebar-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`theme-${groupId}`}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-sm bg-sidebar shadow-xs"
                />
              )}
              <option.icon className="relative h-[15px] w-[15px]" />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
