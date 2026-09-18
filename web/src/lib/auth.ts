export type AuthUser = {
  id?: number | string;
  full_name?: string;
  email?: string;
  role?: "admin" | "seller";
  user?: AuthUser;
  access_token?: string;
};

const AUTH_STORAGE_KEY = "quincaillerie_user";
const AUTH_TOKEN_KEY = "quincaillerie_access_token";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    const storedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!storedUser) return null;

    const parsed = JSON.parse(storedUser) as AuthUser;
    return parsed && typeof parsed === "object" && "user" in parsed && parsed.user && typeof parsed.user === "object"
      ? parsed.user
      : parsed;
  } catch {
    return null;
  }
}

export function setStoredUser(user: unknown): void {
  if (typeof window === "undefined") return;

  const normalized = user && typeof user === "object" && "user" in (user as Record<string, unknown>)
    ? ((user as { user?: unknown }).user ?? user)
    : user;

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalized));
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const directToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (directToken?.trim()) {
    return directToken.trim();
  }

  const storedUser = getStoredUser();
  if (!storedUser) return null;

  const token = typeof storedUser.access_token === "string" ? storedUser.access_token : null;
  return token?.trim() ?? null;
}

export async function restoreAuthSession(): Promise<AuthUser | null> {
  if (typeof window === "undefined") return null;

  const cachedUser = getStoredUser();

  try {
    const response = await fetch(`${API_URL}/api/v1/auth/me`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearStoredAuth();
        return null;
      }
      return cachedUser ?? null;
    }

    const user = (await response.json()) as AuthUser;
    if (!user || typeof user !== "object") {
      return cachedUser ?? null;
    }

    setStoredUser(user);
    return user;
  } catch {
    return cachedUser ?? null;
  }
}

export function authHeaders(): HeadersInit {
  const accessToken = getStoredAuthToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}
