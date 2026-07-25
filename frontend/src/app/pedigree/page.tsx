"use client";

import { GitBranch, Network, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { GoatPicker } from "@/components/goats/GoatPicker";
import { PedigreeCompleteness, PedigreeTree } from "@/components/tree/PedigreeTree";
import { Badge, SexBadge } from "@/components/ui/Badge";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
import { formatAge, formatDate } from "@/lib/format";
import { useGoat, usePedigree } from "@/lib/queries";
import { useFilters } from "@/lib/useFilters";

const DEPTHS = [
  { value: "3", label: "3 gens" },
  { value: "4", label: "4 gens" },
  { value: "6", label: "6 gens" },
];

/**
 * The whole-farm tree explorer.
 *
 * The chosen goat and the depth both live in the URL, so a tree can be sent to
 * someone else — or bookmarked — and reopen exactly as it was.
 */
export default function PedigreePage() {
  const filters = useFilters();
  const goatId = filters.get("goat") || null;
  const generations = Number(filters.get("gens") || 4);

  const [label, setLabel] = useState<string | null>(null);

  const { data: goat } = useGoat(goatId ?? undefined);
  const { data, isPending, isError, error, refetch } = usePedigree(
    goatId ?? undefined,
    generations,
  );

  return (
    <>
      <PageHeader
        title="Pedigree"
        subtitle="Pick a goat to see everything behind it. The tree builds itself from linked parents."
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <span className="field-label">Goat</span>
            <GoatPicker
              value={goatId}
              selectedLabel={label ?? goat?.tag_number ?? null}
              placeholder="Search a tag number or name"
              onChange={(picked) => {
                setLabel(picked?.tag_number ?? null);
                filters.setFilter("goat", picked?.id ?? undefined);
              }}
            />
          </div>
          <div className="lg:w-64">
            <span className="field-label">Depth</span>
            <SegmentedControl
              value={String(generations)}
              onChange={(value) => filters.setFilter("gens", value === "4" ? undefined : value)}
              options={DEPTHS}
            />
          </div>
        </div>
      </Card>

      {!goatId ? (
        <EmptyState
          icon={Search}
          title="Choose a goat"
          message="Search above and the full ancestry appears — generation by generation, as far back as the portal knows."
        />
      ) : isPending ? (
        <Card className="space-y-3">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </Card>
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : "The pedigree did not load."}
          onRetry={() => refetch()}
        />
      ) : (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/goats/${goatId}`}
                  className="tnum text-lg font-bold text-foreground underline-offset-2 hover:underline"
                >
                  {data.root.tag_number}
                </Link>
                {data.root.sex && <SexBadge sex={data.root.sex} />}
                {data.root.breed_name && <Badge tone="primary">{data.root.breed_name}</Badge>}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {data.root.name ? `${data.root.name} · ` : ""}
                {goat?.age_months !== undefined && goat?.age_months !== null
                  ? formatAge(goat.age_months)
                  : formatDate(data.root.date_of_birth)}
              </p>
            </div>
            <PedigreeCompleteness known={data.known_ancestors} total={data.total_slots} />
          </div>

          {data.known_ancestors === 0 ? (
            <EmptyState
              icon={GitBranch}
              title="No ancestors linked yet"
              message="Open this goat and link its mother and father. Every parent you add grows the tree — including everything their own parents already carry."
              action={
                <Link
                  href={`/goats/${goatId}`}
                  className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Open {data.root.tag_number} →
                </Link>
              }
            />
          ) : (
            <>
              <PedigreeTree
                root={data.root}
                generations={generations}
                rootId={goatId}
              />
              <p className="mt-3 flex items-center gap-1.5 text-xs text-faint-foreground">
                <Network className="h-3.5 w-3.5" />
                Dashed cards are ancestors nobody has linked yet — they show the breed as a
                placeholder. Tap any real goat to open its own page.
              </p>
            </>
          )}
        </Card>
      )}
    </>
  );
}
