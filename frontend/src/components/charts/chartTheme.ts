/**
 * One place for every chart's colours and axis styling.
 *
 * Recharts takes plain colour strings rather than classes, but `var()` resolves
 * against the element's computed style inside SVG just as it does anywhere
 * else — so pointing these at the same CSS variables the rest of the UI uses
 * means the charts follow the light/dark switch for free, with no re-render.
 *
 * Multi-series charts step through one hue at decreasing opacity instead of
 * reaching for new colours, which is what keeps the whole portal at three.
 */

export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  danger: "hsl(var(--danger))",
  neutral: "hsl(var(--muted-foreground))",
  grid: "hsl(var(--border))",
  axis: "hsl(var(--faint-foreground))",
} as const;

/** Cycled through for donut/bar series with an unknown number of slices. */
export const SERIES_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.72)",
  "hsl(var(--primary) / 0.5)",
  "hsl(var(--muted-foreground) / 0.55)",
  "hsl(var(--primary) / 0.32)",
  "hsl(var(--muted-foreground) / 0.32)",
  "hsl(var(--primary) / 0.2)",
];

export const GRID = {
  stroke: CHART_COLORS.grid,
  strokeDasharray: "3 3",
  vertical: false,
} as const;

export const TICK = {
  tick: { fill: CHART_COLORS.axis, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

/**
 * Y-axis labels in a fixed 40px gutter, which four- and five-digit money
 * values overflow — they were being clipped to their last two digits. Anything
 * past a thousand collapses to `4.2k`, which fits and still reads.
 */
export function compactTick(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (magnitude >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}
