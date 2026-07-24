/**
 * One place for every chart's colours and axis styling.
 *
 * Recharts takes plain props rather than classes, so the palette has to be
 * repeated as literals here — keeping them in a single module is what stops the
 * charts drifting away from the Tailwind theme.
 */

export const CHART_COLORS = {
  green: "#527D45",
  greenLight: "#94B888",
  gold: "#D9A72C",
  brown: "#A47D55",
  clay: "#C85A38",
  pink: "#E294BA",
  blue: "#7FA6C8",
  grid: "#F0E8D8",
  ink: "#5B6656",
} as const;

/** Cycled through for donut/bar series with an unknown number of slices. */
export const SERIES_COLORS = [
  CHART_COLORS.green,
  CHART_COLORS.gold,
  CHART_COLORS.brown,
  CHART_COLORS.blue,
  CHART_COLORS.pink,
  CHART_COLORS.clay,
  CHART_COLORS.greenLight,
];

export const GRID = {
  stroke: CHART_COLORS.grid,
  strokeDasharray: "3 3",
  vertical: false,
} as const;

export const TICK = {
  tick: { fill: "#8A9384", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;
