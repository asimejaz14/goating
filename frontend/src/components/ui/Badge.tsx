"use client";

import { cn } from "@/lib/cn";
import type { AcquisitionType, CrossingStatus, GoatSex, GoatStatus } from "@/lib/types";

type Tone = "green" | "gold" | "clay" | "brown" | "neutral" | "pink" | "blue";

const TONES: Record<Tone, string> = {
  green: "bg-pasture-100 text-pasture-800 ring-pasture-200",
  gold: "bg-gold-100 text-gold-700 ring-gold-300",
  clay: "bg-clay-100 text-clay-700 ring-clay-300",
  brown: "bg-barn-100 text-barn-700 ring-barn-200",
  neutral: "bg-cream-200 text-ink-muted ring-cream-300",
  pink: "bg-[#FBE4EE] text-[#8E3560] ring-[#F0BDD3]",
  blue: "bg-[#DFEAF5] text-[#2C5578] ring-[#B6CFE4]",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const GOAT_STATUS: Record<GoatStatus, { tone: Tone; label: string }> = {
  active: { tone: "green", label: "Active" },
  sold: { tone: "gold", label: "Sold" },
  expired: { tone: "neutral", label: "Expired" },
};

export function StatusBadge({ status }: { status: GoatStatus }) {
  const { tone, label } = GOAT_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function SexBadge({ sex }: { sex: GoatSex }) {
  return (
    <Badge tone={sex === "female" ? "pink" : "blue"}>{sex === "female" ? "Doe" : "Buck"}</Badge>
  );
}

export function AcquisitionBadge({ type }: { type: AcquisitionType }) {
  return (
    <Badge tone={type === "bred" ? "green" : "brown"}>
      {type === "bred" ? "Born here" : "Purchased"}
    </Badge>
  );
}

const CROSSING_STATUS: Record<CrossingStatus, { tone: Tone; label: string }> = {
  pregnant: { tone: "gold", label: "Expecting" },
  kidded: { tone: "green", label: "Kidded" },
  aborted: { tone: "clay", label: "Aborted" },
  failed: { tone: "neutral", label: "Not settled" },
};

export function CrossingBadge({ status }: { status: CrossingStatus }) {
  const { tone, label } = CROSSING_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
