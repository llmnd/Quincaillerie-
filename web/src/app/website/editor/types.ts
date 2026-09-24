export type Section = {
  id?: string | number;
  type: string;
  position?: number;
  visible?: boolean;
  content?: Record<string, unknown>;
  settings?: Record<string, unknown>;
};

export type EditorSnapshot = {
  sections: Section[];
  label: string;
};

export type HealthIssue = {
  level: "warn" | "error";
  message: string;
  sectionId?: string | number;
};

export type PageItem = {
  id?: number;
  name: string;
  slug: string;
  title?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  published?: boolean;
  position?: number;
};

export type WebsiteTheme = {
  primary?: string;
  secondary?: string;
  background?: string;
  text?: string;
  font?: string;
  radius?: string;
  buttonStyle?: string;
  cardStyle?: string;
  headerStyle?: string;
  footerStyle?: string;
  secondaryText?: string;
  headerBrand?: string;
  headerHome?: string;
  headerAbout?: string;
  headerProducts?: string;
  headerServices?: string;
  headerContact?: string;
  headerCta?: string;
  headerBrandColor?: string;
  headerHomeColor?: string;
  headerAboutColor?: string;
  headerProductsColor?: string;
  headerServicesColor?: string;
  headerContactColor?: string;
  headerCtaColor?: string;
};

export type OrganizationProfile = {
  name?: string | null;
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type SocialLinks = {
  facebook: string;
  instagram: string;
  linkedin: string;
  twitter: string;
};

export type MediaItem = {
  id?: number;
  name?: string;
  url: string;
};

export type CompanyProduct = {
  id: number;
  name: string;
  image_url?: string | null;
  description?: string | null;
  unit_price?: number | string | null;
  category?: string | null;
};

export type AccordionKey = "pages" | "blocks" | "style" | "contact" | "theme" | null;
