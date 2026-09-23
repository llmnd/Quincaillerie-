import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteHeader from "../../../../components/SiteHeader";
import SiteSections from "../../_shared/SiteSections";
import pageStyles from "./publicPage.module.css";
import { fetchPublicWebsite, type PublicWebsitePayload } from "../publicApi";

type WebsiteTheme = Record<string, string | undefined>;
type PublicPayload = PublicWebsitePayload;

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> | { slug: string } }>): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const payload = await fetchPublicWebsite(slug);
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
  const payload = await fetchPublicWebsite(slug);
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
