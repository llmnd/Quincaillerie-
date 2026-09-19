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

function getAccessTokenFromUser(user: unknown): string | null {
  if (!user || typeof user !== "object") return null;

  const record = user as Record<string, unknown>;
  const directToken = typeof record.access_token === "string" ? record.access_token : null;
  if (directToken?.trim()) {
    return directToken.trim();
  }

  const nestedUser = record.user;
  if (nestedUser && typeof nestedUser === "object") {
    const nestedToken = (nestedUser as Record<string, unknown>).access_token;
    if (typeof nestedToken === "string") {
      return nestedToken.trim();
    }
  }

  return null;
}

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

  const accessToken = getAccessTokenFromUser(user) ?? getAccessTokenFromUser(normalized);
  const nextStoredUser = normalized && typeof normalized === "object"
    ? { ...(normalized as Record<string, unknown>), ...(accessToken ? { access_token: accessToken } : {}) }
    : normalized;

  if (accessToken) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextStoredUser));
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
  const token = getAccessTokenFromUser(storedUser);
  return token?.trim() ?? null;
}

export async function restoreAuthSession(): Promise<AuthUser | null> {
  if (typeof window === "undefined") return null;

  const fallbackToken = getStoredAuthToken();

  try {
    const response = await fetch(`${API_URL}/api/v1/auth/me`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(fallbackToken ? { Authorization: `Bearer ${fallbackToken}` } : {}),
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearStoredAuth();
        return null;
      }
      clearStoredAuth();
      return null;
    }

    const user = (await response.json()) as AuthUser;
    if (!user || typeof user !== "object") {
      clearStoredAuth();
      return null;
    }

    setStoredUser(user);
    return user;
  } catch {
    clearStoredAuth();
    return null;
  }
}

export function authHeaders(): HeadersInit {
  const accessToken = getStoredAuthToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}
