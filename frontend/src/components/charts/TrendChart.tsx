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
}

export function TrendLine({
  data,
  height = 200,
  color = CHART_COLORS.primary,
  unit,
  prefix,
}: TrendProps) {
  // Colours are now `hsl(var(--x))`, which cannot be part of an element id —
  // React's own unique id keeps two charts on a page from sharing a gradient.
  const gradientId = `trend-fill-${useId().replace(/:/g, "")}`;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -6 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.24} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...TICK} minTickGap={16} />
          <YAxis {...TICK} width={44} allowDecimals={false} tickFormatter={compactTick} />
          <Tooltip content={<ChartTooltip unit={unit} prefix={prefix} />} />
          <Area
            type="monotone"
            dataKey="value"
            name="Total"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            animationDuration={700}
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
  /** Dims every bar but the last — "this is where we are now". */
  highlightLast,
}: TrendProps & { highlightLast?: boolean }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -6 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...TICK} minTickGap={12} />
          <YAxis {...TICK} width={44} allowDecimals={false} tickFormatter={compactTick} />
          <Tooltip
            cursor={{ fill: CHART_COLORS.grid, opacity: 0.4 }}
            content={<ChartTooltip unit={unit} prefix={prefix} />}
          />
          <Bar dataKey="value" name="Total" radius={[4, 4, 0, 0]} animationDuration={600}>
            {data.map((point, index) => (
              <Cell
                key={point.period}
                fill={color}
                fillOpacity={highlightLast && index !== data.length - 1 ? 0.35 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
