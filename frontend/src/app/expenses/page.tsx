"use client";

import { CalendarRange, Pencil, Plus, Receipt, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { TrendBars } from "@/components/charts/TrendChart";
import { BalanceCard } from "@/components/expenses/BalanceCard";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { useToast } from "@/components/providers/ToastProvider";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, NoResults } from "@/components/ui/EmptyState";
import { FilterBar, type ActiveChip } from "@/components/ui/FilterBar";
import {
  FilterDate,
  FilterMonth,
  FilterNumber,
  FilterSelect,
  SortSelect,
} from "@/components/ui/FilterControls";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton, SkeletonRows } from "@/components/ui/Skeleton";
import { SectionCard, Card } from "@/components/ui/Card";
import { ApiError } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney, formatMonth } from "@/lib/format";
import {
  useBalance,
  useDeleteExpense,
  useExpenseCategories,
  useExpenses,
  useMonthlyExpenses,
  useProfiles,
  useSettings,
} from "@/lib/queries";
import type { Expense } from "@/lib/types";
import { toQueryParams, useFilters } from "@/lib/useFilters";

const PAGE_SIZE = 10;
const HISTORY_MONTHS = 12;

/** "entry"/"entries" — the one plural the shared helper's `+s` rule can't make. */
function entries(count: number): string {
  return count === 1 ? "entry" : "entries";
}

const SORT_OPTIONS = [
  { value: "expense_date:desc", label: "Newest first" },
  { value: "expense_date:asc", label: "Oldest first" },
  { value: "amount:desc", label: "Most expensive" },
  { value: "amount:asc", label: "Cheapest" },
  { value: "name:asc", label: "Name (A–Z)" },
];

