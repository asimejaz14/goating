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
        "card group flex flex-col p-4 text-left",
        onClick &&
          "cursor-pointer transition-[border-color,box-shadow,transform] duration-200 ease-soft hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[13px] font-medium text-muted-foreground">{label}</p>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            emphasis ? "text-primary" : "text-faint-foreground group-hover:text-muted-foreground",
          )}
        />
      </div>
      <p
        className={cn(
          "mt-2 text-[28px] font-semibold leading-none tracking-tight",
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
    </Element>
  );
}
