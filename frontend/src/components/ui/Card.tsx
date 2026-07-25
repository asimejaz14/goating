"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/cn";

interface CardProps extends React.ComponentProps<typeof motion.div> {
  /** Stagger index — cards fade up in sequence as a list paints. */
  index?: number;
  interactive?: boolean;
}

/**
 * `cn` is a plain join, not tailwind-merge, so a caller that wants different
 * padding has to out-specify the default with `!p-0` — which is what the
 * edge-to-edge lists already do.
 */

export function Card({ index = 0, interactive, className, children, ...props }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.22,
        ease: [0.22, 1, 0.36, 1],
        // Cap the stagger so the last card on a full page is not left waiting.
        delay: Math.min(index, 8) * 0.025,
      }}
      className={cn(
        "card p-4",
        interactive &&
          "cursor-pointer transition-[border-color,box-shadow,transform] duration-200 ease-soft hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function SectionCard({
  title,
  action,
  icon: Icon,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  /** Escape hatch for lists that need to run edge to edge. */
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("card flex flex-col overflow-hidden", className)}>
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <span className="truncate">{title}</span>
        </h2>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={cn("min-h-0 flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
