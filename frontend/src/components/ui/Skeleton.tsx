"use client";

import { cn } from "@/lib/cn";

/**
 * A shimmering placeholder block.
 *
 * The portal never shows a full-page spinner — a skeleton keeps the layout in
 * place so nothing jumps when the data lands.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden rounded-xl bg-cream-200", className)}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-cream-50/70 to-transparent" />
    </div>
  );
}

export function SkeletonCardGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="soft-card flex gap-3 p-3">
          <Skeleton className="h-20 w-20 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}
