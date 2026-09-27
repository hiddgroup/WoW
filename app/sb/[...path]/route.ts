import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

const FORWARD_REQUEST_HEADERS = [
  "authorization",
  "apikey",
  "content-type",
  "accept",
  "prefer",
  "range",
  "x-client-info",
  "x-supabase-api-version",
  "x-supabase-auth",
  "accept-profile",
  "content-profile",
];

async function proxy(
  req: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: "Supabase가 설정되지 않았습니다" },
      { status: 500 }
    );
  }

  const { path } = await context.params;
  const incoming = new URL(req.url);
  const target = `${getSupabaseUrl()}/${path.join("/")}${incoming.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("apikey")) {
    headers.set("apikey", getSupabaseAnonKey());
  }

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, init);
    const outHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (HOP_BY_HOP.has(key.toLowerCase())) return;
      outHeaders.set(key, value);
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch {
    return Response.json(
      {
        error:
          "인증 서버에 연결할 수 없습니다. 네트워크 또는 Supabase 프로젝트 상태를 확인해주세요.",
      },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
