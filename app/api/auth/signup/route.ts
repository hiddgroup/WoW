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
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          user: null,
          session: null,
          needsEmailConfirm: false,
          error: "이름, 이메일, 비밀번호를 입력해주세요",
        },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json(
        {
          user: null,
          session: null,
          needsEmailConfirm: false,
          error: "Supabase가 설정되지 않았습니다",
        },
        { status: 500 }
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      return NextResponse.json(
        {
          user: null,
          session: null,
          needsEmailConfirm: false,
          error: mapAuthError(error.message),
        },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        {
          user: null,
          session: null,
          needsEmailConfirm: false,
          error: "가입에 실패했습니다",
        },
        { status: 400 }
      );
    }

    if (!data.session) {
      return NextResponse.json({
        user: null,
        session: null,
        needsEmailConfirm: true,
        error: null,
      });
    }

    const user = await loadProfile(supabase, data.user.id);
    return NextResponse.json({
      user,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      needsEmailConfirm: false,
      error: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch";
    return NextResponse.json(
      {
        user: null,
        session: null,
        needsEmailConfirm: false,
        error: mapAuthError(message),
      },
      { status: 502 }
    );
  }
}