/** `YYYY-MM` for today, in local time — `toISOString` would drift near midnight. */
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function ExpensesPage() {
  const filters = useFilters();
  const toast = useToast();
  const seededMonth = useRef(false);

  // Open on this month rather than all time — that is what anyone checking the
  // ledger actually wants. Writing it to the URL (rather than defaulting it in
  // `useFilters`) is deliberate: it shows up as a removable chip, so clearing
  // it really does fall back to all time instead of snapping straight back.
  // The ref keeps it to first arrival, and only when nothing else is filtered.
  useEffect(() => {
    if (seededMonth.current) return;
    seededMonth.current = true;
    if (filters.activeCount === 0) filters.setFilter("month", currentMonth());
    // Deliberately mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: settings } = useSettings();
  const { data: profiles } = useProfiles();
  const { data: categories } = useExpenseCategories();
  const { data: balance } = useBalance();
  const { data: months } = useMonthlyExpenses({ months: HISTORY_MONTHS });
  const remove = useDeleteExpense();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const symbol = settings?.currency_symbol ?? "₨";
  const activeMonth = filters.get("month");

  const params = {
    ...toQueryParams(filters, {
      scalar: [
        "q",
        "month",
        "date_from",
        "date_to",
        "paid_by",
        "category",
        "goat_id",
        "min_amount",
        "max_amount",
      ],
    }),
    page: filters.page,
    page_size: PAGE_SIZE,
    sort_by: filters.sortBy || "expense_date",
    sort_dir: filters.sortDir || "desc",
  };

  const { data, isPending, isFetching, isError, error, refetch } = useExpenses(params);

  const payerName = (id: string) =>
    profiles?.find((profile) => profile.id === id)?.display_name ?? "One partner";

  const chips: ActiveChip[] = [];
  if (filters.get("q")) chips.push({ key: "q", label: `“${filters.get("q")}”` });
  if (activeMonth) chips.push({ key: "month", label: formatMonth(activeMonth) });
  if (filters.get("paid_by"))
    chips.push({ key: "paid_by", label: `Paid by ${payerName(filters.get("paid_by"))}` });
  if (filters.get("category"))
    chips.push({ key: "category", label: filters.get("category") });
  if (filters.get("date_from"))
    chips.push({ key: "date_from", label: `From ${filters.get("date_from")}` });
  if (filters.get("date_to"))
    chips.push({ key: "date_to", label: `To ${filters.get("date_to")}` });
  if (filters.get("min_amount"))
    chips.push({ key: "min_amount", label: `Over ${symbol}${filters.get("min_amount")}` });
  if (filters.get("max_amount"))
    chips.push({ key: "max_amount", label: `Under ${symbol}${filters.get("max_amount")}` });
  if (filters.get("goat_id")) chips.push({ key: "goat_id", label: "One goat" });

  // The API hands back newest-first for the history list; a trend only reads
  // left-to-right, so the chart gets its own reversed copy.
  const trend = [...(months ?? [])]
    .reverse()
    .map((bucket) => ({
      period: bucket.month,
      label: bucket.label,
      value: Number(bucket.total),
    }));

  async function onDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success("Expense deleted.");
      setDeleting(null);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not delete this expense.");
    }
  }

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Every cost the farm carries, split 50/50 between the two of you"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add expense
          </Button>
        }
      />

      <div className="grid gap-3 lg:grid-cols-3">
        {balance ? (
          <BalanceCard balance={balance} symbol={symbol} />
        ) : (
          <Card className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </Card>
        )}

        <SectionCard
          title={`Last ${HISTORY_MONTHS} months`}
          icon={CalendarRange}
          className="lg:col-span-2"
        >
          {months === undefined ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : trend.length === 0 ? (
            <p className="py-10 text-center text-sm text-faint-foreground">
              Nothing spent yet — add your first expense and the trend starts here.
            </p>
          ) : (
            <>
              <TrendBars data={trend} height={190} prefix={symbol} highlightLast />
              {/* Wraps rather than scrolls sideways — a horizontal scroller
                  hid half the months behind an edge nobody thinks to drag. */}
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {(months ?? []).map((bucket) => {
                  const active = activeMonth === bucket.month;
                  return (
                    <li key={bucket.month} className="min-w-0">
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          filters.setFilter("month", active ? undefined : bucket.month)
                        }
                        className={cn(
                          "w-full rounded-lg px-3 py-2 text-left transition-all duration-150",
                          active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "border border-border bg-surface hover:bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "block text-[11px] font-semibold uppercase tracking-wide",
                            active ? "text-primary-foreground/70" : "text-faint-foreground",
                          )}
                        >
                          {bucket.label}
                        </span>
                        <span
                          className={cn(
                            "tnum block text-sm font-bold",
                            active ? "text-primary-foreground" : "text-foreground",
                          )}
                        >
                          {formatMoney(bucket.total, symbol)}
                        </span>
                        <span
                          className={cn(
                            "block text-[11px]",
                            active ? "text-primary-foreground/70" : "text-faint-foreground",
                          )}
                        >
                          {bucket.count} {entries(bucket.count)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-faint-foreground">
                Tap a month to filter the ledger below.
              </p>
            </>
          )}
        </SectionCard>
      </div>

      <div className="mt-4">
        <FilterBar
          filters={filters}
          chips={chips}
          searchPlaceholder="Search expense name or notes…"
          sort={<SortSelect filters={filters} options={SORT_OPTIONS} defaultValue="expense_date:desc" />}
        >
          <FilterMonth filters={filters} filterKey="month" label="Month" />
          <FilterSelect
            filters={filters}
            filterKey="paid_by"
            label="Paid by"
            anyLabel="Either partner"
            options={(profiles ?? []).map((profile) => ({
              value: profile.id,
              label: profile.display_name,
            }))}
          />
          <FilterSelect
            filters={filters}
            filterKey="category"
            label="Category"
            anyLabel="All categories"
            options={(categories ?? []).map((entry) => ({ value: entry, label: entry }))}
          />
          <FilterDate filters={filters} filterKey="date_from" label="Spent after" />
          <FilterDate filters={filters} filterKey="date_to" label="Spent before" />
          <FilterNumber filters={filters} filterKey="min_amount" label={`Min (${symbol})`} />
          <FilterNumber filters={filters} filterKey="max_amount" label={`Max (${symbol})`} />
        </FilterBar>
      </div>

      {data && data.items.length > 0 && (
        <Card className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-faint-foreground">
              {activeMonth && chips.length === 1
                ? formatMonth(activeMonth)
                : chips.length
                  ? "Filtered total"
                  : "All time"}
            </p>
            <p className="tnum text-2xl font-bold leading-tight text-foreground">
              {formatMoney(data.summary.total_amount, symbol)}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {data.summary.per_payer.map((payer) => (
              <div key={payer.user_id}>
                <p className="text-xs text-faint-foreground">{payer.display_name} paid</p>
                <p className="tnum text-sm font-bold text-foreground">
                  {formatMoney(payer.total, symbol)}
                </p>
              </div>
            ))}
          </div>
          <p className="ml-auto text-xs text-faint-foreground">
            {data.summary.count} {entries(data.summary.count)} · half is{" "}
            {formatMoney(Number(data.summary.total_amount) / 2, symbol)} each
          </p>
        </Card>
      )}

      <div className="mt-4">
        {isPending ? (
          <Card>
            <SkeletonRows count={8} />
          </Card>
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : "The ledger did not load."}
            onRetry={() => refetch()}
          />
        ) : data.items.length === 0 ? (
          chips.length ? (
            <NoResults onClear={filters.clearAll} />
          ) : (
            <EmptyState
              icon={Wallet}
              title="No expenses yet"
              message="Add what the farm spends — feed, medicine, labour — and the portal keeps the 50/50 split straight for you."
              action={
                <Button onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add the first expense
                </Button>
              }
            />
          )
        ) : (
          <>
            <Card className="!p-0">
              <ul className="divide-y divide-border">
                {data.items.map((expense) => (
                  <li
                    key={expense.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/70"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Receipt className="h-[18px] w-[18px]" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-foreground">
                        {expense.name}
                      </p>
                      <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-faint-foreground">
                        <span>{formatDate(expense.expense_date)}</span>
                        <span aria-hidden>·</span>
                        <span>{expense.payer_name ?? "Unknown"} paid</span>
                        {expense.goat_id && expense.goat_tag && (
                          <>
                            <span aria-hidden>·</span>
                            <Link
                              href={`/goats/${expense.goat_id}`}
                              className="tnum font-semibold text-primary underline-offset-2 hover:underline"
                            >
                              {expense.goat_tag}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>

                    {expense.category && (
                      <Badge tone="neutral" className="hidden sm:inline-flex">
                        {expense.category}
                      </Badge>
                    )}

                    <span className="tnum shrink-0 text-[15px] font-bold text-foreground">
                      {formatMoney(expense.amount, symbol)}
                    </span>

                    <div className="flex shrink-0 items-center">
                      <IconButton
                        label={`Edit ${expense.name}`}
                        className="h-9 w-9"
                        onClick={() => {
                          setEditing(expense);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label={`Delete ${expense.name}`}
                        className="h-9 w-9 hover:text-danger"
                        onClick={() => setDeleting(expense)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
            <Pagination
              page={data.page}
              pageSize={data.page_size}
              total={data.total}
              totalPages={data.total_pages}
              hasNext={data.has_next}
              hasPrev={data.has_prev}
              onPageChange={filters.setPage}
              loading={isFetching}
            />
          </>
        )}
      </div>

      <ExpenseForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        expense={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={remove.isPending}
        title="Delete this expense?"
        message={
          deleting
            ? `“${deleting.name}” for ${formatMoney(deleting.amount, symbol)} will be removed and the split recalculated.`
            : ""
        }
        confirmLabel="Delete"
      />
    </>
  );
}
