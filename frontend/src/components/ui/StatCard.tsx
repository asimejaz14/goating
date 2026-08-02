"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect } from "react";

import { Sparkline } from "@/components/charts/Sparkline";
import { cn } from "@/lib/cn";

/** Counts from 0 to `value` once, then tracks it directly on later updates. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
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
  /** Real series behind the number — drawn as a sparkline under it. */
  trend?: number[];
  /** Change across the trend window, already worked out by the caller. */
  delta?: { value: number; label: string; goodWhenUp?: boolean };
}

function DeltaPill({ delta }: { delta: NonNullable<StatCardProps["delta"]> }) {
  const flat = delta.value === 0;
  const up = delta.value > 0;
  // Up is not automatically good: a rising spend is not a rising herd.
  const good = flat ? null : up === (delta.goodWhenUp ?? true);
  const Icon = flat ? ArrowRight : up ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
        good === null
          ? "bg-muted text-muted-foreground"
          : good
            ? "bg-success-soft text-success-soft-foreground"
            : "bg-danger-soft text-danger-soft-foreground",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {flat ? "0" : `${up ? "+" : ""}${delta.value}`}
    </span>
  );
}

/**
 * A headline number with the shape of how it got there.
 *
 * A count on its own is inert — 327 goats reads the same whether the herd
 * doubled this year or halved. The sparkline and the change pill turn each
 * card into a small answer rather than a small fact, and they cost no extra
 * request: every series here is already in the dashboard payload.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  emphasis,
  index = 0,
  onClick,
  trend,
  delta,
}: StatCardProps) {
  const Element = onClick ? motion.button : motion.div;

  return (
    <Element
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 26,
        delay: Math.min(index, 10) * 0.05,
      }}
      {...(onClick ? { onClick, type: "button" as const, whileHover: { y: -3 } } : {})}
      className={cn(
        emphasis ? "card-feature" : "card",
        "group relative flex flex-col overflow-hidden p-4 text-left",
        onClick && "cursor-pointer transition-shadow duration-200 hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "icon-chip h-9 w-9 transition-transform duration-300 group-hover:scale-105",
            emphasis
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        {delta && <DeltaPill delta={delta} />}
      </div>

      <p className="mt-3 truncate text-[12.5px] font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-[30px] font-semibold leading-none tracking-tight",
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

      {/* A series of nothing but zeros has no shape worth drawing — it would
          be a flat rule across the card implying data that does not exist. */}
      {trend && trend.length > 1 && trend.some((point) => point !== 0) && (
        // Bled to the card's edges: the shape is the point, and a boxed-in
        // sparkline with its own margins reads as a second, tiny chart.
        <span className="pointer-events-none -mx-4 -mb-4 mt-4 block">
          <Sparkline
            values={trend}
            height={54}
            className="h-[54px] w-full"
            stroke={emphasis ? "hsl(var(--primary))" : "hsl(var(--accent))"}
          />
        </span>
      )}
    </Element>
  );
}
