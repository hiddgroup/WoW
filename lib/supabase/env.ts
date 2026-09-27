function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim().replace(/\r/g, "");
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return "";
  return stripWrappingQuotes(raw).replace(/\/+$/, "");
}

export function getSupabaseAnonKey(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!raw) return "";
  return stripWrappingQuotes(raw);
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return false;
  if (url.includes("여기에") || key.includes("여기에")) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function getBrowserSupabaseUrl(): string {
  const direct = getSupabaseUrl();
  if (typeof window === "undefined") return direct;
  return `${window.location.origin}/sb`;
}
