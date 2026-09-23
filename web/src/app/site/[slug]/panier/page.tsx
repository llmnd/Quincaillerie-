import { notFound } from "next/navigation";
import CartPage from "../../../website/public/[slug]/CartPage";
import { fetchPublicWebsite } from "../../../website/public/publicApi";

type Payload = {
  website?: { name?: string; theme?: Record<string, string> };
  organization?: { name?: string };
};

export default async function CartRoute({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const payload = await fetchPublicWebsite(slug) as Payload | null;
  if (!payload) notFound();
  const theme = payload.website?.theme ?? {};
  return (
    <CartPage
      slug={slug}
      siteName={payload.website?.name || payload.organization?.name || "Entreprise"}
      primaryColor={theme.primary ?? "#111827"}
      secondaryColor={theme.secondary ?? "#714B67"}
      textColor={theme.text ?? "#111827"}
      secondaryTextColor={theme.secondaryText ?? "#475569"}
    />
  );
}
