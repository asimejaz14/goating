"use client";

import { Baby, ChevronRight } from "lucide-react";
import Link from "next/link";

import { AcquisitionBadge, Badge, SexBadge, StatusBadge } from "@/components/ui/Badge";
import { GoatPhoto } from "@/components/ui/GoatPhoto";
import { SoftCard } from "@/components/ui/SoftCard";
import { formatAge, plural } from "@/lib/format";
import type { GoatSummary } from "@/lib/types";

export function GoatCard({ goat, index = 0 }: { goat: GoatSummary; index?: number }) {
  return (
    <SoftCard index={index} interactive className="overflow-hidden">
      <Link
        href={`/goats/${goat.id}`}
        className="flex items-center gap-3 p-3"
        aria-label={`Open ${goat.tag_number}${goat.name ? ` (${goat.name})` : ""}`}
      >
        <GoatPhoto src={goat.photo_url} alt="" size={72} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold leading-tight text-ink">
            {goat.tag_number}
          </p>
          <p className="truncate text-sm text-ink-muted">
            {goat.name || goat.breed_name || "Unnamed"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <SexBadge sex={goat.sex} />
            {goat.status !== "active" && <StatusBadge status={goat.status} />}
            {goat.is_pregnant && <Badge tone="gold">Expecting</Badge>}
            {goat.kids_count > 0 && (
              <Badge tone="neutral">
                <Baby className="h-3 w-3" aria-hidden />
                {goat.kids_count} {plural(goat.kids_count, "kid")}
              </Badge>
            )}
          </div>

          <p className="mt-1.5 truncate text-xs text-ink-faint">
            {formatAge(goat.age_months)}
            {goat.breed_name && goat.name ? ` · ${goat.breed_name}` : ""}
            {goat.color ? ` · ${goat.color}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2 self-stretch">
          <AcquisitionBadge type={goat.acquisition_type} />
          <ChevronRight className="mt-auto h-5 w-5 text-ink-faint" aria-hidden />
        </div>
      </Link>
    </SoftCard>
  );
}
