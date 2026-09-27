import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./env";

export function getServerSupabase(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) return null;
  return createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function getServerSupabaseWithAuth(
  accessToken: string
): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured() || !accessToken) return null;
  return createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
