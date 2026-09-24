const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ?? "";
const productionApiUrl = "https://quincaillerie-858p.onrender.com";

const isLocalApiUrl = (url: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(url);

const apiUrls = Array.from(
  new Set(
    [configuredApiUrl, productionApiUrl].filter(
      (url): url is string =>
        Boolean(url) &&
        (process.env.NODE_ENV !== "production" || !isLocalApiUrl(url)),
    ),
  ),
);

export type PublicWebsiteTheme = {
  primary?: string;
  secondary?: string;
  background?: string;
  text?: string;
  font?: string;
  radius?: string;
  buttonStyle?: string;
  cardStyle?: string;
  secondaryText?: string;
  headerBrand?: string;
  headerHome?: string;
  headerAbout?: string;
  headerProducts?: string;
  headerServices?: string;
  headerContact?: string;
  headerCta?: string;
  headerBrandColor?: string;
  headerHomeColor?: string;
  headerAboutColor?: string;
  headerProductsColor?: string;
  headerServicesColor?: string;
  headerContactColor?: string;
  headerCtaColor?: string;
  headerStyle?: string;
};

export type PublicWebsiteOrganization = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  description?: string | null;
};

export type PublicWebsiteInfo = {
  name?: string;
  description?: string | null;
  logo?: string | null;
  favicon?: string | null;
  theme?: PublicWebsiteTheme;
  facebook?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
};

export type PublicWebsitePayload = {
  website?: PublicWebsiteInfo;
  organization?: PublicWebsiteOrganization;
  page?: {
    title?: string | null;
    meta_title?: string | null;
    meta_description?: string | null;
  };
  sections?: Array<{
    id: string | number;
    type?: string;
    visible?: boolean;
    content?: Record<string, unknown>;
  }>;
  products?: Array<{
    id?: number;
    name?: string;
    description?: string | null;
    price?: number | string | null;
    unit_price?: number | string | null;
    image?: string | null;
    image_url?: string | null;
    category?: string | null;
  }>;
};

export function publicWebsitePath(slug: string): string {
  const normalizedSlug = slug.trim();
  return normalizedSlug.includes(".")
    ? `/api/v1/websites/public/host/${encodeURIComponent(normalizedSlug)}`
    : `/api/v1/websites/public/${encodeURIComponent(normalizedSlug)}`;
}

export async function fetchPublicWebsite(
  slug: string,
): Promise<PublicWebsitePayload | null> {
  const path = publicWebsitePath(slug);

  for (const baseUrl of apiUrls) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) continue;

      const payload = (await response.json()) as PublicWebsitePayload;
      if (payload.website) return payload;
    } catch (error) {
      console.error("[public-fetch] exception", {
        slug,
        requestUrl: `${baseUrl}${path}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return null;
}
