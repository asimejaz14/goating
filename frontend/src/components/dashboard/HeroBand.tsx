"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, CalendarClock, Heart } from "lucide-react";
import Link from "next/link";

import { CountUp } from "@/components/ui/StatCard";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { DashboardCards, UpcomingKidding } from "@/lib/types";

/**
 * The one thing on the page with real weight.
 *
 * A dashboard of six equally sized cards has no focal point — the eye lands
 * nowhere and the whole screen reads as a settings page. This band answers
 * the only question worth asking on arrival ("how is the herd?") at a size
 * nothing else competes with, and every other panel below it is then free to
 * be quiet.
 *
 * It stays dark in both themes on purpose. It is the one deliberate accent
 * surface in the product, and a light version would just be another white
 * card in a column of white cards.
 */
export function HeroBand({
  greeting,
  name,
  cards,
  nextKidding,
}: {
  greeting: string;
  name?: string;
  cards: DashboardCards;
  nextKidding?: UpcomingKidding;
}) {
  const reduce = useReducedMotion();
  const does = cards.does;
  const bucks = cards.bucks;
  const total = cards.total_goats || 1;

  return (
    <motion.section
      initial={{ opacity: 0, transform: "translateY(10px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
      className="hero px-5 py-6 text-white sm:px-8 sm:py-8"
    >
      <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-white/70">
            {greeting}
            {name ? `, ${name}` : ""}
          </p>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-[52px] font-semibold leading-none tracking-tight sm:text-[64px]">
              <CountUp value={cards.total_goats} />
            </h1>
            <span className="text-[15px] font-medium text-white/70">
              goats in the herd
            </span>
          </div>

          {/* One bar carrying the whole sex split — a donut for two values is
              a chart where a line would do. */}
          <div className="mt-5 max-w-md">
            {/* Each segment holds its final width and grows along its own axis
                with a scale, which the compositor can do — animating `width`
                would relayout the row on every frame. The transform origin is
                the left edge so both segments unroll from the same side. */}
            <div className="flex h-2 overflow-hidden rounded-full bg-white/15">
              <motion.div
                style={{ width: `${(does / total) * 100}%`, transformOrigin: "left" }}
                initial={reduce ? false : { transform: "scaleX(0)" }}
                animate={{ transform: "scaleX(1)" }}
                transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70"
              />
              <motion.div
                style={{ width: `${(bucks / total) * 100}%`, transformOrigin: "left" }}
                initial={reduce ? false : { transform: "scaleX(0)" }}
                animate={{ transform: "scaleX(1)" }}
                transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1], delay: 0.18 }}
                className="h-full rounded-full bg-white/45"
              />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px]">
              <Legend swatch="bg-accent" label="Does" value={does} />
              <Legend swatch="bg-white/45" label="Bucks" value={bucks} />
              <Legend swatch="bg-white/20" label="Kids under 6mo" value={cards.kids_under_6_months} />
            </div>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3 lg:w-[19rem]">
          <HeroTile
            href="/crossings?status=pregnant"
            icon={Heart}
            value={cards.pregnant_now}
            label="Expecting"
          />
          <HeroTile
            href="/crossings?status=pregnant&sort_by=expected_kidding_date&sort_dir=asc"
            icon={CalendarClock}
            value={cards.due_next_30_days}
            label="Due in 30 days"
          />
          {nextKidding && (
            <Link
              href={`/goats/${nextKidding.goat_id}`}
              className="group col-span-2 rounded-xl bg-white/[0.07] p-3 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.12]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">
                Next kidding
              </p>
              <p className="tnum mt-1 flex items-center gap-1.5 text-[15px] font-semibold">
                {nextKidding.tag_number}
                <ArrowUpRight className="h-3.5 w-3.5 text-white/50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </p>
              <p className="mt-0.5 text-[12px] text-white/60">
                {nextKidding.is_overdue
                  ? `${Math.abs(nextKidding.days_remaining)} days overdue`
                  : `in ${nextKidding.days_remaining} days`}{" "}
                · {formatDate(nextKidding.expected_kidding_date)}
              </p>
            </Link>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function Legend({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5 text-white/70">
      <span className={cn("h-2 w-2 rounded-full", swatch)} aria-hidden />
      {label}
      <span className="tnum font-semibold text-white">{value}</span>
    </span>
  );
}

function HeroTile({
  href,
  icon: Icon,
  value,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl bg-white/[0.07] p-3 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.12]"
    >
      <Icon className="h-4 w-4 text-white/60 transition-transform duration-300 group-hover:scale-110" />
      <p className="tnum mt-2 text-[26px] font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[11.5px] text-white/60">{label}</p>
    </Link>
  );
}
