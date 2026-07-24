"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, MoneyInput, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/apiClient";
import { formatMoney, todayISO } from "@/lib/format";
import { useSettings, useSettleUp } from "@/lib/queries";
import type { Balance } from "@/lib/types";

/**
 * Records a repayment from whoever is behind to whoever is ahead.
 *
 * The amount is pre-filled with the whole outstanding balance since that is the
 * usual move; a smaller part-payment is allowed and simply leaves the rest owed.
 */
export function SettleUpDialog({
  open,
  onClose,
  balance,
}: {
  open: boolean;
  onClose: () => void;
  balance: Balance;
}) {
  const toast = useToast();
  const settle = useSettleUp();
  const { data: settings } = useSettings();
  const symbol = settings?.currency_symbol ?? "₨";

  const owed = Number(balance.amount_owed ?? 0);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(balance.amount_owed ?? "");
    setDate(todayISO());
    setNote("");
    setError(null);
  }, [open, balance.amount_owed]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      setError("Enter how much was paid back.");
      return;
    }
    if (value > owed + 0.001) {
      setError(`That is more than is owed — the balance is ${formatMoney(owed, symbol)}.`);
      return;
    }
    setError(null);

    try {
      await settle.mutateAsync({
        amount: String(value),
        settled_on: date,
        note: note.trim() || null,
      });
      toast.success("Settled up. You are square again.");
      onClose();
    } catch (caught) {
      toast.error(
        caught instanceof ApiError ? caught.message : "Could not record this settlement.",
      );
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settle up"
      description="Record money paid back between the two of you."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={settle.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="settle-form" loading={settle.isPending}>
            Record payment
          </Button>
        </>
      }
    >
      <form id="settle-form" onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-pasture-50 px-4 py-3 text-center">
          <span className="text-[15px] font-bold text-ink">{balance.debtor_name ?? "—"}</span>
          <ArrowRight className="h-4 w-4 text-pasture-600" aria-hidden />
          <span className="text-[15px] font-bold text-ink">{balance.creditor_name ?? "—"}</span>
          <span className="w-full text-sm text-ink-muted">
            Outstanding balance {formatMoney(owed, symbol)}
          </span>
        </div>

        <Field
          label="Amount paid"
          required
          error={error}
          hint="Pre-filled with the full balance — lower it for a part payment."
        >
          {(id) => (
            <MoneyInput
              id={id}
              symbol={symbol}
              value={amount}
              max={owed}
              onChange={(event) => setAmount(event.target.value)}
            />
          )}
        </Field>

        <Field label="Date paid" required>
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

        <Field label="Note">
          {(id) => (
            <Textarea
              id={id}
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Cash, bank transfer, EasyPaisa…"
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
