"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { NamedCount } from "@/lib/types";

import { ChartTooltip } from "./ChartTooltip";
import { SERIES_COLORS } from "./chartTheme";

/**
 * A breakdown that has to be readable at a glance on a phone.
 *
 * The legend sits beside the ring rather than inside it — labels on the slices
 * themselves collide the moment one category dominates, which it always does
 * here (the herd is nearly all Makhi Cheeni does).
 */
export function DonutChart({
  data,
  colors = SERIES_COLORS,
  height = 200,
}: {
  data: NamedCount[];
  colors?: readonly string[];
  height?: number;
}) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const slices = data.filter((entry) => entry.value > 0);

  if (!slices.length) {
    return (
      <p className="py-8 text-center text-sm text-ink-faint">Nothing to chart yet.</p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div style={{ height, width: height }} className="relative shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="94%"
              paddingAngle={2}
              stroke="none"
              animationDuration={650}
            >
              {slices.map((entry, index) => (
                <Cell key={entry.label} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip showName />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tnum text-2xl font-bold leading-none text-ink">{total}</span>
          <span className="text-[11px] font-medium text-ink-faint">total</span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {slices.map((entry, index) => (
          <li key={entry.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">
              {entry.label}
            </span>
            <span className="tnum shrink-0 text-sm font-bold text-ink">{entry.value}</span>
            <span className="tnum w-10 shrink-0 text-right text-xs text-ink-faint">
              {total ? Math.round((entry.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
