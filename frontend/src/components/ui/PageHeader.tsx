"use client";

import { motion } from "framer-motion";

import { usePageAction } from "@/components/layout/PageActionContext";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Rendered in the sticky topbar, not here — it stays reachable while the page scrolls. */
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  usePageAction(action);

  return (
    <motion.header
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="mb-6"
    >
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      {subtitle && <p className="mt-1.5 text-[15px] text-muted-foreground">{subtitle}</p>}
    </motion.header>
  );
}
