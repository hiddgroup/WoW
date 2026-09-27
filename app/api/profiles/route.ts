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