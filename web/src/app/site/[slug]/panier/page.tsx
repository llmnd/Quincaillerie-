import { notFound } from "next/navigation";
import CartPage from "../../../website/public/[slug]/CartPage";
import { fetchPublicWebsite } from "../../../website/public/publicApi";
import SiteHeader from "../../../../components/SiteHeader";

type Payload = {
  website?: { name?: string; logo?: string | null; theme?: Record<string, string> };
  organization?: { name?: string };
};

export default async function CartRoute({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const payload = await fetchPublicWebsite(slug) as Payload | null;
  if (!payload) notFound();
  const theme = payload.website?.theme ?? {};
  return (
    <>
      <SiteHeader
        slug={slug}
        siteName={payload.website?.name || payload.organization?.name || "Entreprise"}
        logo={payload.website?.logo ?? ""}
        primaryColor={theme.primary ?? "#111827"}
        secondaryColor={theme.secondary ?? "#714B67"}
        textColor={theme.text ?? "#111827"}
        labels={{
          home: theme.headerHome,
          about: theme.headerAbout,
          products: theme.headerProducts,
          services: theme.headerServices,
          contact: theme.headerContact,
          cta: theme.headerCta,
        }}
      />
      <CartPage
        slug={slug}
        siteName={payload.website?.name || payload.organization?.name || "Entreprise"}
        primaryColor={theme.primary ?? "#111827"}
        secondaryColor={theme.secondary ?? "#714B67"}
        textColor={theme.text ?? "#111827"}
        secondaryTextColor={theme.secondaryText ?? "#475569"}
      />
    </>
  );
}
