"use client";

import { Baby, CalendarClock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge, CrossingBadge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { GoatPhoto } from "@/components/ui/GoatPhoto";
import { Card } from "@/components/ui/Card";
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
    <Card index={index} className="relative">
      {/* Status and the menu take their own row so the pairing below can use
          the full card width — squeezed onto one line, both tag numbers
          truncated to "BGF-…", which is the only thing worth reading here. */}
      <div className="flex items-center justify-between gap-2">
        <CrossingBadge status={crossing.status} />
        <IconButton
          label="More actions"
          size="sm"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <GoatLink goat={crossing.dam} fallback="Unknown doe" />
        <span className="shrink-0 text-xs text-faint-foreground">×</span>
        <GoatLink goat={crossing.sire} fallback="Unknown buck" />
      </div>

      {menuOpen && (
        <div
          className="absolute right-3 top-12 z-10 w-40 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-md"
          onMouseLeave={() => setMenuOpen(false)}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted"
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
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-danger hover:bg-danger-soft"
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
          <Badge tone={crossing.is_overdue ? "danger" : "primary"}>
            <CalendarClock className="h-3.5 w-3.5" />
            {formatCountdown(crossing.days_remaining)}
          </Badge>
          <Button size="sm" variant="secondary" onClick={() => onRecordKidding(crossing)}>
            Record kidding
          </Button>
        </div>
      ) : crossing.status === "kidded" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="primary">
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
        <p className="mt-3 line-clamp-2 text-sm leading-snug text-muted-foreground">{crossing.notes}</p>
      )}
    </Card>
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
    return <span className="truncate text-[13px] text-faint-foreground">{fallback}</span>;
  }
  return (
    <Link
      href={`/goats/${goat.id}`}
      className="flex min-w-0 items-center gap-1.5 rounded-md transition-opacity hover:opacity-70"
    >
      <GoatPhoto src={goat.photo_url} alt="" size={22} rounded="rounded-sm" />
      <span className="tnum truncate text-[13px] font-semibold text-foreground">
        {goat.tag_number}
      </span>
    </Link>
  );
}

function Cell({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-faint-foreground">
        {label}
      </dt>
      <dd className={cn("truncate text-sm font-semibold", muted ? "text-muted-foreground" : "text-foreground")}>
        {value}
      </dd>
    </div>
  );
}
