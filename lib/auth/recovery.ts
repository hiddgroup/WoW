export type RecoveryParams = {
  accessToken?: string;
  refreshToken?: string;
  tokenHash?: string;
};

export function readRecoveryParams(): RecoveryParams | null {
  if (typeof window === "undefined") return null;

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const type = hash.get("type") || query.get("type");
  if (type !== "recovery") return null;

  const accessToken = hash.get("access_token") || query.get("access_token") || "";
  const refreshToken = hash.get("refresh_token") || query.get("refresh_token") || "";
  const tokenHash = hash.get("token_hash") || query.get("token_hash") || "";
  if (!accessToken && !tokenHash) return null;

  const next = new URL(window.location.href);
  next.hash = "";
  for (const key of [
    "type",
    "access_token",
    "refresh_token",
    "token_hash",
    "expires_in",
    "expires_at",
    "token_type",
  ]) {
    next.searchParams.delete(key);
  }
  const search = next.searchParams.toString();
  window.history.replaceState(null, "", next.pathname + (search ? `?${search}` : ""));

  return {
    accessToken: accessToken || undefined,
    refreshToken: refreshToken || undefined,
    tokenHash: tokenHash || undefined,
  };
}
