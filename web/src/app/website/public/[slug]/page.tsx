import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteHeader from "../../../../components/SiteHeader";
import SiteSections from "../../_shared/SiteSections";
import pageStyles from "./publicPage.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type WebsiteTheme = {
  primary?: string;
  secondary?: string;
  background?: string;
  text?: string;
  font?: string;
  secondaryText?: string;
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
  const publicPath = slug.includes(".")
    ? `/api/v1/websites/public/host/${encodeURIComponent(slug)}`
    : `/api/v1/websites/public/${encodeURIComponent(slug)}`;
  const response = await fetch(`${API_URL}${publicPath}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  return response.ok ? (await response.json()) as PublicPayload : null;
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
        siteName={siteName}
        logo={website.logo ?? ""}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        textColor={textColor}
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
