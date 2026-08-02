"use client";

import { motion } from "framer-motion";
import { useId } from "react";

/**
 * The shape of a series, drawn small enough to sit inside a stat card.
 *
 * No axes, no grid, no tooltip — a number tells you where the farm is, and
 * this tells you which way it has been moving, which is the question the
 * number on its own always leaves open. Hand-built rather than another
 * Recharts instance: a dozen of these on one page would each drag in a
 * responsive container and a resize observer to draw forty points.
 */
export function Sparkline({
  values,
  className,
  stroke = "hsl(var(--primary))",
  height = 34,
  width = 108,
}: {
  values: number[];
  className?: string;
  stroke?: string;
  height?: number;
  width?: number;
}) {
  const gradientId = `spark-${useId().replace(/:/g, "")}`;
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const flat = max === min;
  const span = max - min;
  const pad = 3;
  const step = width / (values.length - 1);

  const points = values.map((value, index) => {
    const x = index * step;
    // A steady series has no shape to show, so it is drawn straight through
    // the middle. Scaling it normally would divide by zero, and clamping the
    // divisor instead pins the line to the floor of the box, which reads as a
    // chart that failed rather than as a number that held still.
    const y = flat ? height / 2 : pad + (1 - (value - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  // A Catmull-Rom-ish smoothing: each segment gets control points a third of
  // the way along its neighbours, which reads as a curve without overshooting
  // into values the data never had.
  const line = points
    .map(([x, y], index) => {
      if (index === 0) return `M ${x} ${y}`;
      const [px, py] = points[index - 1];
      const cx = px + step / 3;
      const cx2 = x - step / 3;
      return `C ${cx} ${py}, ${cx2} ${y}, ${x} ${y}`;
    })
    .join(" ");

  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.34} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <motion.path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}
