import PublicWebsitePage from "../../website/public/[slug]/page";

type SitePageProps = Readonly<{
  params: Promise<{ slug: string }>;
}>;

export default function SitePage({ params }: SitePageProps) {
  return <PublicWebsitePage params={params} />;
}
