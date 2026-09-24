import { notFound } from "next/navigation";
import type { Metadata, Viewport } from "next";
import SiteHeader from "../../../../components/SiteHeader";
import SiteSections from "../../_shared/SiteSections";
import ScrollProgress from "../../../../components/ScrollProgress";
import BackToTop from "../../../../components/BackToTop";
import pageStyles from "./publicPage.module.css";
import previewStyles from "../../_shared/preview.module.css";
import { fetchPublicWebsite, type PublicWebsitePayload } from "../publicApi";

type WebsiteTheme = Record<string, string | undefined>;
type PublicPayload = PublicWebsitePayload;
type PageParams = Readonly<{ params: Promise<{ slug: string }> | { slug: string } }>;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://exemple.com";

/* =========================================================
   ROUTE CONFIG
   ========================================================= */
export const revalidate = 3600; // ISR : régénère toutes les heures

export async function generateStaticParams() {
  // ⚠️ À compléter : retourne ici la liste des slugs de tes sites.
  // Exemple :
  //   const slugs = await fetchAllSlugs();
  //   return slugs.map((slug) => ({ slug }));
  return [] as { slug: string }[];
}

/* =========================================================
   SEO — METADATA
   ========================================================= */
export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);

  let payload: PublicPayload | null = null;
  try {
    payload = await fetchPublicWebsite(slug);
  } catch (err) {
    console.error(`[public-site] generateMetadata fetch failed (${slug})`, err);
  }

  const website = payload?.website ?? {};
  const organization = payload?.organization ?? {};
  const name = website.name || organization.name || "Entreprise";
  const title = payload?.page?.meta_title || payload?.page?.title || name;
  const description =
    payload?.page?.meta_description ||
    website.description ||
    `Découvrez ${name} et ses produits.`;
  const image = website.logo || undefined;
  const canonical = `/site/${slug}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons:
      website.favicon || website.logo
        ? { icon: website.favicon || website.logo || undefined }
        : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: name,
      url: canonical,
      locale: "fr_FR",
      images: image
        ? [{ url: image, alt: name, width: 1200, height: 630 }]
        : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/* =========================================================
   SEO — VIEWPORT
   ========================================================= */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111827",
};

/* =========================================================
   PAGE
   ========================================================= */
export default async function PublicWebsitePage({ params }: PageParams) {
  const { slug } = await Promise.resolve(params);

  /* ---------- Fetch robuste ---------- */
  let payload: PublicPayload | null = null;
  try {
    payload = await fetchPublicWebsite(slug);
  } catch (err) {
    console.error(`[public-site] fetch failed (${slug})`, err);
    return notFound();
  }
  if (!payload) return notFound();

  /* ---------- Données ---------- */
  const website = payload.website ?? {};
  const organization = payload.organization ?? {};
  const theme: WebsiteTheme = website.theme ?? {};
  const siteName = website.name || organization.name || "Entreprise";

  const primaryColor = theme.primary ?? "#111827";
  const secondaryColor = theme.secondary ?? "#714B67";
  const textColor = theme.text ?? "#111827";
  const secondaryTextColor = theme.secondaryText ?? "#475569";
  const background = theme.background ?? "#ffffff";
  const fontFamily = theme.font ?? "Inter, Arial, sans-serif";

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

  /* ---------- JSON-LD ---------- */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: siteName,
    description: website.description || undefined,
    image: website.logo || undefined,
    url: `${SITE_URL}/site/${slug}`,
    telephone: organization.phone || undefined,
    email: organization.email || undefined,
    address: organization.address
      ? { "@type": "PostalAddress", streetAddress: organization.address }
      : undefined,
    sameAs: [
      website.facebook,
      website.instagram,
      website.linkedin,
      website.twitter,
    ].filter(Boolean),
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background,
        color: textColor,
        fontFamily,
      }}
    >
      {/* Sécurité XSS : on escape les chevrons */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <ScrollProgress color={secondaryColor} />

      <SiteHeader
        slug={slug}
        siteName={theme.headerBrand || siteName}
        logo={website.logo ?? ""}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        textColor={textColor}
        headerStyle={theme.headerStyle}
        labels={{
          home: theme.headerHome,
          about: theme.headerAbout,
          products: theme.headerProducts,
          services: theme.headerServices,
          contact: theme.headerContact,
          cta: theme.headerCta,
        }}
        labelColors={{
          brand: theme.headerBrandColor,
          home: theme.headerHomeColor,
          about: theme.headerAboutColor,
          products: theme.headerProductsColor,
          services: theme.headerServicesColor,
          contact: theme.headerContactColor,
          cta: theme.headerCtaColor,
          cart: theme.headerCartColor,
          cartCount: theme.headerCartCountColor,
        }}
      />

      <div
        className={`${pageStyles.content} ${previewStyles.themeRoot}`}
        data-btn={theme.buttonStyle ?? "rounded"}
        data-radius={theme.radius ?? "medium"}
      >
        <SiteSections
          sections={sections}
          products={products}
          siteName={siteName}
          textColor={textColor}
          secondaryTextColor={secondaryTextColor}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          slug={slug}
          fontFamily={fontFamily}
        />
      </div>

      {/* ============================= FOOTER ============================= */}
      <footer id="contact" className={pageStyles.footer}>
        <div className={pageStyles.footerGrid}>
          <div className={pageStyles.footerBrand}>
            {website.logo && (
              <img
                src={website.logo}
                alt={siteName}
                className={pageStyles.footerLogo}
                loading="lazy"
                decoding="async"
              />
            )}
            <strong>{siteName}</strong>
            {website.description && (
              <p className={pageStyles.footerDescription}>
                {website.description}
              </p>
            )}
          </div>

          {(organization.phone || organization.email || organization.address) && (
            <div className={pageStyles.footerCol}>
              <h4>Contact</h4>
              {organization.phone && (
                <a href={`tel:${organization.phone.replace(/\s+/g, "")}`}>
                  {organization.phone}
                </a>
              )}
              {organization.email && (
                <a href={`mailto:${organization.email}`}>
                  {organization.email}
                </a>
              )}
              {organization.address && (
                <span className={pageStyles.footerAddress}>
                  {organization.address}
                </span>
              )}
            </div>
          )}

          {(website.facebook ||
            website.instagram ||
            website.linkedin ||
            website.twitter) && (
            <div className={pageStyles.footerCol}>
              <h4>Suivez-nous</h4>
              {website.facebook && (
                <a
                  href={website.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Facebook
                </a>
              )}
              {website.instagram && (
                <a
                  href={website.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>
              )}
              {website.linkedin && (
                <a
                  href={website.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </a>
              )}
              {website.twitter && (
                <a
                  href={website.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Twitter / X
                </a>
              )}
            </div>
          )}
        </div>

        <div className={pageStyles.footerBottom}>
          <span>
            © {new Date().getFullYear()} {siteName} — Tous droits réservés
          </span>
          <span>
            <a href={`/site/${slug}/produits`}>Catalogue</a>
            {" · "}
            <a href={`/site/${slug}/panier`}>Panier</a>
          </span>
        </div>
      </footer>

      <BackToTop color={secondaryColor} />
    </main>
  );
}