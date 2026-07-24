"use client";

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
import { CHART_COLORS, GRID, TICK } from "./chartTheme";

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
  color = CHART_COLORS.green,
  unit,
  prefix,
}: TrendProps) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            {/* The id is colour-derived so two charts on one page never collide. */}
            <linearGradient id={`fill-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...TICK} minTickGap={16} />
          <YAxis {...TICK} width={40} allowDecimals={false} />
          <Tooltip content={<ChartTooltip unit={unit} prefix={prefix} />} />
          <Area
            type="monotone"
            dataKey="value"
            name="Total"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#fill-${color.slice(1)})`}
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
  color = CHART_COLORS.gold,
  unit,
  prefix,
  /** Tints the most recent bar green — "this is where we are now". */
  highlightLast,
}: TrendProps & { highlightLast?: boolean }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...TICK} minTickGap={12} />
          <YAxis {...TICK} width={40} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: CHART_COLORS.grid, opacity: 0.5 }}
            content={<ChartTooltip unit={unit} prefix={prefix} />}
          />
          <Bar dataKey="value" name="Total" radius={[6, 6, 0, 0]} animationDuration={600}>
            {data.map((point, index) => (
              <Cell
                key={point.period}
                fill={
                  highlightLast && index === data.length - 1 ? CHART_COLORS.green : color
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
