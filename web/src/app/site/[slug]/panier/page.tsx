import { notFound } from "next/navigation";
import CartPage from "../../../website/public/[slug]/CartPage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Payload = {
  website?: { name?: string; theme?: Record<string, string> };
  organization?: { name?: string };
};

export default async function CartRoute({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const path = slug.includes(".")
    ? `/api/v1/websites/public/host/${encodeURIComponent(slug)}`
    : `/api/v1/websites/public/${encodeURIComponent(slug)}`;

  let payload: Payload | null = null;
  try {
    const response = await fetch(`${API_URL}${path}`, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) notFound();
    payload = (await response.json()) as Payload;
  } catch {
    notFound();
  }

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
