"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, MoneyInput, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ApiError } from "@/lib/apiClient";
import { useBreeds, useCreateGoat, useSettings, useUpdateGoat } from "@/lib/queries";
import type {
  AcquisitionType,
  GoatCreate,
  GoatDetail,
  GoatSex,
  GoatSummary,
} from "@/lib/types";

import { GoatPicker } from "./GoatPicker";
import { PhotoField } from "./PhotoField";

/** The breed is almost always the same one twice in a row — remember it. */
const LAST_BREED_KEY = "goatfarm:last-breed";

interface GoatFormProps {
  open: boolean;
  onClose: () => void;
  /** Present when editing; absent when adding. */
  goat?: GoatDetail;
  /** Pre-fills for a kid being registered straight off a crossing. */
  defaults?: Partial<GoatCreate>;
  onSaved?: (goat: GoatDetail) => void;
}

interface FormState {
  name: string;
  breed_id: string;
  sex: GoatSex;
  date_of_birth: string;
  acquisition_type: AcquisitionType;
  purchase_date: string;
  purchase_price: string;
  purchased_from: string;
  dam_id: string | null;
  sire_id: string | null;
  color: string;
  photo_url: string | null;
  notes: string;
}

function initialState(goat?: GoatDetail, defaults?: Partial<GoatCreate>): FormState {
  return {
    name: goat?.name ?? defaults?.name ?? "",
    breed_id: goat?.breed_id ?? defaults?.breed_id ?? "",
    sex: goat?.sex ?? defaults?.sex ?? "female",
    date_of_birth: goat?.date_of_birth ?? defaults?.date_of_birth ?? "",
    acquisition_type: goat?.acquisition_type ?? defaults?.acquisition_type ?? "bred",
    purchase_date: goat?.purchase_date ?? "",
    purchase_price: goat?.purchase_price ?? "",
    purchased_from: goat?.purchased_from ?? "",
    dam_id: goat?.dam_id ?? defaults?.dam_id ?? null,
    sire_id: goat?.sire_id ?? defaults?.sire_id ?? null,
    color: goat?.color ?? "",
    photo_url: goat?.photo_url ?? null,
    notes: goat?.notes ?? "",
  };
}

