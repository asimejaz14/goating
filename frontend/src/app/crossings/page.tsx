"use client";

import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";

import { CrossingCard } from "@/components/crossings/CrossingCard";
import { CrossingForm } from "@/components/crossings/CrossingForm";
import { RecordKiddingForm } from "@/components/crossings/RecordKiddingForm";
import { GoatForm } from "@/components/goats/GoatForm";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, NoResults } from "@/components/ui/EmptyState";
import { FilterBar, type ActiveChip } from "@/components/ui/FilterBar";
import {
  FilterChipGroup,
  FilterDate,
  FilterNumber,
  SortSelect,
} from "@/components/ui/FilterControls";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { SkeletonCardGrid } from "@/components/ui/Skeleton";
import { ApiError } from "@/lib/apiClient";
import { titleCase } from "@/lib/format";
import { useCrossings, useDeleteCrossing } from "@/lib/queries";
import type { Crossing } from "@/lib/types";
import { toQueryParams, useFilters } from "@/lib/useFilters";

const PAGE_SIZE = 18;

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
    chips.push({
      key: "due_within_days",
      label: `Due within ${filters.get("due_within_days")} days`,
    });
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

  async function onDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success("Crossing deleted.");
      setDeleting(null);
    } catch (caught) {
      toast.error(
        caught instanceof ApiError ? caught.message : "Could not delete this crossing.",
      );
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
      >
        <FilterChipGroup
          filters={filters}
          filterKey="status"
          label="Status"
          options={STATUS_OPTIONS}
        />
        <FilterNumber
          filters={filters}
          filterKey="due_within_days"
          label="Due within (days)"
        />
        <FilterNumber filters={filters} filterKey="year" label="Year" />
        <FilterDate filters={filters} filterKey="crossing_date_from" label="Crossed after" />
        <FilterDate filters={filters} filterKey="crossing_date_to" label="Crossed before" />
        <FilterDate filters={filters} filterKey="expected_kidding_from" label="Due after" />
        <FilterDate filters={filters} filterKey="expected_kidding_to" label="Due before" />
      </FilterBar>

      <div className="mt-4">
        {isPending ? (
          <SkeletonCardGrid count={6} />
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : "The crossings did not load."}
            onRetry={() => refetch()}
          />
        ) : data.items.length === 0 ? (
          chips.length ? (
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.items.map((crossing, index) => (
                <CrossingCard
                  key={crossing.id}
                  crossing={crossing}
                  index={index}
                  onRecordKidding={setKidding}
                  onAddKid={setAddKidTo}
                  onEdit={(item) => {
                    setEditing(item);
                    setFormOpen(true);
                  }}
                  onDelete={setDeleting}
                />
              ))}
            </div>
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
