"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { useToast } from "@/components/providers/ToastProvider";
import { GoatPhoto } from "@/components/ui/GoatPhoto";
import { uploadGoatPhoto } from "@/lib/supabaseClient";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Optional photo upload.
 *
 * Photos go straight to Supabase Storage and only the resulting URL reaches the
 * API. A failure here is never fatal — the goat saves fine without a picture.
 */
export function PhotoField({
  value,
  onChange,
  goatKey,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  goatKey: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_BYTES) {
      toast.error("That photo is over 5 MB. Try a smaller one.");
      return;
    }

    setUploading(true);
    try {
      onChange(await uploadGoatPhoto(file, goatKey));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Photo upload failed: ${error.message}`
          : "Photo upload failed. You can save without one.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <GoatPhoto src={value} alt="Goat photo" size={72} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="tap inline-flex items-center gap-2 rounded-xl border border-cream-300 bg-cream-50 px-3 text-sm font-semibold text-ink shadow-soft transition hover:bg-cream-100 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {value ? "Replace photo" : "Add photo"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="tap inline-flex items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink-muted transition hover:text-clay-600"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onFile}
          className="hidden"
          aria-hidden
        />
      </div>
    </div>
  );
}
