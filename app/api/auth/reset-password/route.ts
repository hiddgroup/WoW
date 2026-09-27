import { NextResponse } from "next/server";
import { mapAuthError } from "@/lib/supabase/errors";
import { profileToAuthUser } from "@/lib/supabase/mappers";
import { getServerSupabase, getServerSupabaseWithAuth } from "@/lib/supabase/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

type TokenResult = {
  accessToken: string;
  refreshToken: string;
  email: string;
};

async function verifyRecoveryHash(tokenHash: string): Promise<TokenResult | { error: string }> {
  const response = await fetch(`${getSupabaseUrl()}/auth/v1/verify`, {
    method: "POST",
    headers: {
      apikey: getSupabaseAnonKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "recovery", token_hash: tokenHash }),
  });
  const data = (await response.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
    email?: string;
    user?: { email?: string };
    msg?: string;
    error_description?: string;
    message?: string;
  } | null;
  if (!response.ok || !data?.access_token) {
    const message = data?.msg || data?.error_description || data?.message || "재설정 링크가 만료되었습니다";
    return { error: message };
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    email: data.email || data.user?.email || "",
  };
}

async function updatePassword(accessToken: string, password: string) {
  const response = await fetch(`${getSupabaseUrl()}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: getSupabaseAnonKey(),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  const data = (await response.json().catch(() => null)) as {
    email?: string;
    user?: { email?: string };
    msg?: string;
    error_description?: string;
    message?: string;
  } | null;
  if (!response.ok) {
    const message = data?.msg || data?.error_description || data?.message || "비밀번호를 바꾸지 못했습니다";
    return { error: message, email: "" };
  }
  return { error: null, email: data?.email || data?.user?.email || "" };
}

export async function POST(req: Request) {
  try {
    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json(
        { user: null, session: null, error: "Supabase가 설정되지 않았습니다" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as {
      password?: string;
      access_token?: string;
      refresh_token?: string;
      token_hash?: string;
    };
    const password = body.password ?? "";
    if (password.length < 6) {
      return NextResponse.json(
        { user: null, session: null, error: "비밀번호는 6자 이상이어야 합니다" },
        { status: 400 }
      );
    }

    let accessToken = body.access_token ?? "";
    let refreshToken = body.refresh_token ?? "";
    let email = "";

    if (!accessToken && body.token_hash) {
      const verified = await verifyRecoveryHash(body.token_hash);
      if ("error" in verified) {
        return NextResponse.json(
          { user: null, session: null, error: mapAuthError(verified.error) },
          { status: 401 }
        );
      }
      accessToken = verified.accessToken;
      refreshToken = verified.refreshToken;
      email = verified.email;
    }

    if (!accessToken) {
      return NextResponse.json(
        { user: null, session: null, error: "재설정 링크가 올바르지 않습니다. 메일을 다시 요청해주세요." },
        { status: 400 }
      );
    }

    const updated = await updatePassword(accessToken, password);
    if (updated.error) {
      return NextResponse.json(
        { user: null, session: null, error: mapAuthError(updated.error) },
        { status: 400 }
      );
    }
    email = updated.email || email;

    if (!email) {
      return NextResponse.json({ user: null, session: null, error: null });
    }

    const signedIn = await supabase.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.session || !signedIn.data.user) {
      return NextResponse.json({ user: null, session: null, error: null });
    }

    const profileClient = getServerSupabaseWithAuth(signedIn.data.session.access_token);
    const profile = profileClient
      ? await profileClient.from("profiles").select("*").eq("id", signedIn.data.user.id).single()
      : { data: null };
    const user = profile.data ? profileToAuthUser(profile.data) : null;

    return NextResponse.json({
      user,
      session: {
        access_token: signedIn.data.session.access_token,
        refresh_token: signedIn.data.session.refresh_token,
      },
      error: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch";
    return NextResponse.json(
      { user: null, session: null, error: mapAuthError(message) },
      { status: 502 }
    );
  }
}
