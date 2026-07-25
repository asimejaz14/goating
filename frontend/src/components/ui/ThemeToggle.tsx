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
 * `variant="sidebar"` is for the one place this sits on a surface that does
 * not itself follow the theme — the sidebar is a fixed ink panel in both
 * modes, so the toggle needs its own fixed-dark colours there rather than the
 * semantic tokens that flip with `.dark`.
 */
export function ThemeToggle({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "sidebar";
}) {
  const { theme, setTheme } = useTheme();
  const groupId = useId();
  const sidebar = variant === "sidebar";

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "inline-grid grid-cols-3 gap-0.5 rounded-md border p-0.5",
        sidebar ? "border-white/10 bg-white/5" : "border-border bg-muted/60",
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
                sidebar
                  ? active
                    ? "text-white"
                    : "text-sidebar-muted hover:text-sidebar-foreground"
                  : active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`theme-${groupId}`}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "absolute inset-0 rounded-sm",
                    sidebar ? "bg-white/10" : "bg-surface shadow-xs",
                  )}
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
