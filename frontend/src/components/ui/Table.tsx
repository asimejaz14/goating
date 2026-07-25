"use client";

import { cn } from "@/lib/cn";

/**
 * A data table whose header stays visible while the rows scroll past it.
 *
 * The wrapper deliberately does *not* clip with `overflow-hidden`. An
 * ancestor with any non-`visible` overflow — `hidden` included — counts as a
 * scrolling container for `position: sticky` purposes, which breaks the
 * header's stickiness relative to the page. Rounded corners come from
 * `first:`/`last:` on the corner cells instead, and there is no horizontal
 * scroll wrapper either, for the same reason (an explicit `overflow-x`
 * forces an implicit scroll container on `y` too) — each page instead hides
 * its least essential columns below `md`/`lg` with `hidden md:table-cell`.
 */
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border", className)}>
      <table className="w-full border-separate border-spacing-0 text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr>{children}</tr>
    </thead>
  );
}

/**
 * `position: sticky` goes on each `<th>`, not the `<thead>`.
 *
 * A `<thead>` is a table-header-group, not a table-cell, and browsers do not
 * reserve its layout space correctly when it is the sticky element — the row
 * beneath it renders as if it had zero height, so the first body row ends up
 * painted underneath the header instead of below it. Sticky cells are the
 * standard, cross-browser-correct way to pin a table header.
 */
export function Th({
  children,
  className,
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={cn(
        "sticky top-14 z-10 h-10 whitespace-nowrap border-b border-border bg-surface-sunken px-4",
        "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        "first:rounded-tl-lg last:rounded-tr-lg",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return (
    <tbody
      className={cn(
        "[&>tr:last-child>td:first-child]:rounded-bl-lg",
        "[&>tr:last-child>td:last-child]:rounded-br-lg",
      )}
    >
      {children}
    </tbody>
  );
}

export function Tr({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "group/row bg-surface transition-colors duration-150",
        onClick && "cursor-pointer hover:bg-muted/50",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  className,
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <td
      className={cn(
        "h-14 border-b border-border px-4 text-[13.5px] text-foreground",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Loading placeholder matching the real table's row height and column count. */
export function TableSkeletonRows({ columns, rows = 6 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row} className="bg-surface">
          {Array.from({ length: columns }).map((_, col) => (
            <td key={col} className="h-14 border-b border-border px-4">
              <div
                className="h-3.5 animate-pulse rounded bg-muted"
                style={{ width: col === 0 ? "70%" : `${45 + ((row + col) % 3) * 15}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
