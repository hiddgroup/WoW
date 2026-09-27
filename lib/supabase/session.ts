import { getSupabase } from "./client";

const SESSION_KEY = "hidd-wow-session";

export type StoredSession = {
  access_token: string;
  refresh_token: string;
};

export function saveStoredSession(
  session: { access_token?: string; refresh_token?: string } | null | undefined
) {
  if (typeof window === "undefined") return;
  try {
    if (!session?.access_token) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    const previous = loadStoredSession();
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token || previous?.refresh_token || "",
      })
    );
  } catch {
    /* ignore */
  }
}

export function loadStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredSession;
      if (parsed.access_token) return parsed;
    }
    const legacy = sessionStorage.getItem("hidd-wow-access-token");
    if (legacy) return { access_token: legacy, refresh_token: "" };
    return null;
  } catch {
    return null;
  }
}

export function clearAccessToken() {
  saveStoredSession(null);
}

export function saveAccessToken(token: string | undefined | null) {
  if (!token) return;
  const current = loadStoredSession();
  if (!current) return;
  saveStoredSession({ ...current, access_token: token });
}

export async function getAccessToken(): Promise<string> {
  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
  }
  return loadStoredSession()?.access_token ?? "";
}
