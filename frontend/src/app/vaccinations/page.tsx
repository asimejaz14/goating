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
import { Table, TableBody, TableHead, TableSkeletonRows, Td, Th, Tr } from "@/components/ui/Table";
import { ApiError } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";
import { useDeleteVaccination, useVaccinations, useVaccineNames } from "@/lib/queries";
import type { Vaccination } from "@/lib/types";
import { toQueryParams, useFilters } from "@/lib/useFilters";

const PAGE_SIZE = 10;

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
        {isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : "The log did not load."}
            onRetry={() => refetch()}
          />
        ) : isPending ? (
          <Table>
            <TableHead>
              <Th>Goat</Th>
              <Th>Vaccine</Th>
              <Th className="hidden lg:table-cell">Notes</Th>
              <Th>Date</Th>
              <Th className="w-px" />
            </TableHead>
            <TableBody>
              <TableSkeletonRows columns={5} rows={PAGE_SIZE} />
            </TableBody>
          </Table>
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
            <Table>
              <TableHead>
                <Th>Goat</Th>
                <Th>Vaccine</Th>
                <Th className="hidden lg:table-cell">Notes</Th>
                <Th>Date</Th>
                <Th className="w-px" />
              </TableHead>
              <TableBody>
                {data.items.map((record) => (
                  <Tr key={record.id}>
                    <Td>
                      {record.goat ? (
                        <Link
                          href={`/goats/${record.goat.id}`}
                          className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-70"
                        >
                          <GoatPhoto
                            src={record.goat.photo_url}
                            alt=""
                            size={28}
                            rounded="rounded-sm"
                            className="hidden sm:block"
                          />
                          <span className="tnum truncate text-[13px] font-semibold text-foreground">
                            {record.goat.tag_number}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-faint-foreground">—</span>
                      )}
                    </Td>
                    <Td>
                      <p className="truncate text-[13.5px] font-semibold text-foreground">
                        {record.vaccine_name}
                      </p>
                      {record.dose && (
                        <p className="truncate text-xs text-faint-foreground">{record.dose}</p>
                      )}
                    </Td>
                    <Td className="hidden max-w-xs truncate text-muted-foreground lg:table-cell">
                      {record.notes || "—"}
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {formatDate(record.date_administered)}
                    </Td>
                    <Td className="!px-2">
                      <div className="flex items-center justify-end">
                        <IconButton
                          label={`Delete ${record.vaccine_name} record`}
                          size="sm"
                          className="hover:text-danger"
                          onClick={() => setDeleting(record)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </Td>
                  </Tr>
                ))}
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
