"use client";

import {
  Baby,
  BarChart3,
  CalendarClock,
  Heart,
  LineChart,
  PieChart,
  ShoppingBag,
  Sprout,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { DonutChart } from "@/components/charts/DonutChart";
import { TrendBars, TrendLine } from "@/components/charts/TrendChart";
import { BalanceCard } from "@/components/expenses/BalanceCard";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, SectionCard } from "@/components/ui/Card";
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

  return (
    <>
      <PageHeader
        title={firstName ? `${greeting()}, ${firstName}` : greeting()}
        subtitle="Everything the farm is doing right now, at a glance"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Goats in the herd"
          value={cards.total_goats}
          icon={Users}
          index={0}
          hint={`${cards.does} ${plural(cards.does, "doe")} · ${cards.bucks} ${plural(cards.bucks, "buck")}`}
          onClick={() => router.push("/goats")}
        />
        <StatCard
          label="Expecting now"
          value={cards.pregnant_now}
          icon={Heart}
          emphasis
          index={1}
          hint={
            cards.due_next_30_days
              ? `${cards.due_next_30_days} due in 30 days`
              : "None due within 30 days"
          }
          onClick={() => router.push("/crossings?status=pregnant")}
        />
        <StatCard
          label="Kids born this year"
          value={cards.kids_born_this_year}
          icon={Baby}
          index={2}
          hint={`${cards.kids_under_6_months} under 6 months`}
          onClick={() => router.push("/goats?acquisition_type=bred")}
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

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <SectionCard
          title="Kidding countdown"
          icon={CalendarClock}
          className="lg:col-span-2"
          action={
            <Link
              href="/crossings?status=pregnant&sort_by=expected_kidding_date&sort_dir=asc"
              className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              All crossings →
            </Link>
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
                        ? "bg-danger-soft text-danger"
                        : "bg-primary-soft text-primary",
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
                      className="tnum truncate text-[15px] font-bold text-foreground underline-offset-2 hover:underline"
                    >
                      {kidding.tag_number}
                    </Link>
                    <p className="truncate text-xs text-faint-foreground">
                      {kidding.name ? `${kidding.name} · ` : ""}
                      due {formatDate(kidding.expected_kidding_date)}
                    </p>
                  </div>
                  <Badge tone={kidding.is_overdue ? "danger" : "primary"}>
                    {formatCountdown(kidding.days_remaining)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <BalanceCard balance={balance} symbol={symbol} index={1} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <SectionCard title="Herd growth" icon={LineChart}>
          <TrendLine data={data.herd_growth} />
          <p className="mt-2 text-xs text-faint-foreground">
            Active goats at the end of each month.
          </p>
        </SectionCard>

        <SectionCard title="Kids born per month" icon={BarChart3}>
          <TrendBars data={data.births_per_month} />
          <p className="mt-2 text-xs text-faint-foreground">
            Counted from each kid&rsquo;s date of birth.
          </p>
        </SectionCard>

        <SectionCard title="Does and bucks" icon={PieChart}>
          <DonutChart data={data.sex_distribution} />
        </SectionCard>

        <SectionCard title="Breeds" icon={PieChart}>
          <DonutChart data={data.breed_distribution} />
        </SectionCard>

        <SectionCard
          title="Most productive does"
          icon={Trophy}
          action={
            <Link
              href="/goats?sex=female"
              className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              All does →
            </Link>
          }
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
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/goats/${doe.goat_id}`}
                        className="tnum truncate text-sm font-bold text-foreground underline-offset-2 hover:underline"
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
          icon={Sprout}
          action={
            <Link
              href="/expenses"
              className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Ledger →
            </Link>
          }
        >
          <TrendBars
            data={data.monthly_expenses}

            prefix={symbol}
            highlightLast
          />
          <p className="mt-2 text-xs text-faint-foreground">
            Everything the farm spent, before the 50/50 split.
          </p>
        </SectionCard>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} index={index} className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </Card>
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-lg lg:col-span-2" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-64 rounded-lg" />
        ))}
      </div>
    </>
  );
}
