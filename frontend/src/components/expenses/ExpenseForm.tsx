"use client";

import { useEffect, useId, useState } from "react";

import { GoatPicker } from "@/components/goats/GoatPicker";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, MoneyInput, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/apiClient";
import { todayISO } from "@/lib/format";
import {
  useCreateExpense,
  useExpenseCategories,
  useMe,
  useProfiles,
  useSettings,
  useUpdateExpense,
} from "@/lib/queries";
import type { Expense } from "@/lib/types";

/**
 * Add or edit a shared farm cost.
 *
 * The payer defaults to whoever is signed in, because that is right almost
 * every time — but it stays changeable for the evening when one partner enters
 * a receipt the other paid.
 */
export function ExpenseForm({
  open,
  onClose,
  expense,
}: {
  open: boolean;
  onClose: () => void;
  expense?: Expense | null;
}) {
  const toast = useToast();
  const editing = Boolean(expense);

  const { data: me } = useMe();
  const { data: profiles } = useProfiles();
  const { data: settings } = useSettings();
  const { data: categories } = useExpenseCategories();

  const create = useCreateExpense();
  const update = useUpdateExpense(expense?.id ?? "");
  const saving = create.isPending || update.isPending;
  const listId = useId();

  const [date, setDate] = useState(todayISO());
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [category, setCategory] = useState("");
  const [goatId, setGoatId] = useState<string | null>(null);
  const [goatLabel, setGoatLabel] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setDate(expense?.expense_date ?? todayISO());
    setName(expense?.name ?? "");
    setAmount(expense?.amount ?? "");
    setPaidBy(expense?.paid_by ?? me?.id ?? "");
    setCategory(expense?.category ?? "");
    setGoatId(expense?.goat_id ?? null);
    setGoatLabel(expense?.goat_tag ?? null);
    setNotes(expense?.notes ?? "");
    setErrors({});
  }, [open, expense, me?.id]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Give the expense a name.";
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      next.amount = "Enter how much it cost.";
    }
    if (date > todayISO()) next.date = "That date is in the future.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      expense_date: date,
      name: name.trim(),
      amount: String(value),
      paid_by: paidBy || null,
      goat_id: goatId,
      category: category.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      if (editing) {
        await update.mutateAsync(payload);
        toast.success("Expense updated.");
      } else {
        await create.mutateAsync(payload);
        toast.success("Expense added — the split is up to date.");
      }
      onClose();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not save this expense.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit expense" : "Add an expense"}
      description="Every cost is split down the middle between the two of you."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form" loading={saving}>
            {editing ? "Save changes" : "Add expense"}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={onSubmit} className="space-y-4">
        <Field label="What was it for?" required error={errors.name}>
          {(id) => (
            <Input
              id={id}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Feed sacks, vet visit, fencing wire…"
              maxLength={160}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cost" required error={errors.amount}>
            {(id) => (
              <MoneyInput
                id={id}
                symbol={settings?.currency_symbol ?? "₨"}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
              />
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

        <Field
          label="Paid by"
          hint="Set to you by default — change it if your partner paid."
        >
          {(id) => (
            <Select
              id={id}
              value={paidBy}
              onChange={(event) => setPaidBy(event.target.value)}
            >
              {(profiles ?? []).map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.display_name}
                  {profile.id === me?.id ? " (you)" : ""}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Category"
          hint="Optional — used to group the ledger. Past categories suggest themselves."
        >
          {(id) => (
            <>
              <Input
                id={id}
                list={listId}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Feed, Medicine, Labour…"
                maxLength={60}
              />
              <datalist id={listId}>
                {(categories ?? []).map((entry) => (
                  <option key={entry} value={entry} />
                ))}
              </datalist>
            </>
          )}
        </Field>

        <Field
          label="Linked goat"
          hint="Optional — ties the cost to one animal so it shows on its page."
        >
          {(id) => (
            <GoatPicker
              id={id}
              value={goatId}
              selectedLabel={goatLabel}
              placeholder="No particular goat"
              onChange={(picked) => {
                setGoatId(picked?.id ?? null);
                setGoatLabel(picked?.tag_number ?? null);
              }}
            />
          )}
        </Field>

        <Field label="Notes">
          {(id) => (
            <Textarea
              id={id}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Shop name, quantity, anything worth remembering…"
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
