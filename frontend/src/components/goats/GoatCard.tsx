"use client";

import { Baby, ChevronRight } from "lucide-react";
import Link from "next/link";

import { AcquisitionBadge, Badge, SexBadge, StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { GoatPhoto } from "@/components/ui/GoatPhoto";
import { formatAge, plural } from "@/lib/format";
import type { GoatSummary } from "@/lib/types";

/**
 * Order matters here: tag, name and the age line come first at fixed offsets,
 * and the badges go last.
 *
 * Badges are the only part with a variable line count, so anything below them
 * shifts when they wrap — which is what made a row of these cards look
 * misaligned even though the cards themselves were the same height.
 */
export function GoatCard({ goat, index = 0 }: { goat: GoatSummary; index?: number }) {
  return (
    <Card index={index} interactive className="overflow-hidden !p-0">
      <Link
        href={`/goats/${goat.id}`}
        className="flex h-full items-stretch gap-3 p-3"
        aria-label={`Open ${goat.tag_number}${goat.name ? ` (${goat.name})` : ""}`}
      >
        <GoatPhoto src={goat.photo_url} alt="" size={60} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <p className="tnum min-w-0 truncate text-sm font-semibold leading-tight text-foreground">
              {goat.tag_number}
            </p>
            <AcquisitionBadge type={goat.acquisition_type} />
          </div>

          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {goat.name || goat.breed_name || "Unnamed"}
          </p>
          <p className="mt-0.5 truncate text-xs text-faint-foreground">
            {formatAge(goat.age_months)}
            {goat.breed_name && goat.name ? ` · ${goat.breed_name}` : ""}
            {goat.color ? ` · ${goat.color}` : ""}
          </p>

          {/* `mt-auto` pins the badge row to the bottom, so cards of differing
              badge counts still line up along their base. */}
          <div className="mt-auto flex flex-wrap items-center gap-1 pt-2">
            <SexBadge sex={goat.sex} />
            {goat.status !== "active" && <StatusBadge status={goat.status} />}
            {goat.is_pregnant && <Badge tone="primary">Expecting</Badge>}
            {goat.kids_count > 0 && (
              <Badge tone="neutral">
                <Baby className="h-3 w-3" aria-hidden />
                {goat.kids_count} {plural(goat.kids_count, "kid")}
              </Badge>
            )}
          </div>
        </div>

        <ChevronRight
          className="h-4 w-4 shrink-0 self-center text-faint-foreground"
          aria-hidden
        />
      </Link>
    </Card>
  );
}
