import { notFound } from "next/navigation";
import ProductCatalog from "../../../website/public/[slug]/ProductCatalog";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Product = {
  id?: number;
  name?: string;
  description?: string | null;
  price?: number | string | null;
  image?: string | null;
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

  return (
    <main style={{ minHeight: "100vh", padding: "34px 20px 80px", background: theme.background ?? "#fff", color: textColor, fontFamily: theme.font ?? "Inter, sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <a href={`/site/${slug}`} style={{ color: secondaryColor, textDecoration: "none", fontWeight: 800 }}>← {siteName}</a>
        <header style={{ margin: "46px 0 10px" }}>
          <p style={{ margin: 0, color: secondaryColor, fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>Boutique en ligne</p>
          <h1 style={{ margin: "8px 0", fontSize: "clamp(2.2rem, 5vw, 4.4rem)", lineHeight: 1 }}>{siteName}</h1>
          <p style={{ maxWidth: 620, margin: 0, color: secondaryTextColor, fontSize: 18 }}>Découvrez notre catalogue et envoyez votre demande de commande directement à l&apos;équipe.</p>
        </header>
        <ProductCatalog products={payload.products ?? []} primaryColor={primaryColor} secondaryColor={secondaryColor} textColor={textColor} secondaryTextColor={secondaryTextColor} phone={payload.organization?.phone} />
      </div>
    </main>
  );
}
