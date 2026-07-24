"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

import { cn } from "@/lib/cn";

/** Counts from 0 to `value` once, then tracks it directly on later updates. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.7, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [count, value]);

  return <motion.span className={cn("tnum", className)}>{rounded}</motion.span>;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  tone?: "green" | "gold" | "brown" | "clay";
  index?: number;
  href?: string;
  onClick?: () => void;
}

const TONES = {
  green: "bg-pasture-100 text-pasture-700",
  gold: "bg-gold-100 text-gold-700",
  brown: "bg-barn-100 text-barn-600",
  clay: "bg-clay-100 text-clay-600",
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "green",
  index = 0,
  onClick,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 10) * 0.04 }}
      onClick={onClick}
      className={cn(
        "soft-card p-4",
        onClick && "cursor-pointer transition-shadow hover:shadow-soft-lg",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight text-ink-muted">{label}</p>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            TONES[tone],
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold leading-none text-ink">
        {typeof value === "number" ? <CountUp value={value} /> : <span className="tnum">{value}</span>}
      </p>
      {hint && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
    </motion.div>
  );
}
