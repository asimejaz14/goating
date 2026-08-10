"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrendPoint } from "@/lib/types";

import { ChartTooltip } from "./ChartTooltip";
import { CHART_COLORS, compactTick, GRID, TICK } from "./chartTheme";

/**
 * Every dashboard trend arrives from the API in the same `TrendPoint` shape, so
 * the two chart flavours here cover all of them — cumulative totals read as a
 * filled line, per-period counts read as bars.
 */
interface TrendProps {
  data: TrendPoint[];
  height?: number;
  color?: string;
  unit?: string;
  prefix?: string;
  /** Shown in place of the chart when every point is zero. */
  emptyMessage?: string;
}

/**
 * A grid with no data in it is worse than no chart: it looks like something
 * failed to load rather than like nothing has happened yet. A young herd has
 * plenty of genuinely empty months, so this is the common case, not the edge.
 */
function NoData({ height, message }: { height: number; message: string }) {
  return (
    <div
      style={{ height }}
      className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-surface-sunken/50 px-6 text-center"
    >
      <p className="text-sm font-medium text-muted-foreground">Nothing here yet</p>
      <p className="max-w-[34ch] text-xs leading-relaxed text-faint-foreground">{message}</p>
    </div>
  );
}

const isEmpty = (data: TrendPoint[]) => data.every((point) => !point.value);

export function TrendLine({
  data,
  height = 200,
  color = CHART_COLORS.primary,
  unit,
  prefix,
  emptyMessage,
}: TrendProps) {
  // Colours are now `hsl(var(--x))`, which cannot be part of an element id —
  // React's own unique id keeps two charts on a page from sharing a gradient.
  const uid = useId().replace(/:/g, "");
  const fillId = `trend-fill-${uid}`;
  const glowId = `trend-glow-${uid}`;

  if (emptyMessage && isEmpty(data)) return <NoData height={height} message={emptyMessage} />;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -6 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.38} />
              <stop offset="55%" stopColor={color} stopOpacity={0.1} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            {/* A soft bloom under the stroke — subtle enough to be felt rather
                than seen, and what stops a 2px line looking like wire.
                `userSpaceOnUse` is not optional here: a filter region defaults
                to the element's bounding box, and a perfectly flat series has
                zero height, which makes the region zero-sized and erases the
                line completely. Sizing it to the chart instead of to the data
                keeps a steady month rendering like any other. */}
            <filter
              id={glowId}
              filterUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="100%"
              height="100%"
            >
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...TICK} minTickGap={16} />
          <YAxis {...TICK} width={44} allowDecimals={false} tickFormatter={compactTick} />
          <Tooltip
            cursor={{ stroke: CHART_COLORS.axis, strokeDasharray: "4 4" }}
            content={<ChartTooltip unit={unit} prefix={prefix} />}
          />
          <Area
            type="monotone"
            dataKey="value"
            name="Total"
            stroke={color}
            strokeWidth={2.25}
            fill={`url(#${fillId})`}
            filter={`url(#${glowId})`}
            activeDot={{
              r: 5,
              fill: color,
              stroke: "hsl(var(--surface))",
              strokeWidth: 2.5,
            }}
            animationDuration={520}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendBars({
  data,
  height = 200,
  color = CHART_COLORS.primary,
  unit,
  prefix,
  emptyMessage,
  /** Dims every bar but the last — "this is where we are now". */
  highlightLast,
}: TrendProps & { highlightLast?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const barId = `bar-fill-${uid}`;
  const barMutedId = `bar-muted-${uid}`;

  if (emptyMessage && isEmpty(data)) return <NoData height={height} message={emptyMessage} />;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -6 }}>
          <defs>
            {/* Bars lit from the top so they read as columns rather than as
                flat blocks of colour. */}
            <linearGradient id={barId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0.55} />
            </linearGradient>
            <linearGradient id={barMutedId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.16} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...TICK} minTickGap={12} />
          <YAxis {...TICK} width={44} allowDecimals={false} tickFormatter={compactTick} />
          <Tooltip
            cursor={{ fill: CHART_COLORS.grid, opacity: 0.35, radius: 8 }}
            content={<ChartTooltip unit={unit} prefix={prefix} />}
          />
          <Bar dataKey="value" name="Total" radius={[8, 8, 8, 8]} animationDuration={480}>
            {data.map((point, index) => (
              <Cell
                key={point.period}
                fill={
                  highlightLast && index !== data.length - 1
                    ? `url(#${barMutedId})`
                    : `url(#${barId})`
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
