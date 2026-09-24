import { authHeaders } from "../../../../lib/auth";
import type { CompanyProduct, MediaItem, PageItem, Section, SocialLinks, WebsiteTheme } from "../types";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ?? "";
export const API_URL =
  process.env.NODE_ENV === "production"
    ? "https://quincaillerie-858p.onrender.com"
    : configuredApiUrl || "http://localhost:8000";

async function getJson<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json", ...authHeaders() },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export async function loadWebsiteTheme(): Promise<{
  theme?: WebsiteTheme;
  template?: string | null;
  settings?: { social_links?: Partial<SocialLinks> };
} | null> {
  return getJson("/api/v1/websites/current");
}

export async function loadPages(): Promise<PageItem[] | null> {
  return getJson("/api/v1/websites/current/pages");
}

export async function loadSections(pageId: number): Promise<Section[] | null> {
  return getJson(`/api/v1/websites/pages/${pageId}/sections`);
}

export async function loadProducts(): Promise<CompanyProduct[] | null> {
  return getJson("/api/v1/products");
}

export async function loadMedia(): Promise<{ media?: MediaItem[] } | null> {
  return getJson("/api/v1/websites/current/media");
}
