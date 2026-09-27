import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import {
  getBrowserSupabaseUrl,
  getSupabaseAnonKey,
  isSupabaseConfigured as envIsConfigured,
} from "./env";

export { isSupabaseConfigured } from "./env";

let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> | null {
  if (!envIsConfigured()) return null;
  if (!client) {
    client = createClient<Database>(getBrowserSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
