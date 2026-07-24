"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/cn";

interface SoftCardProps extends React.ComponentProps<typeof motion.div> {
  /** Stagger index — cards fade up in sequence as a list paints. */
  index?: number;
  interactive?: boolean;
}

export function SoftCard({
  index = 0,
  interactive,
  className,
  children,
  ...props
}: SoftCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.24,
        ease: [0.22, 1, 0.36, 1],
        // Cap the stagger so the last card on a full page is not left waiting.
        delay: Math.min(index, 8) * 0.03,
      }}
      className={cn(
        "soft-card",
        interactive &&
          "cursor-pointer transition-shadow duration-200 ease-soft hover:shadow-soft-lg",
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
  children,
}: {
  title: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("soft-card overflow-hidden", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-cream-200 px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          {Icon && <Icon className="h-4 w-4 text-pasture-600" />}
          {title}
        </h2>
        {action}
      </header>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}
