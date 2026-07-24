"use client";

import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";

import { GoatPicker } from "@/components/goats/GoatPicker";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/apiClient";
import { formatDate, todayISO } from "@/lib/format";
import { useCreateCrossing, useSettings, useUpdateCrossing } from "@/lib/queries";
import type { Crossing, GoatSummary } from "@/lib/types";

interface CrossingFormProps {
  open: boolean;
  onClose: () => void;
  /** Present when editing an existing crossing. */
  crossing?: Crossing;
  /** Pre-selects the doe when opened from her own page. */
  dam?: GoatSummary | null;
  /** Pre-selects the buck when opened from his page. */
  sire?: GoatSummary | null;
}

/** crossing_date + gestation, shown live so the date makes sense before saving. */
function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function CrossingForm({ open, onClose, crossing, dam, sire }: CrossingFormProps) {
  const editing = Boolean(crossing);
  const { data: settings } = useSettings();
  const toast = useToast();

  const [damId, setDamId] = useState<string | null>(null);
  const [damLabel, setDamLabel] = useState<string | null>(null);
  const [sireId, setSireId] = useState<string | null>(null);
  const [sireLabel, setSireLabel] = useState<string | null>(null);
  const [crossingDate, setCrossingDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useCreateCrossing();
  const update = useUpdateCrossing(crossing?.id ?? "");
  const saving = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    setDamId(crossing?.dam_id ?? dam?.id ?? null);
    setDamLabel(crossing?.dam?.tag_number ?? dam?.tag_number ?? null);
    setSireId(crossing?.sire_id ?? sire?.id ?? null);
    setSireLabel(crossing?.sire?.tag_number ?? sire?.tag_number ?? null);
    setCrossingDate(crossing?.crossing_date ?? todayISO());
    setNotes(crossing?.notes ?? "");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, crossing?.id, dam?.id, sire?.id]);

  const gestation = settings?.gestation_days ?? 150;
  const expected = crossingDate ? addDays(crossingDate, gestation) : "";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!damId) {
      setError("Choose the doe that was crossed.");
      return;
    }
    if (crossingDate > todayISO()) {
      setError("A crossing date cannot be in the future.");
      return;
    }
    setError(null);

    try {
      if (editing) {
        await update.mutateAsync({
          sire_id: sireId,
          crossing_date: crossingDate,
          notes: notes.trim() || null,
        });
        toast.success("Crossing updated.");
      } else {
        await create.mutateAsync({
          dam_id: damId,
          sire_id: sireId,
          crossing_date: crossingDate,
          notes: notes.trim() || null,
        });
        toast.success(`Crossing recorded — kidding expected ${formatDate(expected)}.`);
      }
      onClose();
    } catch (caught) {
      toast.error(
        caught instanceof ApiError ? caught.message : "Could not save this crossing.",
      );
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit crossing" : "Record a crossing"}
      description="Which doe went to which buck, and on what date."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="crossing-form" loading={saving}>
            {editing ? "Save changes" : "Record crossing"}
          </Button>
        </>
      }
    >
      <form id="crossing-form" onSubmit={onSubmit} className="space-y-4">
        <Field label="Doe (mother)" required error={error}>
          {(id) => (
            <GoatPicker
              id={id}
              value={damId}
              selectedLabel={damLabel}
              sex="female"
              placeholder="Choose the doe"
              disabled={editing}
              onChange={(picked) => {
                setDamId(picked?.id ?? null);
                setDamLabel(picked?.tag_number ?? null);
              }}
            />
          )}
        </Field>

        <Field label="Buck (father)" hint="Optional if the sire is not known.">
          {(id) => (
            <GoatPicker
              id={id}
              value={sireId}
              selectedLabel={sireLabel}
              sex="male"
              placeholder="Choose the buck"
              onChange={(picked) => {
                setSireId(picked?.id ?? null);
                setSireLabel(picked?.tag_number ?? null);
              }}
            />
          )}
        </Field>

        <Field label="Crossing date" required>
          {(id) => (
            <Input
              id={id}
              type="date"
              value={crossingDate}
              max={todayISO()}
              onChange={(event) => setCrossingDate(event.target.value)}
            />
          )}
        </Field>

        {expected && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-pasture-50 px-3.5 py-3">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-pasture-600" />
            <p className="text-sm leading-snug text-pasture-800">
              Kidding expected around{" "}
              <span className="font-semibold">{formatDate(expected)}</span>
              <span className="block text-xs text-pasture-700/80">
                {gestation} days after crossing. The real date is entered by hand when she
                kids.
              </span>
            </p>
          </div>
        )}

        <Field label="Notes">
          {(id) => (
            <Textarea
              id={id}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Anything to remember about this mating."
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
