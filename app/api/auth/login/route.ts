import { NextResponse } from "next/server";
import { mapAuthError } from "@/lib/supabase/errors";
import { profileToAuthUser } from "@/lib/supabase/mappers";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function loadProfile(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
  userId: string
) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!error && data) return profileToAuthUser(data);
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { user: null, session: null, error: "이메일과 비밀번호를 입력해주세요" },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json(
        { user: null, session: null, error: "Supabase가 설정되지 않았습니다" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { user: null, session: null, error: mapAuthError(error.message) },
        { status: 401 }
      );
    }

    if (!data.user || !data.session) {
      return NextResponse.json(
        { user: null, session: null, error: "로그인에 실패했습니다" },
        { status: 401 }
      );
    }

    const user = await loadProfile(supabase, data.user.id);
    if (!user) {
      return NextResponse.json(
        {
          user: null,
          session: data.session,
          error:
            "프로필을 불러올 수 없습니다. Supabase SQL 마이그레이션(001, 002) 실행 여부를 확인해주세요.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
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
