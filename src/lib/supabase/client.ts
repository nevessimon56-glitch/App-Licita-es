import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseEnabled } from "./config";

export function createSupabaseBrowserClient() {
  if (!isSupabaseEnabled()) {
    throw new Error("Supabase não está configurado.");
  }

  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
