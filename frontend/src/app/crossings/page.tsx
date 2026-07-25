"use client";

import { CalendarClock, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";

import { CrossingForm } from "@/components/crossings/CrossingForm";
import { RecordKiddingForm } from "@/components/crossings/RecordKiddingForm";
import { GoatForm } from "@/components/goats/GoatForm";
import { useToast } from "@/components/providers/ToastProvider";
import { Badge, CrossingBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, NoResults } from "@/components/ui/EmptyState";
import { FilterBar, type ActiveChip } from "@/components/ui/FilterBar";
import { FilterChipGroup, FilterDate, FilterNumber, SortSelect } from "@/components/ui/FilterControls";
import { GoatPhoto } from "@/components/ui/GoatPhoto";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { RowMenu } from "@/components/ui/RowMenu";
import { Table, TableBody, TableHead, TableSkeletonRows, Td, Th, Tr } from "@/components/ui/Table";
import { ApiError } from "@/lib/apiClient";
import { formatCountdown, formatDate, plural, titleCase } from "@/lib/format";
import { useCrossings, useDeleteCrossing } from "@/lib/queries";
import type { Crossing } from "@/lib/types";
import { toQueryParams, useFilters } from "@/lib/useFilters";
import Link from "next/link";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "pregnant", label: "Expecting" },
  { value: "kidded", label: "Kidded" },
  { value: "aborted", label: "Aborted" },
  { value: "failed", label: "Not settled" },
];

const STATUS_LABELS: Record<string, string> = {
  pregnant: "Expecting",
  kidded: "Kidded",
  aborted: "Aborted",
  failed: "Not settled",
};

const SORT_OPTIONS = [
  { value: "crossing_date:desc", label: "Newest crossing" },
  { value: "crossing_date:asc", label: "Oldest crossing" },
  { value: "expected_kidding_date:asc", label: "Due soonest" },
  { value: "actual_kidding_date:desc", label: "Most recent kidding" },
  { value: "number_of_kids:desc", label: "Most kids" },
];

