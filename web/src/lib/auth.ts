export function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};

  const storedUser = window.localStorage.getItem("quincaillerie_user");
  if (!storedUser) return {};

  try {
    const accessToken = (JSON.parse(storedUser) as { access_token?: string }).access_token;
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  } catch {
    return {};
  }
}
