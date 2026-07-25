"use client";

import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import Link from "next/link";

import { GoatPhoto } from "@/components/ui/GoatPhoto";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { PedigreeNode } from "@/lib/types";

/**
 * Classic pedigree chart: the goat on the left, each generation a column to the
 * right, dam above sire.
 *
 * Slots are laid out proportionally — a parent slot spans exactly its two child
 * slots — so the parent's centre line always lands on the boundary between
 * them. That is what lets the connectors be pure CSS with no measuring.
 */

/** Column `c` has `2^c` slots; index is the binary path (dam = 0, sire = 1). */
type Columns = Array<Array<PedigreeNode | null>>;

function flatten(root: PedigreeNode, maxGenerations: number): Columns {
  const columns: Columns = [];
  for (let column = 0; column <= maxGenerations; column += 1) {
    columns.push(new Array(2 ** column).fill(null));
  }
  columns[0][0] = root;

  for (let column = 0; column < maxGenerations; column += 1) {
    columns[column].forEach((node, index) => {
      if (!node) return;
      columns[column + 1][index * 2] = node.dam;
      columns[column + 1][index * 2 + 1] = node.sire;
    });
  }

  // A placeholder ends its branch, so trailing columns are often entirely
  // empty. Dropping them keeps a young herd's tree tight instead of showing a
  // wall of blank boxes.
  let deepest = 0;
  columns.forEach((slots, column) => {
    if (slots.some(Boolean)) deepest = column;
  });
  return columns.slice(0, deepest + 1);
}

/**
 * Columns share the available width instead of claiming a fixed one, so the
 * chart shrinks to whatever space it has rather than scrolling sideways.
 * `--stub` drives both the column gap and the connector geometry, and tightens
 * on narrow screens — keeping the two in step is what stops the elbows
 * detaching from the cards.
 */
const SIZES = {
  compact: { slot: 64, gap: "[--stub:1rem] sm:[--stub:2rem]" },
  full: { slot: 76, gap: "[--stub:1rem] sm:[--stub:2.5rem]" },
} as const;

type Size = keyof typeof SIZES;

function NodeCard({
  node,
  column,
  isRoot,
}: {
  node: PedigreeNode;
  column: number;
  isRoot: boolean;
}) {
  const accent =
    node.sex === "female"
      ? "border-l-[#E294BA]"
      : node.sex === "male"
        ? "border-l-[#7FA6C8]"
        : "border-l-border";

  const inner = (
    <>
      {/* The thumbnail is the first thing to go when space is tight — the tag
          number is what the chart is actually for. */}
      {node.is_placeholder ? (
        <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-faint-foreground sm:flex">
          <HelpCircle className="h-4 w-4" aria-hidden />
        </span>
      ) : (
        <GoatPhoto
          src={node.photo_url}
          alt=""
          size={36}
          rounded="rounded-lg"
          className="hidden sm:block"
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold leading-tight text-foreground">
          {node.is_placeholder ? "Unrecorded" : node.tag_number}
        </span>
        <span className="block truncate text-[11px] leading-tight text-muted-foreground">
          {node.is_placeholder
            ? (node.breed_name ?? "Unknown breed")
            : node.name || node.breed_name || formatDate(node.date_of_birth)}
        </span>
      </span>
    </>
  );

  const className = cn(
    "flex w-full min-w-0 items-center gap-2 rounded-md border border-l-4 px-2 py-1.5",
    node.is_placeholder
      ? "border-dashed border-border bg-muted/70 border-l-border"
      : cn("border-border bg-surface shadow-sm transition-shadow hover:shadow-md", accent),
    isRoot && !node.is_placeholder && "ring-2 ring-primary",
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: column * 0.08 }}
    >
      {node.is_placeholder || !node.id ? (
        <div className={className} title={`No ${node.relation ?? "parent"} recorded yet`}>
          {inner}
        </div>
      ) : (
        <Link href={`/goats/${node.id}`} className={className}>
          {inner}
        </Link>
      )}
    </motion.div>
  );
}

export function PedigreeTree({
  root,
  generations = 4,
  size = "full",
  rootId,
}: {
  root: PedigreeNode;
  generations?: number;
  size?: Size;
  /** Highlights the goat the tree was built for. */
  rootId?: string | null;
}) {
  const columns = flatten(root, generations);
  const { slot, gap } = SIZES[size];
  const rows = 2 ** (columns.length - 1);

  return (
    <div className="pb-2">
      <div
        className={cn("flex w-full gap-[var(--stub)]", gap)}
        style={{ minHeight: rows * slot }}
      >
        {columns.map((slots, column) => (
          <div key={column} className="flex min-w-0 flex-1 flex-col">
            {column === 0 && (
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint-foreground">
                This goat
              </p>
            )}
            {column > 0 && (
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint-foreground">
                Gen {column}
              </p>
            )}
            <div className="flex flex-1 flex-col">
              {slots.map((node, index) => (
                <div
                  key={index}
                  className="relative flex flex-1 items-center"
                  style={{ minHeight: slot }}
                >
                  {column > 0 && node && (
                    <>
                      {/* Horizontal stub from the joint out to this card. */}
                      <span
                        aria-hidden
                        className="absolute top-1/2 border-t-2 border-border"
                        style={{
                          left: "calc(var(--stub) / -2)",
                          width: "calc(var(--stub) / 2)",
                        }}
                      />
                      {/* Vertical half-leg. The upper sibling reaches down to the
                          slot boundary, the lower one reaches up to it — and that
                          boundary is exactly the parent's centre line. */}
                      <span
                        aria-hidden
                        className="absolute h-1/2 border-l-2 border-border"
                        style={{
                          left: "calc(var(--stub) / -2)",
                          ...(index % 2 === 0 ? { top: "50%" } : { top: 0 }),
                        }}
                      />
                    </>
                  )}
                  {/* Stub leaving this card toward its parents. */}
                  {node &&
                    column < columns.length - 1 &&
                    (node.dam || node.sire) && (
                      <span
                        aria-hidden
                        className="absolute top-1/2 right-0 border-t-2 border-border"
                        style={{
                          width: "calc(var(--stub) / 2)",
                          marginRight: "calc(var(--stub) / -2)",
                        }}
                      />
                    )}
                  {node && (
                    <NodeCard
                      node={node}
                      column={column}
                      isRoot={column === 0 && (!rootId || node.id === rootId)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "6 of 14 ancestors recorded" — honest about how much of the tree exists. */
export function PedigreeCompleteness({
  known,
  total,
}: {
  known: number;
  total: number;
}) {
  const percent = total ? Math.round((known / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full bg-primary"
        />
      </div>
      <span className="tnum text-xs text-muted-foreground">
        {known} of {total} ancestors recorded
      </span>
    </div>
  );
}
