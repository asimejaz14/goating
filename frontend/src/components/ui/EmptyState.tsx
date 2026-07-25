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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="card flex flex-col items-center px-6 py-14 text-center"
    >
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{message}</p>
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
        <Button variant="secondary" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      }
    />
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger-soft-foreground">
        <AlertCircle className="h-5 w-5" />
      </span>
      <h3 className="text-[15px] font-semibold text-foreground">Something went wrong</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
