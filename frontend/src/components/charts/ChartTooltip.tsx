"use client";

/**
 * Recharts' default tooltip is a white box with a hairline border — it reads as
 * a browser artefact next to the soft cards. This one matches the design system.
 *
 * Recharts injects `active`/`payload`/`label` at render time and, from v3, reads
 * them from context rather than the public prop type, so the shape is declared
 * here instead of imported.
 */
interface TooltipEntry {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  unit?: string;
  prefix?: string;
  /** Shows the series name beside each value — for multi-series charts. */
  showName?: boolean;
}

export function ChartTooltip({
  active,
  payload,
  label,
  unit = "",
  prefix = "",
  showName,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 shadow-soft-lg">
      {label !== undefined && (
        <p className="text-xs font-semibold text-ink-faint">{label}</p>
      )}
      {payload.map((entry, index) => (
        <p
          key={`${entry.dataKey ?? entry.name ?? index}`}
          className="tnum text-sm font-bold text-ink"
        >
          {showName && entry.name !== undefined && (
            <span className="mr-1.5 font-medium text-ink-muted">{entry.name}</span>
          )}
          {prefix}
          {typeof entry.value === "number"
            ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
            : entry.value}
          {unit}
        </p>
      ))}
    </div>
  );
}
