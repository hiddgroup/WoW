import { NextResponse } from "next/server";
import { profileToAuthUser } from "@/lib/supabase/mappers";
import {
  getServerSupabase,
  getServerSupabaseWithAuth,
} from "@/lib/supabase/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

async function loadProfile(accessToken: string, userId: string) {
  const supabase = getServerSupabaseWithAuth(accessToken);
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return profileToAuthUser(data);
}

async function refreshTokens(refreshToken: string) {
  const response = await fetch(
    `${getSupabaseUrl()}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: getSupabaseAnonKey(),
        Authorization: `Bearer ${getSupabaseAnonKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
  );
  if (!response.ok) return null;
  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    user?: { id?: string };
  };
  if (!data.access_token || !data.refresh_token || !data.user?.id) return null;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    userId: data.user.id,
  };
}

export async function POST(req: Request) {
  if (!getServerSupabase()) {
    return NextResponse.json({ user: null, session: null }, { status: 500 });
  }

  const body = (await req.json()) as {
    access_token?: string;
    refresh_token?: string;
  };
  let accessToken = body.access_token ?? "";
  let refreshToken = body.refresh_token ?? "";
  if (!accessToken && !refreshToken) {
    return NextResponse.json({ user: null, session: null }, { status: 401 });
  }

  let userId: string | null = null;
  if (accessToken) {
    const supabase = getServerSupabase();
    const { data } = await supabase!.auth.getUser(accessToken);
    userId = data.user?.id ?? null;
  }

  if (!userId && refreshToken) {
    const refreshed = await refreshTokens(refreshToken);
    if (!refreshed) {
      return NextResponse.json({ user: null, session: null }, { status: 401 });
    }
    accessToken = refreshed.access_token;
    refreshToken = refreshed.refresh_token;
    userId = refreshed.userId;
  }

  if (!userId) {
    return NextResponse.json({ user: null, session: null }, { status: 401 });
  }

  const user = await loadProfile(accessToken, userId);
  if (!user) {
    return NextResponse.json({ user: null, session: null }, { status: 401 });
  }

  return NextResponse.json({
    user,
    session: { access_token: accessToken, refresh_token: refreshToken },
  });
}
