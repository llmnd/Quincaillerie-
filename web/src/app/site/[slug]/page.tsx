import PublicWebsitePage from "../../website/public/[slug]/page";

type SitePageProps = Readonly<{
  params: Promise<{ slug: string }> | { slug: string };
}>;

export default async function SitePage({ params }: SitePageProps) {
  const resolvedParams = await Promise.resolve(params);
  console.log("[site-page] resolved params", { slug: resolvedParams.slug, params });
  return <PublicWebsitePage params={resolvedParams} />;
}
