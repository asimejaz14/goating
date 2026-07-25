"use client";

import { Plus, Syringe, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { VaccinationForm } from "@/components/logs/VaccinationForm";
import { useToast } from "@/components/providers/ToastProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, NoResults } from "@/components/ui/EmptyState";
import { FilterBar, type ActiveChip } from "@/components/ui/FilterBar";
import { FilterDate, FilterSelect, SortSelect } from "@/components/ui/FilterControls";
import { GoatPhoto } from "@/components/ui/GoatPhoto";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
import { ApiError } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";
import { useDeleteVaccination, useVaccinations, useVaccineNames } from "@/lib/queries";
import type { Vaccination } from "@/lib/types";
import { toQueryParams, useFilters } from "@/lib/useFilters";

const PAGE_SIZE = 25;

const SORT_OPTIONS = [
  { value: "date_administered:desc", label: "Newest first" },
  { value: "date_administered:asc", label: "Oldest first" },
  { value: "vaccine_name:asc", label: "Vaccine (A–Z)" },
];

export default function VaccinationsPage() {
  const filters = useFilters();
  const toast = useToast();
  const { data: names } = useVaccineNames();
  const remove = useDeleteVaccination();

  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Vaccination | null>(null);

  const params = {
    ...toQueryParams(filters, {
      scalar: ["q", "goat_id", "vaccine_name", "date_from", "date_to"],
    }),
    page: filters.page,
    page_size: PAGE_SIZE,
    sort_by: filters.sortBy || "date_administered",
    sort_dir: filters.sortDir || "desc",
  };

  const { data, isPending, isFetching, isError, error, refetch } = useVaccinations(params);

  const chips: ActiveChip[] = [];
  if (filters.get("q")) chips.push({ key: "q", label: `“${filters.get("q")}”` });
  if (filters.get("vaccine_name"))
    chips.push({ key: "vaccine_name", label: filters.get("vaccine_name") });
  if (filters.get("goat_id")) chips.push({ key: "goat_id", label: "One goat" });
  if (filters.get("date_from"))
    chips.push({ key: "date_from", label: `From ${filters.get("date_from")}` });
  if (filters.get("date_to"))
    chips.push({ key: "date_to", label: `To ${filters.get("date_to")}` });

  async function onDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success("Vaccination removed.");
      setDeleting(null);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not remove this record.");
    }
  }

  return (
    <>
      <PageHeader
        title="Vaccinations"
        subtitle={
          data
            ? `${data.total} ${data.total === 1 ? "shot" : "shots"} logged`
            : "A record of every shot given — nothing to chase, nothing due"
        }
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Log vaccination
          </Button>
        }
      />

      <FilterBar
        filters={filters}
        chips={chips}
        searchPlaceholder="Search vaccine or notes…"
        sort={
          <SortSelect
            filters={filters}
            options={SORT_OPTIONS}
            defaultValue="date_administered:desc"
          />
        }
      >
        <FilterSelect
          filters={filters}
          filterKey="vaccine_name"
          label="Vaccine"
          anyLabel="All vaccines"
          options={(names ?? []).map((name) => ({ value: name, label: name }))}
        />
        <FilterDate filters={filters} filterKey="date_from" label="Given after" />
        <FilterDate filters={filters} filterKey="date_to" label="Given before" />
      </FilterBar>

      <div className="mt-4">
        {isPending ? (
          <Card>
            <SkeletonRows count={8} />
          </Card>
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : "The log did not load."}
            onRetry={() => refetch()}
          />
        ) : data.items.length === 0 ? (
          chips.length ? (
            <NoResults onClear={filters.clearAll} />
          ) : (
            <EmptyState
              icon={Syringe}
              title="Nothing logged yet"
              message="Record shots as you give them. This is a plain log — the portal never nags you about due dates."
              action={
                <Button onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Log the first vaccination
                </Button>
              }
            />
          )
        ) : (
          <>
            <Card className="!p-0">
              <ul className="divide-y divide-border">
                {data.items.map((record) => (
                  <li
                    key={record.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/70"
                  >
                    {record.goat ? (
                      <Link
                        href={`/goats/${record.goat.id}`}
                        className="flex min-w-0 shrink-0 items-center gap-2"
                      >
                        <GoatPhoto
                          src={record.goat.photo_url}
                          alt=""
                          size={36}
                          rounded="rounded-md"
                        />
                        <span className="tnum hidden text-sm font-bold text-foreground sm:block">
                          {record.goat.tag_number}
                        </span>
                      </Link>
                    ) : (
                      <span className="h-9 w-9 shrink-0 rounded-md bg-muted" />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-foreground">
                        {record.vaccine_name}
                      </p>
                      <p className="truncate text-xs text-faint-foreground">
                        <span className="tnum sm:hidden">
                          {record.goat?.tag_number ?? "—"} ·{" "}
                        </span>
                        {formatDate(record.date_administered)}
                        {record.dose ? ` · ${record.dose}` : ""}
                        {record.notes ? ` · ${record.notes}` : ""}
                      </p>
                    </div>

                    <IconButton
                      label={`Delete ${record.vaccine_name} record`}
                      className="shrink-0 hover:text-danger"
                      onClick={() => setDeleting(record)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
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

      <VaccinationForm open={formOpen} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={remove.isPending}
        title="Remove this vaccination?"
        message={
          deleting
            ? `${deleting.vaccine_name} on ${formatDate(deleting.date_administered)} will be deleted from the log.`
            : ""
        }
        confirmLabel="Remove"
      />
    </>
  );
}
