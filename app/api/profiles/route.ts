import { NextResponse } from "next/server";
import { profileToAuthUser } from "@/lib/supabase/mappers";
import { getServerSupabaseWithAuth } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function bearerToken(req: Request): string {
  const header = req.headers.get("authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

export async function GET(req: Request) {
  const token = bearerToken(req);
  const supabase = getServerSupabaseWithAuth(token);
  if (!supabase) {
    return NextResponse.json({ users: [], error: "로그인이 필요합니다" }, { status: 401 });
  }

  const approvedOnly = new URL(req.url).searchParams.get("approved") === "1";
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: true });
  if (approvedOnly) {
    query = query.eq("status", "approved").order("name", { ascending: true });
  }

  const { data, error } = await query;
  if (error || !data) {
    return NextResponse.json({ users: [], error: error?.message ?? null }, { status: 200 });
  }

  return NextResponse.json({ users: data.map(profileToAuthUser) });
}

export async function PATCH(req: Request) {
  const token = bearerToken(req);
  const supabase = getServerSupabaseWithAuth(token);
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다" }, { status: 401 });
  }

  const body = (await req.json()) as {
    id?: string;
    status?: string;
    role?: string;
  };
  if (!body.id) {
    return NextResponse.json({ ok: false, error: "대상 회원이 없습니다" }, { status: 400 });
  }

  const patch: { status?: "approved" | "rejected" | "pending"; role?: "admin" | "user" } = {};
  if (body.status === "approved" || body.status === "rejected" || body.status === "pending") {
    patch.status = body.status;
  }
  if (body.role === "admin" || body.role === "user") {
    patch.role = body.role;
  }
  if (!patch.status && !patch.role) {
    return NextResponse.json({ ok: false, error: "변경할 내용이 없습니다" }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", body.id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}