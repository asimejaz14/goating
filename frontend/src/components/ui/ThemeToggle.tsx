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

/** Three-way theme switch: light, dark, or follow the OS. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const groupId = useId();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "inline-grid grid-cols-3 gap-0.5 rounded-md border border-border bg-muted/60 p-0.5",
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
                "relative flex h-7 w-8 items-center justify-center rounded-sm transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`theme-${groupId}`}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-sm bg-surface shadow-xs"
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
