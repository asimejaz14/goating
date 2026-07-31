"use client";

import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** The page's primary action, sitting on the same line as the title. */
  action?: React.ReactNode;
}

/**
 * Title, one line of explanation, and the page's primary action together.
 *
 * The action belongs beside the heading it relates to: "Add goat" reads as
 * part of "Herd" in a way it never does floating in a global toolbar, where
 * it looks like a property of the app rather than of this page. On a narrow
 * screen the button drops below the text and stretches, which keeps it in the
 * thumb's reach instead of stranded in a corner.
 */
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-2 [&>*]:w-full sm:[&>*]:w-auto">
          {action}
        </div>
      )}
    </motion.header>
  );
}
