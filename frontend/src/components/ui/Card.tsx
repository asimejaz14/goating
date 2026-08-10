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
      initial={{ opacity: 0, transform: "translateY(6px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{
        duration: 0.22,
        ease: [0.23, 1, 0.32, 1],
        // Cap the stagger so the last card on a full page is not left waiting:
        // the offset is small and the ceiling keeps the whole run under ~200ms,
        // past which a page reads as loading rather than as arriving.
        delay: Math.min(index, 8) * 0.04,
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
  description,
  action,
  icon: Icon,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  /** One line saying what the panel is showing — charts are not self-evident. */
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  /** Escape hatch for lists that need to run edge to edge. */
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("card flex flex-col overflow-hidden", className)}>
      <header className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon && (
            <span className="icon-chip mt-0.5 h-7 w-7 bg-primary-soft text-primary-soft-foreground">
              <Icon className="h-[15px] w-[15px]" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-[14.5px] font-semibold text-foreground">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={cn("min-h-0 flex-1 px-4 pb-4", bodyClassName)}>{children}</div>
    </section>
  );
}
