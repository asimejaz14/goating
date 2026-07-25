"use client";

import { Baby, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Drawer } from "@/components/ui/Drawer";
import { ApiError } from "@/lib/apiClient";
import { formatDate, plural, todayISO } from "@/lib/format";
import { useRecordKidding } from "@/lib/queries";
import type { Crossing } from "@/lib/types";

/**
 * Closes out a pregnancy with the dates that actually happened.
 *
 * The expected date is only ever an estimate — she kids when she kids — so the
 * real date is typed in, and the kids themselves are registered afterwards with
 * their own birth dates.
 */
export function RecordKiddingForm({
  open,
  onClose,
  crossing,
  onRecorded,
}: {
  open: boolean;
  onClose: () => void;
  crossing: Crossing;
  /** Lets the caller offer "register the kids now". */
  onRecorded?: (kids: number) => void;
}) {
  const toast = useToast();
  const record = useRecordKidding(crossing.id);

  const [date, setDate] = useState(todayISO());
  const [kids, setKids] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDate(crossing.actual_kidding_date ?? todayISO());
    setKids(crossing.number_of_kids ?? 1);
    setNotes("");
    setError(null);
  }, [open, crossing.actual_kidding_date, crossing.number_of_kids]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!date) {
      setError("Enter the date she kidded.");
      return;
    }
    if (date < crossing.crossing_date) {
      setError("The kidding date cannot be before the crossing date.");
      return;
    }
    if (date > todayISO()) {
      setError("The kidding date cannot be in the future.");
      return;
    }
    setError(null);

    try {
      await record.mutateAsync({
        actual_kidding_date: date,
        number_of_kids: kids,
        notes: notes.trim() || null,
      });
      toast.success(`Kidding recorded — ${kids} ${plural(kids, "kid")}.`);
      onRecorded?.(kids);
      onClose();
    } catch (caught) {
      toast.error(
        caught instanceof ApiError ? caught.message : "Could not record this kidding.",
      );
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Record the kidding"
      description={`${crossing.dam?.tag_number ?? "This doe"} — crossed ${formatDate(
        crossing.crossing_date,
      )}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={record.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="kidding-form" loading={record.isPending}>
            Save kidding
          </Button>
        </>
      }
    >
      <form id="kidding-form" onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-lg bg-muted px-3.5 py-3">
          <Baby className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm leading-snug text-muted-foreground">
            Expected around{" "}
            <span className="font-semibold text-foreground">
              {formatDate(crossing.expected_kidding_date)}
            </span>
            . Enter the day she actually kidded — they rarely match exactly.
          </p>
        </div>

        <Field label="Actual kidding date" required error={error}>
          {(id) => (
            <Input
              id={id}
              type="date"
              value={date}
              min={crossing.crossing_date}
              max={todayISO()}
              onChange={(event) => setDate(event.target.value)}
            />
          )}
        </Field>

        <Field label="How many kids?" hint="Count every kid born, including any that did not survive.">
          {(id) => (
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                aria-label="One fewer kid"
                onClick={() => setKids((current) => Math.max(0, current - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id={id}
                type="number"
                min={0}
                max={10}
                value={kids}
                onChange={(event) => setKids(Math.max(0, Number(event.target.value) || 0))}
                className="tnum w-20 text-center"
              />
              <Button
                variant="secondary"
                size="sm"
                aria-label="One more kid"
                onClick={() => setKids((current) => Math.min(10, current + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Field>

        <Field label="Notes">
          {(id) => (
            <Textarea
              id={id}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="How the kidding went, anything the vet said…"
            />
          )}
        </Field>
      </form>
    </Drawer>
  );
}
