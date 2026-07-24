"use client";

import { Baby, CalendarClock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge, CrossingBadge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { GoatPhoto } from "@/components/ui/GoatPhoto";
import { SoftCard } from "@/components/ui/SoftCard";
import { cn } from "@/lib/cn";
import { formatCountdown, formatDate, plural } from "@/lib/format";
import type { Crossing } from "@/lib/types";

/**
 * One mating, from the doe going to the buck through to the kids on the ground.
 *
 * A pregnancy in progress leads with the countdown, because that is the only
 * thing anyone opens this page to check.
 */
export function CrossingCard({
  crossing,
  index,
  onRecordKidding,
  onAddKid,
  onEdit,
  onDelete,
}: {
  crossing: Crossing;
  index: number;
  onRecordKidding: (crossing: Crossing) => void;
  onAddKid: (crossing: Crossing) => void;
  onEdit: (crossing: Crossing) => void;
  onDelete: (crossing: Crossing) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pregnant = crossing.status === "pregnant";
  const kids = crossing.number_of_kids ?? 0;
  const missing = Math.max(0, kids - crossing.kids_registered);

  return (
    <SoftCard index={index} className="relative">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <GoatLink goat={crossing.dam} fallback="Unknown doe" />
          <span className="shrink-0 text-xs font-semibold text-ink-faint">×</span>
          <GoatLink goat={crossing.sire} fallback="Unknown buck" />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CrossingBadge status={crossing.status} />
          <IconButton
            label="More actions"
            className="h-9 w-9"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {menuOpen && (
        <div
          className="absolute right-3 top-14 z-10 w-40 overflow-hidden rounded-xl border border-cream-300 bg-cream-50 py-1 shadow-soft-lg"
          onMouseLeave={() => setMenuOpen(false)}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-cream-100"
            onClick={() => {
              setMenuOpen(false);
              onEdit(crossing);
            }}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-clay-600 hover:bg-clay-100"
            onClick={() => {
              setMenuOpen(false);
              onDelete(crossing);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <Cell label="Crossed" value={formatDate(crossing.crossing_date)} />
        <Cell
          label={crossing.actual_kidding_date ? "Kidded" : "Expected"}
          value={formatDate(crossing.actual_kidding_date ?? crossing.expected_kidding_date)}
          muted={!crossing.actual_kidding_date}
        />
      </dl>

      {pregnant ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={crossing.is_overdue ? "clay" : "gold"}>
            <CalendarClock className="h-3.5 w-3.5" />
            {formatCountdown(crossing.days_remaining)}
          </Badge>
          <Button size="sm" variant="secondary" onClick={() => onRecordKidding(crossing)}>
            Record kidding
          </Button>
        </div>
      ) : crossing.status === "kidded" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="green">
            <Baby className="h-3.5 w-3.5" />
            {kids} {plural(kids, "kid")}
          </Badge>
          {missing > 0 && (
            <Button size="sm" variant="secondary" onClick={() => onAddKid(crossing)}>
              <Plus className="h-4 w-4" />
              Register {missing} {plural(missing, "kid")}
            </Button>
          )}
        </div>
      ) : null}

      {crossing.notes && (
        <p className="mt-3 line-clamp-2 text-sm leading-snug text-ink-muted">{crossing.notes}</p>
      )}
    </SoftCard>
  );
}

function GoatLink({
  goat,
  fallback,
}: {
  goat: Crossing["dam"];
  fallback: string;
}) {
  if (!goat) {
    return <span className="truncate text-sm text-ink-faint">{fallback}</span>;
  }
  return (
    <Link
      href={`/goats/${goat.id}`}
      className="flex min-w-0 items-center gap-1.5 rounded-lg transition-opacity hover:opacity-80"
    >
      <GoatPhoto src={goat.photo_url} alt="" size={28} rounded="rounded-lg" />
      <span className="tnum truncate text-sm font-bold text-ink">{goat.tag_number}</span>
    </Link>
  );
}

function Cell({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </dt>
      <dd className={cn("truncate text-sm font-semibold", muted ? "text-ink-muted" : "text-ink")}>
        {value}
      </dd>
    </div>
  );
}
