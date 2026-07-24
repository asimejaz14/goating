"use client";

import { useEffect, useState } from "react";

import { GoatPicker } from "@/components/goats/GoatPicker";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/apiClient";
import { todayISO } from "@/lib/format";
import { useCreateHealthRecord } from "@/lib/queries";
import type { GoatSummary, HealthRecordType } from "@/lib/types";

export const HEALTH_TYPES: Array<{ value: HealthRecordType; label: string }> = [
  { value: "illness", label: "Illness" },
  { value: "treatment", label: "Treatment" },
  { value: "deworming", label: "Deworming" },
  { value: "checkup", label: "Check-up" },
];

export function HealthRecordForm({
  open,
  onClose,
  goat,
}: {
  open: boolean;
  onClose: () => void;
  goat?: GoatSummary | null;
}) {
  const toast = useToast();
  const create = useCreateHealthRecord();

  const [goatId, setGoatId] = useState<string | null>(null);
  const [goatLabel, setGoatLabel] = useState<string | null>(null);
  const [type, setType] = useState<HealthRecordType>("treatment");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [medication, setMedication] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setGoatId(goat?.id ?? null);
    setGoatLabel(goat?.tag_number ?? null);
    setType("treatment");
    setDate(todayISO());
    setDescription("");
    setMedication("");
    setNotes("");
    setErrors({});
  }, [open, goat?.id, goat?.tag_number]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!goatId) next.goat = "Choose which goat this is about.";
    if (!description.trim()) next.description = "Describe what happened.";
    if (date > todayISO()) next.date = "That date is in the future.";
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      await create.mutateAsync({
        goat_id: goatId as string,
        record_date: date,
        type,
        description: description.trim(),
        medication: medication.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success("Health record saved.");
      onClose();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not save this record.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a health record"
      description="Illnesses, treatments, dewormings and check-ups."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="health-form" loading={create.isPending}>
            Save record
          </Button>
        </>
      }
    >
      <form id="health-form" onSubmit={onSubmit} className="space-y-4">
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
          <Field label="Type" required>
            {(id) => (
              <Select
                id={id}
                value={type}
                onChange={(event) => setType(event.target.value as HealthRecordType)}
              >
                {HEALTH_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Date" required error={errors.date}>
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

        <Field label="What happened?" required error={errors.description}>
          {(id) => (
            <Textarea
              id={id}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Off feed for two days, treated by the vet…"
            />
          )}
        </Field>

        <Field label="Medication">
          {(id) => (
            <Input
              id={id}
              value={medication}
              onChange={(event) => setMedication(event.target.value)}
              placeholder="Oxytetracycline 5 ml"
              maxLength={160}
            />
          )}
        </Field>

        <Field label="Notes">
          {(id) => (
            <Textarea
              id={id}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Follow-up date, how she responded…"
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
