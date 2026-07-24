"use client";

import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="mb-5 flex flex-wrap items-end justify-between gap-3"
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[15px] leading-snug text-ink-muted">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </motion.header>
  );
}
