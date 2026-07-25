"use client";

import { GitBranch } from "lucide-react";
import { useEffect, useState } from "react";

import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Drawer } from "@/components/ui/Drawer";
import { ApiError } from "@/lib/apiClient";
import { useLinkParents } from "@/lib/queries";
import type { GoatDetail } from "@/lib/types";

import { GoatPicker } from "./GoatPicker";

/**
 * The single action that grows the pedigree tree.
 *
 * Every kid registered here gains a dam and a sire, and every ancestor those
 * parents already carry joins the tree automatically — nobody ever draws it.
 */
export function LinkParentsDialog({
  open,
  onClose,
  goat,
}: {
  open: boolean;
  onClose: () => void;
  goat: GoatDetail;
}) {
  const toast = useToast();
  const link = useLinkParents(goat.id);

  const [damId, setDamId] = useState<string | null>(goat.dam_id);
  const [damLabel, setDamLabel] = useState<string | null>(goat.dam?.tag_number ?? null);
  const [sireId, setSireId] = useState<string | null>(goat.sire_id);
  const [sireLabel, setSireLabel] = useState<string | null>(goat.sire?.tag_number ?? null);

  useEffect(() => {
    if (!open) return;
    setDamId(goat.dam_id);
    setDamLabel(goat.dam?.tag_number ?? null);
    setSireId(goat.sire_id);
    setSireLabel(goat.sire?.tag_number ?? null);
  }, [open, goat.dam_id, goat.sire_id, goat.dam?.tag_number, goat.sire?.tag_number]);

  async function onSubmit() {
    try {
      await link.mutateAsync({ dam_id: damId, sire_id: sireId });
      toast.success(`Pedigree updated for ${goat.tag_number}.`);
      onClose();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not link the parents.");
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Link parents"
      description={`Connect ${goat.tag_number} to its mother and father.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={link.isPending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={link.isPending}>
            Save links
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-lg bg-primary-soft px-3.5 py-3">
          <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm leading-snug text-primary">
            The tree builds itself from here — link the parents and every generation they
            already carry appears behind them.
          </p>
        </div>

        <Field label="Mother (dam)">
          {(id) => (
            <GoatPicker
              id={id}
              value={damId}
              selectedLabel={damLabel}
              sex="female"
              excludeIds={[goat.id]}
              placeholder="Choose a doe"
              onChange={(picked) => {
                setDamId(picked?.id ?? null);
                setDamLabel(picked?.tag_number ?? null);
              }}
            />
          )}
        </Field>

        <Field label="Father (sire)">
          {(id) => (
            <GoatPicker
              id={id}
              value={sireId}
              selectedLabel={sireLabel}
              sex="male"
              excludeIds={[goat.id]}
              placeholder="Choose a buck"
              onChange={(picked) => {
                setSireId(picked?.id ?? null);
                setSireLabel(picked?.tag_number ?? null);
              }}
            />
          )}
        </Field>
      </div>
    </Drawer>
  );
}
