export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const directToken = window.localStorage.getItem("quincaillerie_access_token");
  if (directToken && directToken.trim()) {
    return directToken.trim();
  }

  const storedUser = window.localStorage.getItem("quincaillerie_user");
  if (!storedUser) return null;

  try {
    const parsed = JSON.parse(storedUser) as Record<string, unknown>;
    const nestedToken = typeof parsed.access_token === "string" ? parsed.access_token : null;
    const userToken = typeof parsed.user === "object" && parsed.user && "access_token" in parsed.user
      ? (parsed.user as { access_token?: string }).access_token
      : null;
    const token = nestedToken ?? userToken;
    return token && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

export function authHeaders(): HeadersInit {
  const accessToken = getStoredAuthToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}
