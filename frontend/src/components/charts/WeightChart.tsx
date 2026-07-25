"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatDateShort } from "@/lib/format";
import type { Weight } from "@/lib/types";

import { ChartTooltip } from "./ChartTooltip";
import { CHART_COLORS, compactTick, GRID, TICK } from "./chartTheme";

/**
 * Growth curve for one goat.
 *
 * The API returns newest-first, but a curve only reads correctly left-to-right,
 * so the series is reversed here.
 */
export function WeightChart({ weights }: { weights: Weight[] }) {
  const data = [...weights]
    .reverse()
    .map((weight) => ({
      label: formatDateShort(weight.measured_on),
      kg: Number(weight.weight_kg),
    }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -6 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...TICK} />
          <YAxis
            {...TICK}
            width={44}
            allowDecimals={false}
            tickFormatter={(value: number) => `${compactTick(value)} kg`}
          />
          <Tooltip content={<ChartTooltip unit=" kg" />} />
          <Line
            type="monotone"
            dataKey="kg"
            stroke={CHART_COLORS.primary}
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: CHART_COLORS.primary, strokeWidth: 0 }}
            isAnimationActive
            activeDot={{ r: 5 }}
            animationDuration={700}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
