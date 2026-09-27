import { getSupabase } from "./client";

const ACCESS_TOKEN_KEY = "hidd-wow-access-token";

export function saveAccessToken(token: string | undefined | null) {
  if (typeof window === "undefined") return;
  if (!token) return;
  try {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearAccessToken() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function getAccessToken(): Promise<string> {
  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
  }
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}