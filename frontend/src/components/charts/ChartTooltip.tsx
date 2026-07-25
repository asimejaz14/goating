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
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-md">
      {label !== undefined && (
        <p className="text-xs font-semibold text-faint-foreground">{label}</p>
      )}
      {payload.map((entry, index) => (
        <p
          key={`${entry.dataKey ?? entry.name ?? index}`}
          className="tnum text-sm font-bold text-foreground"
        >
          {showName && entry.name !== undefined && (
            <span className="mr-1.5 font-medium text-muted-foreground">{entry.name}</span>
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
