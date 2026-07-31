"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

import { cn } from "@/lib/cn";

/** Counts from 0 to `value` once, then tracks it directly on later updates. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [count, value]);

  return <motion.span className={cn("tnum", className)}>{rounded}</motion.span>;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  /** Lifts the one number that matters most on the page. */
  emphasis?: boolean;
  index?: number;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  emphasis,
  index = 0,
  onClick,
}: StatCardProps) {
  const Element = onClick ? motion.button : motion.div;

  return (
    <Element
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 10) * 0.035 }}
      {...(onClick ? { onClick, type: "button" as const } : {})}
      className={cn(
        emphasis ? "card-feature" : "card",
        "group flex items-start gap-3 p-4 text-left",
        onClick &&
          "cursor-pointer transition-[border-color,box-shadow,transform] duration-200 ease-soft hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
      )}
    >
      {/* The icon leads rather than trails: it is the fastest way to tell one
          number from the next when six of these sit in a row. */}
      <span
        className={cn(
          "icon-chip h-9 w-9",
          emphasis ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>

      <span className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-1 text-[26px] font-semibold leading-none tracking-tight",
            emphasis ? "text-primary" : "text-foreground",
          )}
        >
          {typeof value === "number" ? (
            <CountUp value={value} />
          ) : (
            <span className="tnum">{value}</span>
          )}
        </p>
        {hint && <p className="mt-1.5 truncate text-xs text-faint-foreground">{hint}</p>}
      </span>
    </Element>
  );
}
