import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import ProductCatalog from "../../../website/public/[slug]/productCatalog";
import { fetchPublicWebsite } from "../../../website/public/publicApi";
import SiteHeader from "../../../../components/SiteHeader";
import styles from "./productsPage.module.css";

type Product = {
  id?: number;
  name?: string;
  description?: string | null;
  price?: number | string | null;
  image?: string | null;
  image_url?: string | null;
  category?: string | null;
};

type Payload = {
  website?: { name?: string; logo?: string | null; theme?: Record<string, string> };
  organization?: { name?: string; phone?: string | null };
  products?: Product[];
  sections?: Array<{ type?: string; content?: Record<string, unknown> }>;
};

export default async function ProductsPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const payload = await fetchPublicWebsite(slug) as Payload | null;
  if (!payload) notFound();
  const theme = payload.website?.theme ?? {};
  const siteName = payload.website?.name || payload.organization?.name || "Notre catalogue";
  const primaryColor = theme.primary ?? "#111827";
  const secondaryColor = theme.secondary ?? "#714B67";
  const textColor = theme.text ?? "#111827";
  const secondaryTextColor = theme.secondaryText ?? "#475569";
  const products = (payload.products ?? []).map((product) => ({
    ...product,
    image: product.image || product.image_url || null,
  }));
  const catalogContent = payload.sections?.find((section) => section.type === "products")?.content ?? {};

  return (
    <main className={styles.page} style={{ background: theme.background ?? "#fff", color: textColor, fontFamily: theme.font ?? "Inter, sans-serif", "--secondary": secondaryColor, "--muted": secondaryTextColor, "--primary": primaryColor } as CSSProperties}>
      <SiteHeader
        slug={slug}
        siteName={theme.headerBrand ?? siteName}
        logo={payload.website?.logo ?? ""}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        textColor={textColor}
        backHref={`/site/${slug}`}
        labels={{
          home: theme.headerHome,
          about: theme.headerAbout,
          products: theme.headerProducts,
          services: theme.headerServices,
          contact: theme.headerContact,
          cta: theme.headerCta,
        }}
      />
      <div className={styles.container}>
        <header className={styles.catalogIntro}>
          <a className={styles.backLink} href={`/site/${slug}`}>
            ← Retour à l&apos;accueil
          </a>
          <div className={styles.introGrid}>
            <div>
              <p className={styles.catalogEyebrow}>Catalogue · {siteName}</p>
              <h1 className={styles.catalogTitle}>La sélection.</h1>
              <p className={styles.catalogLead}>
                Des références choisies pour vos projets. Consultez les détails,
                ajoutez vos articles et envoyez votre demande directement à
                l&apos;équipe.
              </p>
            </div>
            <div className={styles.catalogCount}>
              <strong>{products.length}</strong>
              <span>références disponibles</span>
            </div>
          </div>
        </header>
        <ProductCatalog
          slug={slug}
          products={products}
          eyebrowText={String(catalogContent.eyebrow ?? "Catalogue")}
          title={String(catalogContent.title ?? "Nos produits")}
          introText={String(catalogContent.subtitle ?? "Choisissez vos produits et envoyez votre demande directement à l'entreprise.")}
          columnsMobile={2}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          textColor={textColor}
          secondaryTextColor={secondaryTextColor}
        />
      </div>
    </main>
  );
}
