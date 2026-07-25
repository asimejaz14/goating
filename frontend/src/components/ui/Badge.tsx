"use client";

import { cn } from "@/lib/cn";
import type { AcquisitionType, CrossingStatus, GoatSex, GoatStatus } from "@/lib/types";

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "outline";

const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  danger: "bg-danger-soft text-danger-soft-foreground",
  outline: "border border-border text-muted-foreground",
};

export function Badge({
  tone = "neutral",
  dot,
  className,
  children,
}: {
  tone?: Tone;
  /** Small leading dot — distinguishes categories without adding a colour. */
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />}
      {children}
    </span>
  );
}

/** Green = in the active herd, grey = no longer part of day-to-day operations. */
const GOAT_STATUS: Record<GoatStatus, { tone: Tone; label: string }> = {
  active: { tone: "success", label: "Active" },
  sold: { tone: "outline", label: "Sold" },
  expired: { tone: "neutral", label: "Expired" },
};

export function StatusBadge({ status }: { status: GoatStatus }) {
  const { tone, label } = GOAT_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function SexBadge({ sex }: { sex: GoatSex }) {
  return <Badge tone="outline" dot>{sex === "female" ? "Doe" : "Buck"}</Badge>;
}

export function AcquisitionBadge({ type }: { type: AcquisitionType }) {
  return <Badge tone="outline">{type === "bred" ? "Born here" : "Purchased"}</Badge>;
}

/** Amber = in progress, green = resolved successfully, red = did not succeed. */
const CROSSING_STATUS: Record<CrossingStatus, { tone: Tone; label: string }> = {
  pregnant: { tone: "warning", label: "Expecting" },
  kidded: { tone: "success", label: "Kidded" },
  aborted: { tone: "danger", label: "Aborted" },
  failed: { tone: "neutral", label: "Not settled" },
};

export function CrossingBadge({ status }: { status: CrossingStatus }) {
  const { tone, label } = CROSSING_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
