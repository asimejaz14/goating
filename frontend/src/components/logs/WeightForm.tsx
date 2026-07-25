"use client";

import { useEffect, useState } from "react";

import { GoatPicker } from "@/components/goats/GoatPicker";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Drawer } from "@/components/ui/Drawer";
import { ApiError } from "@/lib/apiClient";
import { todayISO } from "@/lib/format";
import { useCreateWeight } from "@/lib/queries";
import type { GoatSummary } from "@/lib/types";

export function WeightForm({
  open,
  onClose,
  goat,
}: {
  open: boolean;
  onClose: () => void;
  goat?: GoatSummary | null;
}) {
  const toast = useToast();
  const create = useCreateWeight();

  const [goatId, setGoatId] = useState<string | null>(null);
  const [goatLabel, setGoatLabel] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setGoatId(goat?.id ?? null);
    setGoatLabel(goat?.tag_number ?? null);
    setWeight("");
    setDate(todayISO());
    setNotes("");
    setErrors({});
  }, [open, goat?.id, goat?.tag_number]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!goatId) next.goat = "Choose which goat was weighed.";
    const value = Number(weight);
    if (!weight || Number.isNaN(value) || value <= 0) next.weight = "Enter a weight in kg.";
    else if (value > 200) next.weight = "That looks too heavy for a goat — check the number.";
    if (date > todayISO()) next.date = "That date is in the future.";
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      await create.mutateAsync({
        goat_id: goatId as string,
        weight_kg: weight,
        measured_on: date,
        notes: notes.trim() || null,
      });
      toast.success("Weight recorded.");
      onClose();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not save this weight.");
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Record a weight"
      description="Weights build the growth curve on the goat's page."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="weight-form" loading={create.isPending}>
            Save weight
          </Button>
        </>
      }
    >
      <form id="weight-form" onSubmit={onSubmit} className="space-y-4">
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Weight (kg)" required error={errors.weight}>
            {(id) => (
              <Input
                id={id}
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                placeholder="32.5"
              />
            )}
          </Field>

          <Field label="Measured on" required error={errors.date}>
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
        </div>

        <Field label="Notes">
          {(id) => (
            <Textarea
              id={id}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Before/after weaning, condition score…"
            />
          )}
        </Field>
      </form>
    </Drawer>
  );
}