export default function CrossingsPage() {
  const filters = useFilters();
  const toast = useToast();
  const remove = useDeleteCrossing();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Crossing | null>(null);
  const [kidding, setKidding] = useState<Crossing | null>(null);
  const [addKidTo, setAddKidTo] = useState<Crossing | null>(null);
  const [deleting, setDeleting] = useState<Crossing | null>(null);

  const params = {
    ...toQueryParams(filters, {
      scalar: [
        "q",
        "dam_id",
        "sire_id",
        "goat_id",
        "crossing_date_from",
        "crossing_date_to",
        "expected_kidding_from",
        "expected_kidding_to",
        "due_within_days",
        "year",
      ],
      list: ["status"],
    }),
    page: filters.page,
    page_size: PAGE_SIZE,
    sort_by: filters.sortBy || "crossing_date",
    sort_dir: filters.sortDir || "desc",
  };

  const { data, isPending, isFetching, isError, error, refetch } = useCrossings(params);

  const chips: ActiveChip[] = [];
  if (filters.get("q")) chips.push({ key: "q", label: `“${filters.get("q")}”` });
  for (const value of filters.getAll("status")) {
    chips.push({ key: "status", value, label: STATUS_LABELS[value] ?? titleCase(value) });
  }
  if (filters.get("due_within_days"))
    chips.push({ key: "due_within_days", label: `Due within ${filters.get("due_within_days")} days` });
  if (filters.get("crossing_date_from"))
    chips.push({ key: "crossing_date_from", label: `Crossed from ${filters.get("crossing_date_from")}` });
  if (filters.get("crossing_date_to"))
    chips.push({ key: "crossing_date_to", label: `Crossed to ${filters.get("crossing_date_to")}` });
  if (filters.get("expected_kidding_from"))
    chips.push({ key: "expected_kidding_from", label: `Due from ${filters.get("expected_kidding_from")}` });
  if (filters.get("expected_kidding_to"))
    chips.push({ key: "expected_kidding_to", label: `Due to ${filters.get("expected_kidding_to")}` });
  if (filters.get("year")) chips.push({ key: "year", label: `Year ${filters.get("year")}` });
  if (filters.get("dam_id")) chips.push({ key: "dam_id", label: "One doe" });
  if (filters.get("sire_id")) chips.push({ key: "sire_id", label: "One buck" });
  if (filters.get("goat_id")) chips.push({ key: "goat_id", label: "One goat" });

  const hasFilters = chips.length > 0;

  async function onDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success("Crossing deleted.");
      setDeleting(null);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not delete this crossing.");
    }
  }

  return (
    <>
      <PageHeader
        title="Crossings"
        subtitle={
          data
            ? `${data.total} ${data.total === 1 ? "crossing" : "crossings"} on record`
            : "Every mating, from crossing date to kids on the ground"
        }
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Record crossing
          </Button>
        }
      />

      <FilterBar
        filters={filters}
        chips={chips}
        searchPlaceholder="Search by tag number or notes…"
        sort={<SortSelect filters={filters} options={SORT_OPTIONS} defaultValue="crossing_date:desc" />}
        more={
          <>
            <FilterNumber filters={filters} filterKey="due_within_days" label="Due within (days)" />
            <FilterNumber filters={filters} filterKey="year" label="Year" />
            <FilterDate filters={filters} filterKey="crossing_date_from" label="Crossed after" />
            <FilterDate filters={filters} filterKey="crossing_date_to" label="Crossed before" />
            <FilterDate filters={filters} filterKey="expected_kidding_from" label="Due after" />
            <FilterDate filters={filters} filterKey="expected_kidding_to" label="Due before" />
          </>
        }
      >
        <FilterChipGroup filters={filters} filterKey="status" label="Status" options={STATUS_OPTIONS} />
      </FilterBar>

      <div className="mt-4">
        {isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : "The crossings did not load."}
            onRetry={() => refetch()}
          />
        ) : isPending ? (
          <Table>
            <TableHead>
              <Th>Crossing</Th>
              <Th className="hidden sm:table-cell">Crossed</Th>
              <Th>Kidding</Th>
              <Th>Status</Th>
              <Th className="hidden lg:table-cell" align="right">
                Kids
              </Th>
              <Th className="w-px" />
            </TableHead>
            <TableBody>
              <TableSkeletonRows columns={6} rows={PAGE_SIZE} />
            </TableBody>
          </Table>
        ) : data.items.length === 0 ? (
          hasFilters ? (
            <NoResults onClear={filters.clearAll} />
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No crossings yet"
              message="Record which doe went to which buck and the kidding countdown starts on its own — 150 days from the crossing date."
              action={
                <Button onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Record the first crossing
                </Button>
              }
            />
          )
        ) : (
          <>
            <Table>
              <TableHead>
                <Th>Crossing</Th>
                <Th className="hidden sm:table-cell">Crossed</Th>
                <Th>Kidding</Th>
                <Th>Status</Th>
                <Th className="hidden lg:table-cell" align="right">
                  Kids
                </Th>
                <Th className="w-px" />
              </TableHead>
              <TableBody>
                {data.items.map((crossing) => {
                  const kids = crossing.number_of_kids ?? 0;
                  const missing = Math.max(0, kids - crossing.kids_registered);
                  const pregnant = crossing.status === "pregnant";

                  return (
                    <Tr key={crossing.id}>
                      <Td>
                        <div className="flex min-w-0 items-center gap-1.5">
                          <GoatCell goat={crossing.dam} fallback="Unknown doe" />
                          <span className="shrink-0 text-xs text-faint-foreground">×</span>
                          <GoatCell goat={crossing.sire} fallback="Unknown buck" />
                        </div>
                      </Td>
                      <Td className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                        {formatDate(crossing.crossing_date)}
                      </Td>
                      <Td
                        className={
                          crossing.actual_kidding_date
                            ? "whitespace-nowrap text-foreground"
                            : "whitespace-nowrap text-muted-foreground"
                        }
                      >
                        {formatDate(crossing.actual_kidding_date ?? crossing.expected_kidding_date)}
                      </Td>
                      <Td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <CrossingBadge status={crossing.status} />
                          {pregnant && (
                            <Badge tone={crossing.is_overdue ? "danger" : "warning"}>
                              <CalendarClock className="h-3.5 w-3.5" />
                              {formatCountdown(crossing.days_remaining)}
                            </Badge>
                          )}
                        </div>
                      </Td>
                      <Td className="hidden lg:table-cell tnum" align="right">
                        {crossing.status === "kidded" && kids > 0 ? `${kids} ${plural(kids, "kid")}` : "—"}
                      </Td>
                      <Td className="!px-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {pregnant && (
                            <Button size="sm" variant="secondary" onClick={() => setKidding(crossing)}>
                              Record kidding
                            </Button>
                          )}
                          {crossing.status === "kidded" && missing > 0 && (
                            <Button size="sm" variant="secondary" onClick={() => setAddKidTo(crossing)}>
                              <Plus className="h-4 w-4" />
                              Register {missing}
                            </Button>
                          )}
                          <RowMenu
                            label="Crossing actions"
                            items={[
                              {
                                label: "Edit",
                                icon: Pencil,
                                onClick: () => {
                                  setEditing(crossing);
                                  setFormOpen(true);
                                },
                              },
                              {
                                label: "Delete",
                                icon: Trash2,
                                danger: true,
                                onClick: () => setDeleting(crossing),
                              },
                            ]}
                          />
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </TableBody>
            </Table>
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

      <CrossingForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        crossing={editing ?? undefined}
      />

      {kidding && (
        <RecordKiddingForm
          open
          crossing={kidding}
          onClose={() => setKidding(null)}
          onRecorded={() => {
            // Straight from "she kidded" into registering the kids, which is
            // what the farmer is standing there ready to do.
            setAddKidTo(kidding);
          }}
        />
      )}

      {/* Registering a kid off a crossing pre-fills both parents and the
          crossing link, so the pedigree connects with no extra taps. */}
      {addKidTo && (
        <GoatForm
          open
          onClose={() => setAddKidTo(null)}
          defaults={{
            dam_id: addKidTo.dam_id,
            sire_id: addKidTo.sire_id,
            crossing_id: addKidTo.id,
            acquisition_type: "bred",
            date_of_birth: addKidTo.actual_kidding_date ?? undefined,
            breed_id: addKidTo.dam?.breed_id,
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={remove.isPending}
        title="Delete this crossing?"
        message="The crossing and its kidding record go away. Kids already registered keep their parent links."
        confirmLabel="Delete crossing"
      />
    </>
  );
}

function GoatCell({ goat, fallback }: { goat: Crossing["dam"]; fallback: string }) {
  if (!goat) {
    return <span className="truncate text-[13px] text-faint-foreground">{fallback}</span>;
  }
  return (
    <Link
      href={`/goats/${goat.id}`}
      className="flex min-w-0 items-center gap-1.5 rounded-md transition-opacity hover:opacity-70"
    >
      <GoatPhoto src={goat.photo_url} alt="" size={24} rounded="rounded-sm" className="hidden sm:block" />
      <span className="tnum truncate text-[13px] font-semibold text-foreground">{goat.tag_number}</span>
    </Link>
  );
}
