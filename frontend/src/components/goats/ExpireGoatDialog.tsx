"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/apiClient";
import { todayISO } from "@/lib/format";
import { useExpireGoat } from "@/lib/queries";
import type { GoatDetail } from "@/lib/types";

/**
 * Marks a goat as expired.
 *
 * Deliberately not a delete: the goat leaves every active list and picker, but
 * its history and its place in the pedigree stay exactly where they are — its
 * descendants still need it.
 */
export function ExpireGoatDialog({
  open,
  onClose,
  goat,
}: {
  open: boolean;
  onClose: () => void;
  goat: GoatDetail;
}) {
  const toast = useToast();
  const expire = useExpireGoat(goat.id);

  const [date, setDate] = useState(todayISO());
  const [cause, setCause] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDate(goat.expired_on ?? todayISO());
    setCause(goat.death_cause ?? "");
    setError(null);
  }, [open, goat.expired_on, goat.death_cause]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (date > todayISO()) {
      setError("That date is in the future.");
      return;
    }
    setError(null);

    try {
      await expire.mutateAsync({ expired_on: date, death_cause: cause.trim() || null });
      toast.success(`${goat.tag_number} marked as expired.`);
      onClose();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not update this goat.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Mark ${goat.tag_number} as expired`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={expire.isPending}>
            Cancel
          </Button>
          <Button variant="danger" type="submit" form="expire-form" loading={expire.isPending}>
            Mark as expired
          </Button>
        </>
      }
    >
      <form id="expire-form" onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-lg bg-danger-soft px-3.5 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm leading-snug text-danger">
            This goat will leave the active herd, the crossing pickers and every count — but
            its full history and pedigree stay. You can reverse this by editing the goat.
          </p>
        </div>

        <Field label="Date" required error={error}>
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

        <Field label="Cause" hint="Optional — useful when you look back at herd losses.">
          {(id) => (
            <Textarea
              id={id}
              value={cause}
              onChange={(event) => setCause(event.target.value)}
              placeholder="Illness, accident, age…"
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
