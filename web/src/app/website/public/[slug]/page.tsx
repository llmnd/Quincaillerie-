import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteHeader from "../../../../components/SiteHeader";
import SiteSections from "../../_shared/SiteSections";
import pageStyles from "./publicPage.module.css";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
const API_URL = configuredApiUrl || (
  process.env.NODE_ENV === "production"
    ? "https://quincaillerie-858p.onrender.com"
    : "http://localhost:8000"
);

type WebsiteTheme = {
  primary?: string;
  secondary?: string;
  background?: string;
  text?: string;
  font?: string;
  secondaryText?: string;
  headerBrand?: string;
  headerHome?: string;
  headerAbout?: string;
  headerProducts?: string;
  headerServices?: string;
  headerContact?: string;
  headerCta?: string;
};

type PublicPayload = {
  website?: { name?: string; description?: string | null; logo?: string | null; favicon?: string | null; theme?: WebsiteTheme };
  organization?: { name?: string; phone?: string | null; email?: string | null };
  page?: { title?: string | null; meta_title?: string | null; meta_description?: string | null };
  sections?: Array<{ id?: number; type?: string; visible?: boolean; content?: Record<string, unknown> }>;
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

async function fetchPublicPayload(slug: string): Promise<PublicPayload | null> {
  const normalizedSlug = slug.trim();
  const publicPath = normalizedSlug.includes(".")
    ? `/api/v1/websites/public/host/${encodeURIComponent(normalizedSlug)}`
    : `/api/v1/websites/public/${encodeURIComponent(normalizedSlug)}`;

  const requestUrl = `${API_URL}${publicPath}`;
  console.log("[public-fetch] start", { slug: normalizedSlug, publicPath, requestUrl });

  try {
    const response = await fetch(requestUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const responseBody = await response.text().catch(() => "");
      console.error("[public-fetch] bad status", {
        slug: normalizedSlug,
        publicPath,
        status: response.status,
        statusText: response.statusText,
        requestUrl,
        responseBody: responseBody.slice(0, 500),
      });
      return null;
    }

    const payload = (await response.json()) as PublicPayload;
    console.log("[public-fetch] success", { slug: normalizedSlug, publicPath, hasWebsite: !!payload.website, hasSections: !!payload.sections, products: payload.products?.length ?? 0 });
    return payload;
  } catch (error) {
    console.error("[public-fetch] exception", { slug: normalizedSlug, publicPath, requestUrl, error });
    return null;
  }
}

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> | { slug: string } }>): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const payload = await fetchPublicPayload(slug);
  const website = payload?.website ?? {};
  const organization = payload?.organization ?? {};
  const name = website.name || organization.name || "Entreprise";
  const title = payload?.page?.meta_title || payload?.page?.title || name;
  const description = payload?.page?.meta_description || website.description || `Découvrez ${name} et ses produits.`;
  const image = website.logo || undefined;

  return {
    title,
    description,
    icons: website.favicon || website.logo ? { icon: website.favicon || website.logo || undefined } : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: name,
      images: image ? [{ url: image, alt: name }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PublicWebsitePage({ params }: Readonly<{ params: Promise<{ slug: string }> | { slug: string } }>) {
  const { slug } = await Promise.resolve(params);
  const payload = await fetchPublicPayload(slug);
  if (!payload) notFound();
  const website = payload.website ?? {};
  const organization = payload.organization ?? {};
  const theme = website.theme ?? {};
  const siteName = website.name || organization.name || "Entreprise";
  const primaryColor = theme.primary ?? "#111827";
  const secondaryColor = theme.secondary ?? "#714B67";
  const textColor = theme.text ?? "#111827";
  const secondaryTextColor = theme.secondaryText ?? "#475569";
  const products = (payload.products ?? []).map((product) => ({
    ...product,
    image: product.image || product.image_url || null,
    price: product.price ?? product.unit_price ?? null,
  }));
  const sections = (payload.sections ?? []).map((section) => ({
    id: section.id,
    type: section.type ?? "text",
    visible: section.visible,
    content: section.content ?? {},
  }));

  return (
    <main style={{ minHeight: "100vh", background: theme.background ?? "#ffffff", color: textColor, fontFamily: theme.font ?? "Inter, Arial, sans-serif" }}>
      <SiteHeader
        slug={slug}
        siteName={theme.headerBrand || siteName}
        logo={website.logo ?? ""}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        textColor={textColor}
        labels={{
          home: theme.headerHome,
          about: theme.headerAbout,
          products: theme.headerProducts,
          services: theme.headerServices,
          contact: theme.headerContact,
          cta: theme.headerCta,
        }}
      />
      <div className={pageStyles.content}>
        <SiteSections
          sections={sections}
          products={products}
          siteName={siteName}
          textColor={textColor}
          secondaryTextColor={secondaryTextColor}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          slug={slug}
        />
      </div>
      <footer id="contact" className={pageStyles.footer}>
        <span>{siteName}</span>
        <span>© 2026 - Tous droits réservés</span>
      </footer>
    </main>
  );
}
