import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://exemple.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ⚠️ Remplacer par un fetch réel de tes slugs
  // const slugs = await fetchAllSlugs();
  const slugs: string[] = [];

  const now = new Date();

  return slugs.flatMap((slug) => [
    {
      url: `${SITE_URL}/site/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${SITE_URL}/site/${slug}/produits`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/site/${slug}/panier`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    },
  ]);
}