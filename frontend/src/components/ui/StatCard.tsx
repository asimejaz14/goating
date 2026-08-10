"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect } from "react";

import { Sparkline } from "@/components/charts/Sparkline";
import { cn } from "@/lib/cn";

/**
 * Counts from 0 to `value` once, then tracks it directly on later updates.
 *
 * Kept short. This runs on a page somebody opens every day, and a number that
 * spins for a second before settling stops being a flourish and starts being
 * the thing standing between them and the figure they came to read. Someone
 * who has asked for less motion gets the figure immediately.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const count = useMotionValue(0);
  const reduce = useReducedMotion();
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    if (reduce) return;
    const controls = animate(count, value, { duration: 0.55, ease: [0.23, 1, 0.32, 1] });
    return () => controls.stop();
  }, [count, value, reduce]);

  // Rendered as a plain string rather than by seeding the motion value, which
  // leaves the figure showing zero: nothing drives the value onto the element
  // once the animation that would have done it is skipped. The headline number
  // is the whole point of the card — it has to be right before it is clever.
  return (
    <motion.span className={cn("tnum", className)}>
      {reduce ? value.toLocaleString() : rounded}
    </motion.span>
  );
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
      initial={{ opacity: 0, transform: "translateY(8px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{
        type: "spring",
        // Apple-style spring: a duration to reason about and a bounce small
        // enough that a row of stat cards settles rather than wobbles.
        duration: 0.42,
        bounce: 0.18,
        delay: Math.min(index, 10) * 0.04,
      }}
      {...(onClick ? { onClick, type: "button" as const } : {})}
      className={cn(
        emphasis ? "card-feature" : "card",
        "group relative flex flex-col overflow-hidden p-4 text-left",
        // CSS rather than `whileHover`, so it inherits the pointer gating that
        // keeps a tap on a phone from leaving the card stuck in its lifted
        // state — and so the lift never competes with the entrance spring.
        onClick &&
          "cursor-pointer transition-[transform,box-shadow] duration-hover ease-out hover:-translate-y-0.5 hover:shadow-md",
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
