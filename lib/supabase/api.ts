import type { RecoveryParams } from "@/lib/auth/recovery";
import type { AuthUser, Project } from "@/lib/types";
import { getSupabase } from "./client";
import { mapAuthError } from "./errors";
import { profileToAuthUser, projectRowToProject, projectToRow } from "./mappers";
import { clearAccessToken, getAccessToken, loadStoredSession, saveStoredSession } from "./session";

export { mapAuthError } from "./errors";

let lastSaveAlert = 0;

/** Saves used to fail silently, so changes vanished on reload. Tell the user instead. */
function reportSaveError(action: string, error: { message?: string } | null) {
  if (!error) return;
  console.error(`[HiDD WoW] ${action} failed`, error);
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastSaveAlert < 5000) return;
  lastSaveAlert = now;
  window.alert(
    `${action}에 실패했습니다. 새로고침하면 이 변경은 사라집니다.\n\n원인: ${error.message ?? "알 수 없는 오류"}`
  );
}

export async function fetchProfile(userId: string, retries = 0): Promise<AuthUser | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if ((error || !data) && retries < 5) {
    await new Promise((r) => setTimeout(r, 400));
    return fetchProfile(userId, retries + 1);
  }

  if (error || !data) return null;
  return profileToAuthUser(data);
}

async function fetchProfilesFromApi(approvedOnly = false): Promise<AuthUser[]> {
  const token = await getAccessToken();
  if (!token) return [];
  const res = await fetch(`/api/profiles${approvedOnly ? "?approved=1" : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = (await res.json()) as { users?: AuthUser[] };
  return payload.users ?? [];
}

export async function fetchAllProfiles(): Promise<AuthUser[]> {
  return fetchProfilesFromApi(false);
}

export async function fetchApprovedMembers(): Promise<AuthUser[]> {
  return fetchProfilesFromApi(true);
}

async function patchProfile(
  userId: string,
  patch: { status?: "approved" | "rejected"; role?: "admin" | "user" }
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  const res = await fetch("/api/profiles", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: userId, ...patch }),
  });
  const payload = (await res.json().catch(() => null)) as { ok?: boolean } | null;
  return res.ok && payload?.ok === true;
}

export async function updateProfileStatus(
  userId: string,
  status: "approved" | "rejected"
): Promise<boolean> {
  return patchProfile(userId, { status });
}

export async function updateProfileRole(
  userId: string,
  role: "admin" | "user"
): Promise<boolean> {
  return patchProfile(userId, { role });
}

export async function fetchProjects(): Promise<Project[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });

  if (error || !data) return null;
  return data.map(projectRowToProject);
}

export async function upsertProject(project: Project): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("projects")
    .upsert(projectToRow(project), { onConflict: "id" });

  reportSaveError("프로젝트 저장", error);
  return !error;
}

export async function deleteProjectFromDb(projectId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from("projects").delete().eq("id", projectId);

  reportSaveError("프로젝트 삭제", error);
  return !error;
}

export async function insertProjects(projects: Project[]): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || projects.length === 0) return false;

  const { error } = await supabase
    .from("projects")
    .insert(projects.map(projectToRow));

  return !error;
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Failed to fetch");
  }
}

async function applySession(session: {
  access_token: string;
  refresh_token: string;
} | null) {
  if (!session?.access_token) return;
  saveStoredSession(session);
  const supabase = getSupabase();
  if (!supabase || !session.refresh_token) return;
  try {
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  } catch {
    // The app session is already stored locally. A direct browser call to
    // Supabase can fail without logging the user out.
  }
}

export async function restoreSession(): Promise<AuthUser | null> {
  const saved = loadStoredSession();
  if (!saved) return null;

  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(saved),
  });
  if (!res.ok) {
    clearAccessToken();
    return null;
  }

  const payload = (await res.json()) as {
    user: AuthUser | null;
    session: { access_token: string; refresh_token: string } | null;
  };
  if (!payload.user || !payload.session) {
    clearAccessToken();
    return null;
  }

  await applySession(payload.session);
  return payload.user;
}

export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<{ user: AuthUser | null; needsEmailConfirm: boolean; error: string | null }> {
  try {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      }),
    });
    const payload = await parseJson<{
      user: AuthUser | null;
      session: { access_token: string; refresh_token: string } | null;
      needsEmailConfirm: boolean;
      error: string | null;
    }>(res);
    if (payload.error) {
      return {
        user: null,
        needsEmailConfirm: false,
        error: mapAuthError(payload.error),
      };
    }
    await applySession(payload.session);
    return {
      user: payload.user,
      needsEmailConfirm: payload.needsEmailConfirm,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch";
    return {
      user: null,
      needsEmailConfirm: false,
      error: mapAuthError(message),
    };
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });
    const payload = await parseJson<{
      user: AuthUser | null;
      session: { access_token: string; refresh_token: string } | null;
      error: string | null;
    }>(res);
    if (payload.error) {
      return { user: null, error: mapAuthError(payload.error) };
    }
    await applySession(payload.session);
    if (!payload.user) {
      return { user: null, error: "로그인에 실패했습니다" };
    }
    return { user: payload.user, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch";
    return { user: null, error: mapAuthError(message) };
  }
}

export async function resetPassword(
  recovery: RecoveryParams,
  password: string
): Promise<{ error: string | null }> {
  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password,
        access_token: recovery.accessToken,
        refresh_token: recovery.refreshToken,
        token_hash: recovery.tokenHash,
      }),
    });
    const payload = await parseJson<{
      user: AuthUser | null;
      session: { access_token: string; refresh_token: string } | null;
      error: string | null;
    }>(res);
    if (payload.error) return { error: mapAuthError(payload.error) };
    if (payload.session) await applySession(payload.session);
    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch";
    return { error: mapAuthError(message) };
  }
}

export async function signOut(): Promise<void> {
  clearAccessToken();
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}