export function GoatForm({ open, onClose, goat, defaults, onSaved }: GoatFormProps) {
  const editing = Boolean(goat);
  const { data: breeds } = useBreeds();
  const { data: settings } = useSettings();
  const toast = useToast();

  const [form, setForm] = useState<FormState>(() => initialState(goat, defaults));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [damLabel, setDamLabel] = useState<string | null>(goat?.dam?.tag_number ?? null);
  const [sireLabel, setSireLabel] = useState<string | null>(goat?.sire?.tag_number ?? null);

  const create = useCreateGoat();
  const update = useUpdateGoat(goat?.id ?? "");
  const saving = create.isPending || update.isPending;

  // Reopening the form must not show the previous goat's values.
  useEffect(() => {
    if (!open) return;
    const next = initialState(goat, defaults);
    if (!next.breed_id && !editing) {
      next.breed_id = window.localStorage.getItem(LAST_BREED_KEY) ?? "";
    }
    setForm(next);
    setErrors({});
    setDamLabel(goat?.dam?.tag_number ?? null);
    setSireLabel(goat?.sire?.tag_number ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, goat?.id]);

  // With one breed seeded there is nothing to choose — pick it silently.
  useEffect(() => {
    if (!form.breed_id && breeds?.length === 1) {
      setForm((current) => ({ ...current, breed_id: breeds[0].id }));
    }
  }, [breeds, form.breed_id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.breed_id) next.breed_id = "Pick a breed — it decides the tag number.";
    if (form.acquisition_type === "purchased" && form.purchase_price) {
      if (Number(form.purchase_price) < 0) next.purchase_price = "Price cannot be negative.";
    }
    if (form.date_of_birth && form.date_of_birth > new Date().toISOString().slice(0, 10)) {
      next.date_of_birth = "A birth date cannot be in the future.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim() || null,
      breed_id: form.breed_id,
      sex: form.sex,
      date_of_birth: form.date_of_birth || null,
      acquisition_type: form.acquisition_type,
      purchase_date: form.acquisition_type === "purchased" ? form.purchase_date || null : null,
      purchase_price:
        form.acquisition_type === "purchased" ? form.purchase_price || null : null,
      purchased_from:
        form.acquisition_type === "purchased" ? form.purchased_from.trim() || null : null,
      dam_id: form.dam_id,
      sire_id: form.sire_id,
      color: form.color.trim() || null,
      photo_url: form.photo_url,
      notes: form.notes.trim() || null,
      ...(editing ? {} : { crossing_id: defaults?.crossing_id ?? null }),
    };

    try {
      const saved = editing
        ? await update.mutateAsync(payload)
        : await create.mutateAsync(payload as GoatCreate);

      if (!editing) window.localStorage.setItem(LAST_BREED_KEY, form.breed_id);
      toast.success(
        editing ? `${saved.tag_number} updated.` : `${saved.tag_number} added to the herd.`,
      );
      onSaved?.(saved);
      onClose();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save this goat.");
    }
  }

  const purchased = form.acquisition_type === "purchased";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? `Edit ${goat?.tag_number}` : "Add a goat"}
      description={
        editing
          ? "The tag number stays locked — everything else can change."
          : "The tag number is generated for you from the breed."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="goat-form" loading={saving}>
            {editing ? "Save changes" : "Add goat"}
          </Button>
        </>
      }
    >
      <form id="goat-form" onSubmit={onSubmit} className="space-y-4">
        {editing && (
          <div className="rounded-xl bg-cream-200 px-3.5 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              Tag number
            </p>
            <p className="tnum text-base font-bold text-ink">{goat?.tag_number}</p>
          </div>
        )}

        <PhotoField
          value={form.photo_url}
          onChange={(url) => set("photo_url", url)}
          goatKey={goat?.id ?? "new"}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" hint="Optional — a call name helps in the pen.">
            {(id) => (
              <Input
                id={id}
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="Chandni"
                maxLength={120}
              />
            )}
          </Field>

          <Field label="Breed" required error={errors.breed_id}>
            {(id) => (
              <Select
                id={id}
                value={form.breed_id}
                onChange={(event) => set("breed_id", event.target.value)}
              >
                <option value="">Select a breed…</option>
                {(breeds ?? []).map((breed) => (
                  <option key={breed.id} value={breed.id}>
                    {breed.name} ({breed.code})
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="soft-label">Sex</span>
            <SegmentedControl<GoatSex>
              value={form.sex}
              onChange={(value) => set("sex", value)}
              options={[
                { value: "female", label: "Doe", hint: "female" },
                { value: "male", label: "Buck", hint: "male" },
              ]}
            />
          </div>

          <div>
            <span className="soft-label">How did you get this goat?</span>
            <SegmentedControl<AcquisitionType>
              value={form.acquisition_type}
              onChange={(value) => set("acquisition_type", value)}
              options={[
                { value: "bred", label: "Born here", hint: "bred on the farm" },
                { value: "purchased", label: "Purchased", hint: "from the market" },
              ]}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Date of birth"
            hint="Optional, and entered by hand — it can differ from any estimate."
            error={errors.date_of_birth}
          >
            {(id) => (
              <Input
                id={id}
                type="date"
                value={form.date_of_birth}
                onChange={(event) => set("date_of_birth", event.target.value)}
              />
            )}
          </Field>

          <Field label="Colour / markings">
            {(id) => (
              <Input
                id={id}
                value={form.color}
                onChange={(event) => set("color", event.target.value)}
                placeholder="White with brown patches"
                maxLength={60}
              />
            )}
          </Field>
        </div>

        <AnimatePresence initial={false}>
          {purchased && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="grid gap-4 rounded-2xl bg-barn-50 p-3.5 sm:grid-cols-3">
                <Field label="Purchase date">
                  {(id) => (
                    <Input
                      id={id}
                      type="date"
                      value={form.purchase_date}
                      onChange={(event) => set("purchase_date", event.target.value)}
                    />
                  )}
                </Field>
                <Field label="Price paid" error={errors.purchase_price}>
                  {(id) => (
                    <MoneyInput
                      id={id}
                      symbol={settings?.currency_symbol ?? "₨"}
                      value={form.purchase_price}
                      onChange={(event) => set("purchase_price", event.target.value)}
                      placeholder="0"
                    />
                  )}
                </Field>
                <Field label="Bought from">
                  {(id) => (
                    <Input
                      id={id}
                      value={form.purchased_from}
                      onChange={(event) => set("purchased_from", event.target.value)}
                      placeholder="Mandi / seller name"
                      maxLength={160}
                    />
                  )}
                </Field>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mother (dam)" hint="Links this goat into the pedigree tree.">
            {(id) => (
              <GoatPicker
                id={id}
                value={form.dam_id}
                selectedLabel={damLabel}
                sex="female"
                excludeIds={goat ? [goat.id] : []}
                placeholder="Choose a doe"
                onChange={(picked: GoatSummary | null) => {
                  set("dam_id", picked?.id ?? null);
                  setDamLabel(picked?.tag_number ?? null);
                }}
              />
            )}
          </Field>

          <Field label="Father (sire)" hint="Can be added later, once you know it.">
            {(id) => (
              <GoatPicker
                id={id}
                value={form.sire_id}
                selectedLabel={sireLabel}
                sex="male"
                excludeIds={goat ? [goat.id] : []}
                placeholder="Choose a buck"
                onChange={(picked: GoatSummary | null) => {
                  set("sire_id", picked?.id ?? null);
                  setSireLabel(picked?.tag_number ?? null);
                }}
              />
            )}
          </Field>
        </div>

        <Field label="Notes">
          {(id) => (
            <Textarea
              id={id}
              value={form.notes}
              onChange={(event) => set("notes", event.target.value)}
              placeholder="Anything worth remembering about this goat."
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
