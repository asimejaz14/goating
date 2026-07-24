"use client";

import { motion } from "framer-motion";
import { AlertCircle, RotateCcw, SearchX } from "lucide-react";

import { Button } from "./Button";

/**
 * The "nothing here yet" state — it teaches the next action rather than just
 * saying the list is empty. Distinct from {@link NoResults}, which means the
 * filters are too narrow.
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="soft-card flex flex-col items-center px-6 py-12 text-center"
    >
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-pasture-50 text-pasture-500">
        <Icon className="h-8 w-8" />
      </span>
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-ink-muted">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      icon={SearchX}
      title="No matches"
      message="Nothing fits these filters. Try widening the search or clearing a filter or two."
      action={
        <Button variant="secondary" onClick={onClear}>
          Clear filters
        </Button>
      }
    />
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="soft-card flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-clay-100 text-clay-600">
        <AlertCircle className="h-7 w-7" />
      </span>
      <h3 className="text-base font-bold text-ink">Something went wrong</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
