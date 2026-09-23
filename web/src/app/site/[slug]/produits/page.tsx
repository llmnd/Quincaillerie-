import { notFound } from "next/navigation";
import ProductCatalog from "../../../website/public/[slug]/productCatalog";
import SiteHeader from "../../../../components/SiteHeader";
import styles from "./productsPage.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
};

export default async function ProductsPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const path = slug.includes(".")
    ? `/api/v1/websites/public/host/${encodeURIComponent(slug)}`
    : `/api/v1/websites/public/${encodeURIComponent(slug)}`;
  const response = await fetch(`${API_URL}${path}`, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) notFound();

  const payload = (await response.json()) as Payload;
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

  return (
    <main className={styles.page} style={{ background: theme.background ?? "#fff", color: textColor, fontFamily: theme.font ?? "Inter, sans-serif", "--secondary": secondaryColor, "--muted": secondaryTextColor } as React.CSSProperties}>
      <SiteHeader slug={slug} siteName={siteName} logo={payload.website?.logo ?? ""} primaryColor={primaryColor} secondaryColor={secondaryColor} textColor={textColor} backHref={`/site/${slug}`} />
      <div className={styles.container}>
        <header className={styles.catalogIntro}>
          <p className={styles.catalogEyebrow}>Boutique en ligne</p>
          <h1 className={styles.catalogTitle}>{siteName}</h1>
          <p className={styles.catalogLead}>Découvrez notre catalogue et envoyez votre demande de commande directement à l&apos;équipe.</p>
        </header>
        <ProductCatalog slug={slug} products={products} primaryColor={primaryColor} secondaryColor={secondaryColor} textColor={textColor} secondaryTextColor={secondaryTextColor} />
      </div>
    </main>
  );
}
