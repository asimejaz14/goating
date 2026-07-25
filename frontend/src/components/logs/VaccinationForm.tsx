"use client";

import { useEffect, useId, useState } from "react";

import { GoatPicker } from "@/components/goats/GoatPicker";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Drawer } from "@/components/ui/Drawer";
import { ApiError } from "@/lib/apiClient";
import { todayISO } from "@/lib/format";
import { useCreateVaccination, useVaccineNames } from "@/lib/queries";
import type { GoatSummary } from "@/lib/types";

/**
 * A record of a shot that was given — nothing more.
 *
 * There is no schedule and no "due soon" anywhere in the portal by design: the
 * farm vaccinates on the vet's advice, and a reminder it did not ask for would
 * only be noise.
 */
export function VaccinationForm({
  open,
  onClose,
  goat,
}: {
  open: boolean;
  onClose: () => void;
  /** Pre-selects the goat when opened from a goat's page. */
  goat?: GoatSummary | null;
}) {
  const toast = useToast();
  const create = useCreateVaccination();
  const { data: names } = useVaccineNames();
  const listId = useId();

  const [goatId, setGoatId] = useState<string | null>(null);
  const [goatLabel, setGoatLabel] = useState<string | null>(null);
  const [vaccine, setVaccine] = useState("");
  const [date, setDate] = useState(todayISO());
  const [dose, setDose] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setGoatId(goat?.id ?? null);
    setGoatLabel(goat?.tag_number ?? null);
    setVaccine("");
    setDate(todayISO());
    setDose("");
    setNotes("");
    setErrors({});
  }, [open, goat?.id, goat?.tag_number]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!goatId) next.goat = "Choose which goat was vaccinated.";
    if (!vaccine.trim()) next.vaccine = "Enter the vaccine name.";
    if (date > todayISO()) next.date = "That date is in the future.";
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      await create.mutateAsync({
        goat_id: goatId as string,
        vaccine_name: vaccine.trim(),
        date_administered: date,
        dose: dose.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success("Vaccination logged.");
      onClose();
    } catch (caught) {
      toast.error(
        caught instanceof ApiError ? caught.message : "Could not save this vaccination.",
      );
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Log a vaccination"
      description="Record a shot that has already been given."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="vaccination-form" loading={create.isPending}>
            Save vaccination
          </Button>
        </>
      }
    >
      <form id="vaccination-form" onSubmit={onSubmit} className="space-y-4">
        {!goat && (
          <Field label="Goat" required error={errors.goat}>
            {(id) => (
              <GoatPicker
                id={id}
                value={goatId}
                selectedLabel={goatLabel}
                placeholder="Choose a goat"
                onChange={(picked) => {
                  setGoatId(picked?.id ?? null);
                  setGoatLabel(picked?.tag_number ?? null);
                }}
              />
            )}
          </Field>
        )}

        <Field
          label="Vaccine"
          required
          error={errors.vaccine}
          hint="Start typing — vaccines you have used before will suggest themselves."
        >
          {(id) => (
            <>
              <Input
                id={id}
                list={listId}
                value={vaccine}
                onChange={(event) => setVaccine(event.target.value)}
                placeholder="PPR, Enterotoxaemia, FMD…"
                maxLength={120}
              />
              <datalist id={listId}>
                {(names ?? []).map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date given" required error={errors.date}>
            {(id) => (
              <Input
                id={id}
                type="date"
                value={date}
                max={todayISO()}
                onChange={(event) => setDate(event.target.value)}
              />
            )}
          </Field>

          <Field label="Dose">
            {(id) => (
              <Input
                id={id}
                value={dose}
                onChange={(event) => setDose(event.target.value)}
                placeholder="1 ml"
                maxLength={60}
              />
            )}
          </Field>
        </div>

        <Field label="Notes">
          {(id) => (
            <Textarea
              id={id}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Batch number, who administered it…"
            />
          )}
        </Field>
      </form>
    </Drawer>
  );
}
