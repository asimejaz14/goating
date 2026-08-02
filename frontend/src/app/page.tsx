"use client";

import {
  Baby,
  BarChart3,
  CalendarClock,
  ChevronRight,
  LineChart,
  PieChart,
  ShoppingBag,
  Trophy,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { DonutChart } from "@/components/charts/DonutChart";
import { TrendBars, TrendLine } from "@/components/charts/TrendChart";
import { HeroBand } from "@/components/dashboard/HeroBand";
import { BalanceCard } from "@/components/expenses/BalanceCard";
import { Badge } from "@/components/ui/Badge";
import { Card, SectionCard } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/EmptyState";
import { GoatIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/cn";
import { formatCountdown, formatDate, plural } from "@/lib/format";
import { useDashboard, useMe } from "@/lib/queries";

/** Greets by time of day — the portal gets opened at the shed, morning and dusk. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The change across a series, for the pill on a stat card.
 *
 * Returns nothing when the window is too short to compare or when the change
 * is not worth a badge — a card claiming "+0" over a flat year is noise
 * dressed up as insight.
 */
function changeOver(
  values: number[],
  label: string,
  window = values.length,
  goodWhenUp = true,
): { value: number; label: string; goodWhenUp: boolean } | undefined {
  if (values.length < 2) return undefined;
  const recent = values.slice(-window);
  const change = Math.round((recent.at(-1) ?? 0) - (recent[0] ?? 0));
  if (change === 0) return undefined;
  return { value: change, label, goodWhenUp };
}

/** A muted trailing link used throughout — consistent iconography instead of "→". */
function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-0.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const { data, isPending, isError, error, refetch } = useDashboard();

  if (isError) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <ErrorState
          message={error instanceof Error ? error.message : "The dashboard did not load."}
          onRetry={() => refetch()}
        />
      </>
    );
  }

  if (isPending) return <DashboardSkeleton />;

  const { cards, balance, currency_symbol: symbol } = data;
  const firstName = me?.display_name?.split(" ")[0];

  // Every series below is already in the payload — the cards just read the
  // shape of what the charts further down plot in full.
  const herdSeries = data.herd_growth.map((point) => point.value);
  const birthSeries = data.births_per_month.map((point) => point.value);
  const spendSeries = data.monthly_expenses.map((point) => point.value);

  return (
    <>
      <HeroBand
        greeting={greeting()}
        name={firstName}
        cards={cards}
        nextKidding={data.upcoming_kiddings[0]}
      />

      <div className="mt-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Goats in the herd"
            value={cards.total_goats}
            icon={GoatIcon}
            index={0}
            hint={`${cards.does} ${plural(cards.does, "doe")} · ${cards.bucks} ${plural(cards.bucks, "buck")}`}
            onClick={() => router.push("/goats")}
            trend={herdSeries}
            delta={changeOver(herdSeries, "over 12 months")}
          />
          <StatCard
            label="Kids born this year"
            value={cards.kids_born_this_year}
            icon={Baby}
            index={1}
            hint={`${cards.kids_under_6_months} under 6 months`}
            onClick={() => router.push("/goats?acquisition_type=bred")}
            trend={birthSeries}
          />
          <StatCard
            label="Monthly spend"
            value={`${symbol}${Math.round(spendSeries.at(-1) ?? 0).toLocaleString()}`}
            icon={Wallet}
            index={2}
            hint="This month, before the split"
            onClick={() => router.push("/expenses")}
            trend={spendSeries}
            /* Deliberately no change pill. The current month is still being
               filled in, so measuring it against a completed one reports a
               collapse every time the calendar turns over. */
          />
          <StatCard
            label="Bought from market"
            value={cards.purchased_count}
            icon={ShoppingBag}
            index={3}
            hint={`${cards.bred_count} born on the farm`}
            onClick={() => router.push("/goats?acquisition_type=purchased")}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard
            title="Kidding countdown"
            icon={CalendarClock}
            className="lg:col-span-2"
            action={
              <SectionLink href="/crossings?status=pregnant&sort_by=expected_kidding_date&sort_dir=asc">
                All crossings
              </SectionLink>
            }
          >
            {data.upcoming_kiddings.length === 0 ? (
              <p className="py-6 text-center text-sm text-faint-foreground">
                No does are expecting right now. Record a crossing and the countdown starts
                on its own.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.upcoming_kiddings.map((kidding) => (
                  <li key={kidding.crossing_id} className="flex items-center gap-3 py-2.5">
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md",
                        kidding.is_overdue
                          ? "bg-danger-soft text-danger-soft-foreground"
                          : "bg-warning-soft text-warning-soft-foreground",
                      )}
                    >
                      <span className="tnum text-sm font-bold leading-none">
                        {Math.abs(kidding.days_remaining)}
                      </span>
                      <span className="text-[9px] font-semibold uppercase leading-none">
                        {kidding.is_overdue ? "late" : "days"}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/goats/${kidding.goat_id}`}
                        className="tnum truncate text-[15px] font-semibold text-foreground underline-offset-2 hover:underline"
                      >
                        {kidding.tag_number}
                      </Link>
                      <p className="truncate text-xs text-faint-foreground">
                        {kidding.name ? `${kidding.name} · ` : ""}
                        due {formatDate(kidding.expected_kidding_date)}
                      </p>
                    </div>
                    <Badge tone={kidding.is_overdue ? "danger" : "warning"}>
                      {formatCountdown(kidding.days_remaining)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <BalanceCard balance={balance} symbol={symbol} index={1} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            title="Herd growth"
            description="Active goats at the end of each month"
            icon={LineChart}
          >
            <TrendLine
              data={data.herd_growth}
              emptyMessage="Add goats to the herd and this fills in month by month."
            />
          </SectionCard>

          <SectionCard
            title="Kids born per month"
            description="Counted from each kid's date of birth"
            icon={BarChart3}
          >
            <TrendBars
              data={data.births_per_month}
              emptyMessage="No kids recorded in the last twelve months. Register a kidding and the months start filling in."
            />
          </SectionCard>

          <SectionCard title="Breeds" description="The active herd by breed" icon={PieChart}>
            <DonutChart data={data.breed_distribution} />
          </SectionCard>

          <SectionCard
            title="Most productive does"
            icon={Trophy}
            action={<SectionLink href="/goats?sex=female">All does</SectionLink>}
          >
            {data.top_does.length === 0 ? (
              <p className="py-8 text-center text-sm text-faint-foreground">
                Once kids are registered and linked to their mothers, the leaderboard fills
                itself in.
              </p>
            ) : (
              <ol className="space-y-2">
                {data.top_does.map((doe, index) => {
                  const most = data.top_does[0].kids || 1;
                  return (
                    <li key={doe.goat_id} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          index === 0
                            ? "bg-warning-soft text-warning-soft-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/goats/${doe.goat_id}`}
                          className="tnum truncate text-sm font-semibold text-foreground underline-offset-2 hover:underline"
                        >
                          {doe.tag_number}
                        </Link>
                        {doe.name && (
                          <span className="ml-1.5 truncate text-xs text-faint-foreground">
                            {doe.name}
                          </span>
                        )}
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.round((doe.kids / most) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="tnum shrink-0 text-sm font-bold text-foreground">
                        {doe.kids}
                        <span className="ml-1 text-xs font-medium text-faint-foreground">
                          {plural(doe.kids, "kid")}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </SectionCard>

          <SectionCard
            title="Monthly spend"
            description="Everything the farm spent, before the 50/50 split"
            icon={Wallet}
            /* Runs the full width: the sex split moved into the hero, which
               leaves an odd number of panels, and a half-width card stranded
               beside a gap is the one arrangement worse than either. */
            className="lg:col-span-2"
            action={<SectionLink href="/expenses">Ledger</SectionLink>}
          >
            <TrendBars
              data={data.monthly_expenses}
              prefix={symbol}
              highlightLast
              emptyMessage="Log an expense and the monthly trend builds itself."
            />
          </SectionCard>
        </div>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} index={index} className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-lg lg:col-span-2" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    </>
  );
}
