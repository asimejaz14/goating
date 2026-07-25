"use client";

import { AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Baby,
  Banknote,
  CalendarClock,
  ChevronRight,
  GitBranch,
  HeartPulse,
  History,
  Pencil,
  Plus,
  Scale,
  Skull,
  Sparkles,
  Syringe,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { WeightChart } from "@/components/charts/WeightChart";
import { CrossingForm } from "@/components/crossings/CrossingForm";
import { RecordKiddingForm } from "@/components/crossings/RecordKiddingForm";
import { ExpireGoatDialog } from "@/components/goats/ExpireGoatDialog";
import { GoatForm } from "@/components/goats/GoatForm";
import { LinkParentsDialog } from "@/components/goats/LinkParentsDialog";
import { Timeline } from "@/components/goats/Timeline";
import { HealthRecordForm } from "@/components/logs/HealthRecordForm";
import { VaccinationForm } from "@/components/logs/VaccinationForm";
import { WeightForm } from "@/components/logs/WeightForm";
import { useToast } from "@/components/providers/ToastProvider";
import { PedigreeTree } from "@/components/tree/PedigreeTree";
import {
  AcquisitionBadge,
  Badge,
  CrossingBadge,
  SexBadge,
  StatusBadge,
} from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/EmptyState";
import { GoatPhoto } from "@/components/ui/GoatPhoto";
import { SectionCard, Card } from "@/components/ui/Card";
import { Skeleton, SkeletonRows } from "@/components/ui/Skeleton";
import { ApiError } from "@/lib/apiClient";
import {
  formatAge,
  formatCountdown,
  formatDate,
  formatMoney,
  plural,
  titleCase,
} from "@/lib/format";
import { useDeleteGoat, useGoatHistory, useSettings } from "@/lib/queries";
import type { Crossing, GoatSummary } from "@/lib/types";

/** Which modal is open — only ever one at a time. */
type Dialog =
  | null
  | "edit"
  | "parents"
  | "crossing"
  | "vaccination"
  | "weight"
  | "health"
  | "expire"
  | "delete";

export default function GoatDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const toast = useToast();

  const { data, isPending, isError, error, refetch } = useGoatHistory(id);
  const { data: settings } = useSettings();
  const remove = useDeleteGoat();

  const [dialog, setDialog] = useState<Dialog>(null);
  const [kidding, setKidding] = useState<Crossing | null>(null);
  const close = () => setDialog(null);

  const currency = settings?.currency_symbol ?? "₨";

  if (isPending) return <DetailSkeleton />;

  if (isError) {
    return (
      <>
        <BackLink />
        <ErrorState
          message={
            error instanceof ApiError && error.status === 404
              ? "That goat is not in the herd — it may have been removed."
              : "This goat's history did not load."
          }
          onRetry={() => refetch()}
        />
      </>
    );
  }

  const { goat } = data;
  const summary: GoatSummary = goat;
  const isExpired = goat.status === "expired";
  const parentsKnown = Number(Boolean(goat.dam)) + Number(Boolean(goat.sire));

  async function onDelete() {
    try {
      await remove.mutateAsync(id);
      toast.success(`${goat.tag_number} removed.`);
      router.push("/goats");
    } catch (caught) {
      toast.error(
        caught instanceof ApiError
          ? caught.message
          : "Could not remove this goat. Mark it expired instead to keep its history.",
      );
      close();
    }
  }

  return (
    <>
      <BackLink />

      {/* ---------------------------------------------------------------- */}
      {/* Profile                                                           */}
      {/* ---------------------------------------------------------------- */}
      <Card className="overflow-hidden !p-0">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
          <GoatPhoto
            src={goat.photo_url}
            alt={goat.name ? `${goat.name}, ${goat.tag_number}` : goat.tag_number}
            size={112}
            className="mx-auto sm:mx-0"
            priority
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="tnum text-2xl font-bold leading-tight tracking-tight text-foreground">
                {goat.tag_number}
              </h1>
              <SexBadge sex={goat.sex} />
              {goat.status !== "active" && <StatusBadge status={goat.status} />}
              {goat.is_pregnant && <Badge tone="primary">Expecting</Badge>}
            </div>

            {goat.name && (
              <p className="mt-0.5 text-lg font-semibold text-muted-foreground">{goat.name}</p>
            )}

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
              <Fact label="Breed" value={goat.breed_name ?? "—"} />
              <Fact label="Age" value={formatAge(goat.age_months)} />
              <Fact
                label="Born"
                value={goat.date_of_birth ? formatDate(goat.date_of_birth) : "Not recorded"}
              />
              {goat.color && <Fact label="Colour" value={goat.color} />}
              <Fact label="Kids" value={String(data.kids_total)} />
              <Fact label="Crossings" value={String(data.crossings_total)} />
            </dl>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <AcquisitionBadge type={goat.acquisition_type} />
              {goat.acquisition_type === "purchased" && goat.purchase_price && (
                <Badge tone="outline">
                  {formatMoney(goat.purchase_price, currency)}
                  {goat.purchased_from ? ` · ${goat.purchased_from}` : ""}
                </Badge>
              )}
              {isExpired && goat.expired_on && (
                <Badge tone="neutral">Expired {formatDate(goat.expired_on)}</Badge>
              )}
            </div>

            {goat.notes && (
              <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm leading-relaxed text-muted-foreground">
                {goat.notes}
              </p>
            )}
          </div>
        </div>

        {/* Quick actions. Expired goats keep their history but take no new
            records, so the log actions disappear rather than fail on save. */}
        <div className="flex flex-wrap gap-2 border-t border-border bg-muted/60 px-4 py-3 sm:px-5">
          <Button size="sm" variant="secondary" onClick={() => setDialog("edit")}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDialog("parents")}>
            <GitBranch className="h-4 w-4" />
            Link parents
          </Button>
          {!isExpired && (
            <>
              {goat.sex === "female" && (
                <Button size="sm" variant="secondary" onClick={() => setDialog("crossing")}>
                  <Sparkles className="h-4 w-4" />
                  Record crossing
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setDialog("vaccination")}>
                <Syringe className="h-4 w-4" />
                Vaccination
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setDialog("weight")}>
                <Scale className="h-4 w-4" />
                Weight
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setDialog("health")}>
                <HeartPulse className="h-4 w-4" />
                Health
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDialog("expire")}>
                <Skull className="h-4 w-4" />
                Mark expired
              </Button>
            </>
          )}
          <IconButton
            label="Delete this goat"
            className="ml-auto text-faint-foreground hover:text-danger"
            onClick={() => setDialog("delete")}
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {/* -------------------------------------------------------------- */}
        {/* Parents & pedigree                                              */}
        {/* -------------------------------------------------------------- */}
        <SectionCard
          title="Parents & pedigree"
          icon={GitBranch}
          action={
            <Link
              href={`/pedigree?goat=${goat.id}`}
              className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Full tree →
            </Link>
          }
        >
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <ParentTile label="Mother" goat={goat.dam} onLink={() => setDialog("parents")} />
            <ParentTile label="Father" goat={goat.sire} onLink={() => setDialog("parents")} />
          </div>

          {parentsKnown === 0 ? (
            <p className="rounded-md bg-muted px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
              No parents linked yet. Link them and the tree behind this goat builds itself
              from what the portal already knows.
            </p>
          ) : (
            <PedigreeTree root={data.pedigree} generations={3} size="compact" rootId={goat.id} />
          )}
        </SectionCard>

        {/* -------------------------------------------------------------- */}
        {/* Crossings                                                       */}
        {/* -------------------------------------------------------------- */}
        <SectionCard
          title="Crossing history"
          icon={Sparkles}
          action={
            data.crossings_total > data.crossings.length ? (
              <ViewAll href={`/crossings?${goat.sex === "female" ? "dam_id" : "sire_id"}=${goat.id}`} />
            ) : undefined
          }
        >
          {data.crossings.length === 0 ? (
            <Hint>
              {goat.sex === "female"
                ? "No crossings recorded. Record one and the kidding countdown starts automatically."
                : "This buck has not been recorded on a crossing yet."}
            </Hint>
          ) : (
            <ul className="space-y-2.5">
              {data.crossings.map((crossing) => {
                const partner =
                  goat.sex === "female" ? crossing.sire : crossing.dam;
                return (
                  <li
                    key={crossing.id}
                    className="rounded-lg border border-border bg-surface px-3.5 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {goat.sex === "female" ? "Crossed with " : "Crossed to "}
                        {partner ? (
                          <Link
                            href={`/goats/${partner.id}`}
                            className="tnum text-primary underline-offset-2 hover:underline"
                          >
                            {partner.tag_number}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">an unrecorded goat</span>
                        )}
                      </p>
                      <CrossingBadge status={crossing.status} />
                    </div>

                    <p className="mt-1 text-xs text-faint-foreground">
                      {formatDate(crossing.crossing_date)}
                      {crossing.actual_kidding_date
                        ? ` → kidded ${formatDate(crossing.actual_kidding_date)}`
                        : ` → expected ${formatDate(crossing.expected_kidding_date)}`}
                    </p>

                    {crossing.status === "pregnant" ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone={crossing.is_overdue ? "danger" : "primary"}>
                          <CalendarClock className="h-3.5 w-3.5" />
                          {formatCountdown(crossing.days_remaining)}
                        </Badge>
                        {!isExpired && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setKidding(crossing)}
                          >
                            Record kidding
                          </Button>
                        )}
                      </div>
                    ) : (
                      crossing.number_of_kids !== null && (
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          {crossing.number_of_kids}{" "}
                          {plural(crossing.number_of_kids, "kid")}
                          {crossing.kids_registered < crossing.number_of_kids && (
                            <span className="text-faint-foreground">
                              {" "}
                              · {crossing.kids_registered} registered in the portal
                            </span>
                          )}
                        </p>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        {/* -------------------------------------------------------------- */}
        {/* Kids                                                            */}
        {/* -------------------------------------------------------------- */}
        <SectionCard
          title={`Kids (${data.kids_total})`}
          icon={Baby}
          action={
            data.kids_total > data.kids.length ? (
              <ViewAll
                href={`/goats?${goat.sex === "female" ? "dam_id" : "sire_id"}=${goat.id}&status=active&status=sold&status=expired`}
              />
            ) : undefined
          }
        >
          {data.kids.length === 0 ? (
            <Hint>
              No kids linked yet. Add each kid to the herd, then link it to its mother and
              father — that is what fills in this list.
            </Hint>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.kids.map((kid) => (
                <li key={kid.id}>
                  <Link
                    href={`/goats/${kid.id}`}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5 transition-shadow hover:shadow-sm"
                  >
                    <GoatPhoto src={kid.photo_url} alt="" size={40} rounded="rounded-md" />
                    <span className="min-w-0 flex-1">
                      <span className="tnum block truncate text-sm font-bold text-foreground">
                        {kid.tag_number}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {kid.name ? `${kid.name} · ` : ""}
                        {formatAge(kid.age_months)}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-faint-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* -------------------------------------------------------------- */}
        {/* Vaccinations                                                    */}
        {/* -------------------------------------------------------------- */}
        <SectionCard
          title={`Vaccinations (${data.vaccinations_total})`}
          icon={Syringe}
          action={
            data.vaccinations_total > data.vaccinations.length ? (
              <ViewAll href={`/vaccinations?goat_id=${goat.id}`} />
            ) : undefined
          }
        >
          {data.vaccinations.length === 0 ? (
            <Hint>No vaccinations logged for this goat yet.</Hint>
          ) : (
            <ul className="divide-y divide-border">
              {data.vaccinations.map((vaccination) => (
                <li key={vaccination.id} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {vaccination.vaccine_name}
                    </p>
                    {vaccination.dose && (
                      <p className="text-xs text-faint-foreground">{vaccination.dose}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(vaccination.date_administered)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* -------------------------------------------------------------- */}
        {/* Weights                                                         */}
        {/* -------------------------------------------------------------- */}
        <SectionCard
          title="Weight & growth"
          icon={Scale}
          action={
            data.weights_total > data.weights.length ? (
              <ViewAll href={`/goats/${goat.id}`} label={`${data.weights_total} recorded`} />
            ) : undefined
          }
        >
          {data.weights.length === 0 ? (
            <Hint>No weights recorded. Two or more build a growth curve here.</Hint>
          ) : (
            <>
              {data.weights.length >= 2 && <WeightChart weights={data.weights} />}
              <ul className="mt-2 divide-y divide-border">
                {data.weights.map((weight) => (
                  <li key={weight.id} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <p className="tnum text-sm font-semibold text-foreground">{weight.weight_kg} kg</p>
                    <p className="text-xs text-muted-foreground">{formatDate(weight.measured_on)}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SectionCard>

        {/* -------------------------------------------------------------- */}
        {/* Health                                                          */}
        {/* -------------------------------------------------------------- */}
        <SectionCard title={`Health records (${data.health_records_total})`} icon={HeartPulse}>
          {data.health_records.length === 0 ? (
            <Hint>Nothing logged — a healthy record is a good record.</Hint>
          ) : (
            <ul className="space-y-2.5">
              {data.health_records.map((record) => (
                <li
                  key={record.id}
                  className="rounded-lg border border-border bg-surface px-3.5 py-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone={record.type === "illness" ? "danger" : "neutral"}>
                      {titleCase(record.type)}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{formatDate(record.record_date)}</p>
                  </div>
                  <p className="mt-1.5 text-sm leading-snug text-foreground">{record.description}</p>
                  {record.medication && (
                    <p className="mt-0.5 text-xs text-faint-foreground">{record.medication}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* -------------------------------------------------------------- */}
        {/* Expenses                                                        */}
        {/* -------------------------------------------------------------- */}
        <SectionCard
          title="Linked expenses"
          icon={Banknote}
          action={
            data.expenses_total > data.expenses.length ? (
              <ViewAll href={`/expenses?goat_id=${goat.id}`} />
            ) : undefined
          }
        >
          {data.expenses.length === 0 ? (
            <Hint>No expenses tagged to this goat yet.</Hint>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                <span className="tnum text-lg font-bold text-foreground">
                  {formatMoney(data.expenses_amount, currency)}
                </span>{" "}
                across {data.expenses_total} {plural(data.expenses_total, "entry", "ies")}
              </p>
              <ul className="divide-y divide-border">
                {data.expenses.map((expense) => (
                  <li key={expense.id} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{expense.name}</p>
                      <p className="text-xs text-faint-foreground">
                        {formatDate(expense.expense_date)}
                        {expense.payer_name ? ` · paid by ${expense.payer_name}` : ""}
                      </p>
                    </div>
                    <p className="tnum shrink-0 text-sm font-semibold text-foreground">
                      {formatMoney(expense.amount, currency)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SectionCard>

        {/* -------------------------------------------------------------- */}
        {/* Timeline                                                        */}
        {/* -------------------------------------------------------------- */}
        <SectionCard title="Life timeline" icon={History} className="xl:col-span-2">
          {data.timeline.length === 0 ? (
            <Hint>Nothing has happened yet — records you add will appear here in order.</Hint>
          ) : (
            <Timeline events={data.timeline} />
          )}
        </SectionCard>
      </div>

      {/* Dialogs ---------------------------------------------------------- */}
      <GoatForm open={dialog === "edit"} onClose={close} goat={goat} />
      <LinkParentsDialog open={dialog === "parents"} onClose={close} goat={goat} />
      <CrossingForm
        open={dialog === "crossing"}
        onClose={close}
        dam={goat.sex === "female" ? summary : null}
        sire={goat.sex === "male" ? summary : null}
      />
      <VaccinationForm open={dialog === "vaccination"} onClose={close} goat={summary} />
      <WeightForm open={dialog === "weight"} onClose={close} goat={summary} />
      <HealthRecordForm open={dialog === "health"} onClose={close} goat={summary} />
      <ExpireGoatDialog open={dialog === "expire"} onClose={close} goat={goat} />
      <ConfirmDialog
        open={dialog === "delete"}
        onClose={close}
        onConfirm={onDelete}
        loading={remove.isPending}
        title={`Delete ${goat.tag_number}?`}
        message="This erases the goat and everything logged against it. If the goat has died, mark it as expired instead — that keeps its history and its place in the pedigree."
        confirmLabel="Delete permanently"
      />

      <AnimatePresence>
        {kidding && (
          <RecordKiddingForm
            open
            crossing={kidding}
            onClose={() => setKidding(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function BackLink() {
  return (
    <Link
      href="/goats"
      className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to the herd
    </Link>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-faint-foreground">
        {label}
      </dt>
      <dd className="truncate text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>;
}

function ViewAll({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="shrink-0 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {label} →
    </Link>
  );
}

function ParentTile({
  label,
  goat,
  onLink,
}: {
  label: string;
  goat: GoatSummary | null;
  onLink: () => void;
}) {
  if (!goat) {
    return (
      <button
        type="button"
        onClick={onLink}
        className="flex min-h-[60px] items-center gap-2.5 rounded-lg border border-dashed border-border bg-muted/60 px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary-soft"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-faint-foreground">
          <Plus className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-faint-foreground">
            {label}
          </span>
          <span className="block truncate text-sm font-semibold text-muted-foreground">
            Link a parent
          </span>
        </span>
      </button>
    );
  }

  return (
    <Link
      href={`/goats/${goat.id}`}
      className="flex min-h-[60px] items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5 transition-shadow hover:shadow-sm"
    >
      <GoatPhoto src={goat.photo_url} alt="" size={36} rounded="rounded-md" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-faint-foreground">
          {label}
        </span>
        <span className="tnum block truncate text-sm font-bold text-foreground">
          {goat.tag_number}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-faint-foreground" />
    </Link>
  );
}

function DetailSkeleton() {
  return (
    <>
      <Skeleton className="mb-3 h-5 w-32" />
      <div className="card">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Skeleton className="mx-auto h-28 w-28 rounded-lg sm:mx-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
            <SkeletonRows count={2} />
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="card space-y-3">
            <Skeleton className="h-5 w-40" />
            <SkeletonRows count={3} />
          </div>
        ))}
      </div>
    </>
  );
}
