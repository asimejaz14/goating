"use client";

import { Plus, Users } from "lucide-react";
import { useState } from "react";

import { GoatCard } from "@/components/goats/GoatCard";
import { GoatForm } from "@/components/goats/GoatForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, NoResults } from "@/components/ui/EmptyState";
import { FilterBar, type ActiveChip } from "@/components/ui/FilterBar";
import {
  FilterChipGroup,
  FilterDate,
  FilterNumber,
  FilterSelect,
  SortSelect,
} from "@/components/ui/FilterControls";
import { Pagination } from "@/components/ui/Pagination";
import { SkeletonCardGrid } from "@/components/ui/Skeleton";
import { useBreeds, useGoats } from "@/lib/queries";
import { titleCase } from "@/lib/format";
import { toQueryParams, useFilters } from "@/lib/useFilters";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
  { value: "expired", label: "Expired" },
];

const SORT_OPTIONS = [
  { value: "tag_number:asc", label: "Tag number (A–Z)" },
  { value: "tag_number:desc", label: "Tag number (Z–A)" },
  { value: "date_of_birth:desc", label: "Youngest first" },
  { value: "date_of_birth:asc", label: "Oldest first" },
  { value: "created_at:desc", label: "Recently added" },
  { value: "name:asc", label: "Name (A–Z)" },
];

export default function GoatsPage() {
  const filters = useFilters({ status: ["active"] });
  const { data: breeds } = useBreeds();
  const [formOpen, setFormOpen] = useState(false);

  // The backend already defaults to active-only; sending it explicitly keeps
  // the chip row honest about what the user is looking at.
  const status = filters.getAll("status");

  const params = {
    ...toQueryParams(filters, {
      scalar: [
        "q",
        "breed_id",
        "sex",
        "acquisition_type",
        "is_pregnant",
        "dob_from",
        "dob_to",
        "age_min_months",
        "age_max_months",
        "has_photo",
        "has_parents",
        "dam_id",
        "sire_id",
      ],
      list: ["status"],
    }),
    status: status.length ? status : ["active"],
    page: filters.page,
    page_size: PAGE_SIZE,
    sort_by: filters.sortBy || "tag_number",
    sort_dir: filters.sortDir || "asc",
  };

  const { data, isPending, isFetching, isError, error, refetch } = useGoats(params);

  const chips: ActiveChip[] = [];
  const breedName = (id: string) => breeds?.find((breed) => breed.id === id)?.name ?? "Breed";
  if (filters.get("q")) chips.push({ key: "q", label: `“${filters.get("q")}”` });
  if (filters.get("breed_id"))
    chips.push({ key: "breed_id", label: breedName(filters.get("breed_id")) });
  if (filters.get("sex"))
    chips.push({ key: "sex", label: filters.get("sex") === "female" ? "Does" : "Bucks" });
  for (const value of status) {
    chips.push({ key: "status", value, label: titleCase(value) });
  }
  if (filters.get("acquisition_type"))
    chips.push({
      key: "acquisition_type",
      label: filters.get("acquisition_type") === "bred" ? "Born here" : "Purchased",
    });
  if (filters.get("is_pregnant"))
    chips.push({
      key: "is_pregnant",
      label: filters.get("is_pregnant") === "true" ? "Expecting" : "Not expecting",
    });
  if (filters.get("has_parents"))
    chips.push({
      key: "has_parents",
      label: filters.get("has_parents") === "false" ? "Missing parents" : "Parents linked",
    });
  if (filters.get("has_photo"))
    chips.push({
      key: "has_photo",
      label: filters.get("has_photo") === "true" ? "Has photo" : "No photo",
    });
  if (filters.get("dob_from")) chips.push({ key: "dob_from", label: `Born from ${filters.get("dob_from")}` });
  if (filters.get("dob_to")) chips.push({ key: "dob_to", label: `Born to ${filters.get("dob_to")}` });
  if (filters.get("age_min_months"))
    chips.push({ key: "age_min_months", label: `${filters.get("age_min_months")} mo+` });
  if (filters.get("age_max_months"))
    chips.push({ key: "age_max_months", label: `up to ${filters.get("age_max_months")} mo` });

  const hasFilters = chips.length > 0;

  const controls = (
    <>
      <FilterChipGroup
        filters={filters}
        filterKey="status"
        label="Status"
        options={STATUS_OPTIONS}
        defaults={["active"]}
      />
      <FilterSelect
        filters={filters}
        filterKey="breed_id"
        label="Breed"
        anyLabel="All breeds"
        options={(breeds ?? []).map((breed) => ({ value: breed.id, label: breed.name }))}
      />
      <FilterSelect
        filters={filters}
        filterKey="sex"
        label="Sex"
        anyLabel="Does and bucks"
        options={[
          { value: "female", label: "Does" },
          { value: "male", label: "Bucks" },
        ]}
      />
      <FilterSelect
        filters={filters}
        filterKey="acquisition_type"
        label="Origin"
        anyLabel="Any origin"
        options={[
          { value: "bred", label: "Born here" },
          { value: "purchased", label: "Purchased" },
        ]}
      />
      <FilterSelect
        filters={filters}
        filterKey="is_pregnant"
        label="Pregnancy"
        anyLabel="Any"
        options={[
          { value: "true", label: "Expecting now" },
          { value: "false", label: "Not expecting" },
        ]}
      />
      <FilterSelect
        filters={filters}
        filterKey="has_parents"
        label="Pedigree"
        anyLabel="Any"
        options={[
          { value: "false", label: "Missing a parent" },
          { value: "true", label: "Both parents linked" },
        ]}
      />
      <FilterNumber filters={filters} filterKey="age_min_months" label="Min age (months)" />
      <FilterNumber filters={filters} filterKey="age_max_months" label="Max age (months)" />
      <FilterDate filters={filters} filterKey="dob_from" label="Born after" />
      <FilterDate filters={filters} filterKey="dob_to" label="Born before" />
    </>
  );

  return (
    <>
      <PageHeader
        title="The herd"
        subtitle={
          data ? `${data.total} ${data.total === 1 ? "goat" : "goats"} match` : "Every goat on the farm"
        }
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add goat
          </Button>
        }
      />

      <FilterBar
        filters={filters}
        chips={chips}
        searchPlaceholder="Search tag number or name…"
        sort={<SortSelect filters={filters} options={SORT_OPTIONS} defaultValue="tag_number:asc" />}
      >
        {controls}
      </FilterBar>

      <div className="mt-4">
        {isPending ? (
          <SkeletonCardGrid count={8} />
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : "The herd list did not load."}
            onRetry={() => refetch()}
          />
        ) : data.items.length === 0 ? (
          hasFilters ? (
            <NoResults onClear={filters.clearAll} />
          ) : (
            <EmptyState
              icon={Users}
              title="No goats yet"
              message="Add your first goat and the portal takes it from there — tag numbers, pedigree and history all build themselves as you go."
              action={
                <Button onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add the first goat
                </Button>
              }
            />
          )
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.map((goat, index) => (
                <GoatCard key={goat.id} goat={goat} index={index} />
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

      <GoatForm open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  );
}
