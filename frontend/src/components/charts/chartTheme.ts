/**
 * One place for every chart's colours and axis styling.
 *
 * Recharts takes plain colour strings rather than classes, but `var()`
 * resolves against the element's computed style inside SVG just as it does
 * anywhere else — so pointing these at the same CSS variables the rest of the
 * UI uses means the charts follow the light/dark switch for free.
 *
 * A multi-series chart steps blue -> sky -> a neutral slate rather than
 * reaching for new hues, which is what keeps the palette disciplined.
 */

export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  accent: "hsl(var(--accent))",
  success: "hsl(var(--success))",
  neutral: "hsl(var(--muted-foreground))",
  grid: "hsl(var(--border))",
  axis: "hsl(var(--faint-foreground))",
} as const;

/** Cycled through for donut/bar series with an unknown number of slices. */
export const SERIES_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--muted-foreground) / 0.55)",
  "hsl(var(--primary) / 0.4)",
  "hsl(var(--accent) / 0.5)",
  "hsl(var(--muted-foreground) / 0.3)",
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
 * Y-axis labels sit in a fixed gutter that four- and five-digit money values
 * overflow. Anything past a thousand collapses to `4.2k` so it fits.
 */
export function compactTick(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (magnitude >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}
