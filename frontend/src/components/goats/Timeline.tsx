"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Baby,
  Banknote,
  Cake,
  HeartPulse,
  Scale,
  ShoppingCart,
  Skull,
  Sparkles,
  Syringe,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { TimelineEvent } from "@/lib/types";

const PAGE = 12;

const STYLES: Record<
  TimelineEvent["kind"],
  { icon: React.ComponentType<{ className?: string }>; ring: string }
> = {
  born: { icon: Cake, ring: "bg-pasture-100 text-pasture-700" },
  purchased: { icon: ShoppingCart, ring: "bg-barn-100 text-barn-700" },
  crossed: { icon: Sparkles, ring: "bg-gold-100 text-gold-700" },
  kidded: { icon: Baby, ring: "bg-pasture-100 text-pasture-700" },
  kid_registered: { icon: Baby, ring: "bg-pasture-100 text-pasture-700" },
  vaccinated: { icon: Syringe, ring: "bg-[#DFEAF5] text-[#2C5578]" },
  weighed: { icon: Scale, ring: "bg-cream-200 text-ink-muted" },
  health: { icon: HeartPulse, ring: "bg-clay-100 text-clay-700" },
  expense: { icon: Banknote, ring: "bg-gold-100 text-gold-700" },
  expired: { icon: Skull, ring: "bg-cream-200 text-ink-muted" },
};

/**
 * The whole life of one goat, newest first.
 *
 * Every section on the detail page shows one kind of record; this merges them
 * all so the story reads top to bottom — crossed, kidded, weighed, treated —
 * without the farmer stitching dates together in their head.
 */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  const [shown, setShown] = useState(PAGE);
  const visible = events.slice(0, shown);

  return (
    <div>
      <ol className="relative">
        {/* The spine, stopping at the last dot rather than running past it. */}
        <span
          aria-hidden
          className="absolute left-[15px] top-3 w-px bg-cream-300"
          style={{ height: `calc(100% - ${visible.length ? "2.5rem" : "100%"})` }}
        />
        <AnimatePresence initial={false}>
          {visible.map((event, index) => {
            const { icon: Icon, ring } = STYLES[event.kind] ?? STYLES.health;
            return (
              <motion.li
                key={`${event.date}-${event.kind}-${event.ref_id ?? index}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.22,
                  ease: [0.22, 1, 0.36, 1],
                  delay: Math.min(index % PAGE, 8) * 0.025,
                }}
                className="relative flex gap-3 pb-5 last:pb-0"
              >
                <span
                  className={cn(
                    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-cream-50",
                    ring,
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[15px] font-semibold leading-snug text-ink">
                    {event.title}
                  </p>
                  {event.detail && (
                    <p className="mt-0.5 text-sm leading-snug text-ink-muted">{event.detail}</p>
                  )}
                  <p className="mt-1 text-xs text-ink-faint">{formatDate(event.date)}</p>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>

      {shown < events.length && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => setShown((current) => current + PAGE)}
        >
          Load more ({events.length - shown} older)
        </Button>
      )}
    </div>
  );
}
