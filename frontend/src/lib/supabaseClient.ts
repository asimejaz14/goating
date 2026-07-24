"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { PHOTO_BUCKET, requireSupabaseEnv } from "./env";

/**
 * Supabase is used for exactly two things: signing in, and uploading goat
 * photos to Storage. Every other byte of data flows through the FastAPI
 * backend, which is the single place business rules live.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    const { url, anonKey } = requireSupabaseEnv();
    client = createBrowserClient(url, anonKey);
  }
  return client;
}

/** The signed-in user's access token, or null when nobody is signed in. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
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
