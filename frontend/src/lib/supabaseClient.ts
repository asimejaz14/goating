"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { PHOTO_BUCKET, requireSupabaseEnv } from "./env";

/**
 * Supabase is used for exactly one thing: uploading goat photos to Storage.
 * Signing in and every other byte of data flows through the FastAPI backend,
 * which is the single place business rules (and the real login) live.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    const { url, anonKey } = requireSupabaseEnv();
    client = createBrowserClient(url, anonKey);
  }
  return client;
}

/**
 * Upload a goat photo and return its public URL.
 *
 * Photos are optional throughout the portal, so callers treat a failure here as
 * "save the goat without a photo", never as a blocking error.
 */
export async function uploadGoatPhoto(file: File, goatKey: string): Promise<string> {
  const supabase = getSupabase();
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${goatKey}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
