import type { CSSProperties } from "react";
import ProductCatalog from "../public/[slug]/productCatalog";
import styles from "./preview.module.css";

type Section = Readonly<{
  id?: string | number;
  type: string;
  visible?: boolean;
  content?: Record<string, unknown>;
}>;

type Product = Readonly<{
  id?: number;
  name?: string;
  description?: string | null;
  price?: number | string | null;
  unit_price?: number | string | null;
  image?: string | null;
  image_url?: string | null;
  category?: string | null;
}>;

type SiteSectionsProps = Readonly<{
  sections: Section[];
  products: Product[];
  siteName: string;
  textColor: string;
  secondaryTextColor: string;
  primaryColor: string;
  secondaryColor: string;
  slug?: string;
  fontFamily?: string;
  editable?: boolean;
  onTextChange?: (section: Section, elementId: string, nextValue: string) => void;
  onNavigate?: (href: string) => void;
}>;

const sizes: Record<string, string> = { sm: "0.875rem", md: "1rem", lg: "1.25rem", xl: "1.75rem", "2xl": "2.5rem" };
const weights: Record<string, number> = { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 };

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : fallback;
}

function enabled(value: unknown): boolean {
  return value !== false && value !== "false";
}

function spacingStyle(content: Record<string, unknown>): CSSProperties {
  const value = (key: string, fallback: number) => {
    const parsed = Number(content[key]);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(96, parsed)) : fallback;
  };
  return {
    "--section-padding-desktop": `${value("spacingDesktop", 20)}px ${value("spacingHorizontal", 22)}px`,
    "--section-padding-tablet": `${value("spacingTablet", 16)}px ${value("spacingHorizontalTablet", 18)}px`,
    "--section-padding-mobile": `${value("spacingMobile", 14)}px ${value("spacingHorizontalMobile", 14)}px`,
    "--section-gap": `${value("elementGap", 12)}px`,
  } as CSSProperties;
}

function decodeHtmlEntities(value: string): string {
  let decoded = value;
  for (let step = 0; step < 3; step += 1) {
    const next = decoded
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&quot;/gi, '"');
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

function rich(value: unknown, fallback: string): string {
  const html = text(value);
  return html ? sanitizeInlineHtml(html) : fallback;
}

function publicLink(value: unknown, slug?: string): string | undefined {
  const link = text(value).trim();
  if (!link) return slug ? `/site/${slug}` : undefined;
  if (!slug || link.startsWith("#") || /^(?:https?:|mailto:|tel:)/i.test(link)) return link;
  if (link === "/" || link === "/accueil" || link === "accueil") return `/site/${slug}`;
  if (link === `/site/${slug}` || link.startsWith(`/site/${slug}/`)) return link;
  const path = link.replace(/^\/+/, "");
  return `/site/${slug}/${path}`;
}

export function sanitizeInlineHtml(value: string): string {
  const decoded = decodeHtmlEntities(value);
  return decoded
    .replace(/<div(?:\s[^>]*)?>/gi, "<br>")
    .replace(/<\/div>/gi, "")
    .replace(/<(?!\/?(?:strong|em|u|a|br)(?:\s[^>]*)?>)[^>]*>/gi, "")
    .replace(/\s(?:style|class|id|target|rel)\s*=\s*(["']).*?\1/gi, "")
    .replace(/href\s*=\s*(["'])\s*(?:javascript:|data:).*?\1/gi, 'href="#"')
    .trim();
}

function styleFor(content: Record<string, unknown>, prefix: "title" | "text" | "button"): CSSProperties {
  const size = text(content[`${prefix}Size`]);
  const weight = text(content[`${prefix}Weight`]);
  const color = text(content[`${prefix}Color`]);
  const align = text(content[`${prefix}Align`]);
  return {
    ...(sizes[size] ? { fontSize: sizes[size] } : {}),
    ...(weights[weight] ? { fontWeight: weights[weight] } : {}),
    ...(color ? { color } : {}),
    ...(align === "left" || align === "center" || align === "right" ? { textAlign: align } : {}),
    ...(content[`${prefix}Italic`] === "true" ? { fontStyle: "italic" } : {}),
    ...(content[`${prefix}Underline`] === "true" ? { textDecoration: "underline" } : {}),
  };
}

function sizeFromContent(value: unknown): CSSProperties["fontSize"] | undefined {
  const key = text(value);
  return key && sizes[key] ? sizes[key] : undefined;
}

function weightFromContent(value: unknown): CSSProperties["fontWeight"] | undefined {
  const key = text(value);
  return key && weights[key] ? weights[key] : undefined;
}

function imageOf(product: Product): string {
  return product.image || product.image_url || "";
}

function productPrice(product: Product): string {
  const value = product.price ?? product.unit_price;
  return typeof value === "number" ? `${value.toLocaleString("fr-FR")} FCFA` : value ? String(value) : "Prix sur demande";
}

function looksLikeRouteLikeValue(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  if (/^(?:https?:|mailto:|tel:|#)/i.test(raw)) return true;
  if (raw.startsWith("/") || raw.startsWith("./") || raw.startsWith("../")) return true;
  return raw.includes("/") && !raw.includes(" ");
}

function readableButtonText(value: unknown, fallback: string): string {
  const raw = decodeHtmlEntities(text(value).trim());
  if (!raw) return fallback;
  const asPlainText = sanitizeInlineHtml(raw)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!asPlainText) return fallback;
  if (looksLikeRouteLikeValue(asPlainText)) return fallback;
  return asPlainText;
}

function ProductCards({ products, gallery = false }: { products: Product[]; gallery?: boolean }) {
  const fallback: Product[] = Array.from({ length: gallery ? 4 : 3 }, (_, index) => ({ id: -index - 1, name: `${gallery ? "Image" : "Produit"} ${index + 1}`, category: null }));
  const items = products.length ? products.slice(0, gallery ? 4 : 3) : fallback;
  return (
    <div className={styles.productGrid}>
      {items.map((product, index) => (
        <article key={product.id ?? index} className={styles.productCard}>
          <div className={styles.productImage}>
            {imageOf(product) ? <img src={imageOf(product)} alt={product.name ?? "Produit"} loading="lazy" decoding="async" /> : `${gallery ? "Image" : "Produit"} ${index + 1}`}
          </div>
          {!gallery && <div className={styles.productMeta}><span>{product.category ?? "Catégorie"}</span><strong>{product.name}</strong><em>{productPrice(product)}</em></div>}
        </article>
      ))}
    </div>
  );
}

export function getDefaultSectionsForTemplate(template?: string): Section[] {
  const templateName = template || "commerce";
  const commerceSections = [
    {
      id: "default-hero",
      type: "hero",
      visible: true,
      position: 0,
      content: {
        title: "Bienvenue",
        subtitle: "Votre boutique professionnelle",
        buttonText: "Découvrir",
        buttonLink: "/produits",
      },
      settings: {},
    },
    {
      id: "default-products",
      type: "products",
      visible: true,
      position: 1,
      content: {
        source: "products",
        limit: 8,
        show_price: true,
        show_image: true,
        show_description: true,
      },
      settings: { title: "Nos meilleures ventes" },
    },
  ];

  const servicesSections = [
    {
      id: "default-services-hero",
      type: "hero",
      visible: true,
      position: 0,
      content: {
        title: "Votre expertise à portée de main",
        subtitle: "Des services fiables et professionnels",
        buttonText: "Découvrir",
        buttonLink: "/services",
      },
      settings: { align: "left", height: "medium" },
    },
    {
      id: "default-services-features",
      type: "features",
      visible: true,
      position: 1,
      content: {
        items: [
          { title: "Expertise", text: "Conseils métier" },
          { title: "Réactivité", text: "Support rapide" },
        ],
      },
      settings: { title: "Pourquoi nous choisir ?" },
    },
  ];

  return templateName === "services" ? servicesSections : commerceSections;
}

export default function SiteSections({
  sections,
  products,
  siteName,
  textColor,
  secondaryTextColor,
  primaryColor,
  secondaryColor,
  slug,
  fontFamily,
  editable = false,
  onTextChange,
  onNavigate,
  selectedSectionId,
  onSelectSection,
}: SiteSectionsProps & {
  selectedSectionId?: string | number | null;
  onSelectSection?: (section: Section | null, elementId?: string | null) => void;
}) {
  const selectSection = (section: Section, elementId: string | null = null) => {
    if (!editable || !onSelectSection) return;
    onSelectSection(section, elementId ?? "title");
  };

  const interactiveTextProps = (section: Section, elementId: string) => {
    if (!editable) return undefined;
    return {
      contentEditable: true,
      suppressContentEditableWarning: true,
      spellCheck: false,
      onMouseDown: (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        selectSection(section, elementId);
      },
      onFocus: (event: React.FocusEvent<HTMLElement>) => {
        event.stopPropagation();
        selectSection(section, elementId);
      },
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        selectSection(section, elementId);
      },
      onInput: (event: React.FormEvent<HTMLElement>) => {
        const value = sanitizeInlineHtml(event.currentTarget.innerHTML || event.currentTarget.textContent || "");
        if (value) onTextChange?.(section, elementId, value);
      },
      onBlur: (event: React.FocusEvent<HTMLElement>) => {
        const value = sanitizeInlineHtml(event.currentTarget.innerHTML || event.currentTarget.textContent || "");
        if (value) onTextChange?.(section, elementId, value);
      },
      onDoubleClick: (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
        event.stopPropagation();
        selectSection(section, elementId);
      },
      role: "button" as const,
      tabIndex: 0,
      "data-section-id": String(section.id ?? `${section.type}-${elementId}`),
      "data-element-id": elementId,
      "data-editor-type": "text" as const,
    };
  };

  return <>{sections.filter((section) => section.visible !== false).map((section, index) => {
    const content = section.content ?? {};
    const key = section.id ?? `${section.type}-${index}`;
    const imageUrl = text(content.image, text(content.image_url));
    const title = text(content.title, section.type === "hero" ? "Bienvenue" : section.type === "banner" ? "Bannière" : section.type);
    const body = text(content.text, text(content.subtitle, "Contenu de cette section."));
    const titleHtml = rich(content.titleHtml, title);
    const bodyHtml = rich(content.textHtml, body);
    const buttonText = readableButtonText(content.buttonText, "Découvrir");
    const storedButtonHtml = text(content.buttonTextHtml).trim();
    const cleanStoredButtonText = sanitizeInlineHtml(storedButtonHtml).replace(/<[^>]*>/g, "").trim();
    const safeButtonHtml = storedButtonHtml && !looksLikeRouteLikeValue(cleanStoredButtonText) ? storedButtonHtml : "";
    const buttonHtml = rich(safeButtonHtml || buttonText, buttonText);
    const hasButton = Boolean(buttonText || safeButtonHtml);
    const isSelected = selectedSectionId != null && selectedSectionId === section.id;
    const baseSectionProps = {
      className: `${styles.previewSiteBlock} ${isSelected ? styles.previewSiteBlockSelected : ""}`.trim(),
      style: spacingStyle(content),
      onClick: editable ? (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
        event.stopPropagation();
        selectSection(section, null);
      } : undefined,
      role: editable ? "button" as const : undefined,
      tabIndex: editable ? 0 : undefined,
      "data-section-id": String(section.id ?? key),
      "data-editor-type": editable ? "section" as const : undefined,
    };

    if (section.type === "products" && slug) {
      const catalogProducts = products.map((product) => ({ ...product, image: imageOf(product), price: product.price ?? product.unit_price ?? null }));
      const catalogFieldStyles = {
        eyebrow: {
          color: String((content.eyebrowColor as string | undefined) ?? ""),
          fontSize: sizeFromContent(content.eyebrowSize),
          fontWeight: weightFromContent(content.eyebrowWeight),
          textAlign: (content.eyebrowAlign as "left" | "center" | "right" | undefined) ?? undefined,
        },
        title: {
          color: String((content.titleColor as string | undefined) ?? ""),
          fontSize: sizeFromContent(content.titleSize),
          fontWeight: weightFromContent(content.titleWeight),
          textAlign: (content.titleAlign as "left" | "center" | "right" | undefined) ?? undefined,
        },
        introText: {
          color: String((content.subtitleColor as string | undefined) ?? ""),
          fontSize: sizeFromContent(content.subtitleSize),
          fontWeight: weightFromContent(content.subtitleWeight),
          textAlign: (content.subtitleAlign as "left" | "center" | "right" | undefined) ?? undefined,
        },
      } as Record<string, CSSProperties>;

      const catalogEditingProps = editable
        ? {
            editable: true,
            fieldStyles: catalogFieldStyles,
            onTextChange: (field: string, value: string) => onTextChange?.(section, field, value),
            onSelectField: (field: string) => onSelectSection?.(section, field),
          }
        : {};

      return <div key={key} {...baseSectionProps}>
        <ProductCatalog
          slug={slug}
          sectionId={String(section.id ?? key)}
          products={catalogProducts}
          {...catalogEditingProps}
          eyebrowText={text(content.eyebrow, "Catalogue")}
          title={text(content.title, "Nos produits")}
          introText={text(content.subtitle, text(content.text, "Choisissez vos produits et envoyez votre demande directement à l'entreprise."))}
          categoryLabel={text(content.categoryLabel, "Catégorie")}
          allCategoriesLabel={text(content.allCategoriesLabel, "Toutes")}
          searchPlaceholder={text(content.searchPlaceholder, "Rechercher un produit")}
          resetLabel={text(content.resetLabel, "Réinitialiser les filtres")}
          noResultsTitle={text(content.noResultsTitle, "Aucun produit trouvé")}
          noResultsText={text(content.noResultsText, "Essayez d'autres mots-clés ou parcourez toutes les catégories pour découvrir l'ensemble du catalogue.")}
          showPrices={enabled(content.show_price) && enabled(content.showPrices)}
          showDescriptions={enabled(content.show_description) && enabled(content.showDescriptions)}
          showCategories={enabled(content.show_category) && enabled(content.showCategories)}
          showSearch={enabled(content.show_search) && enabled(content.showSearch)}
          showFilters={enabled(content.show_filters) && enabled(content.showFilters)}
          columns={Number(content.columns ?? 3) || 3}
          columnsTablet={Number(content.columns_tablet ?? 2) || 2}
          columnsMobile={Number(content.columns_mobile ?? 2) || 2}
          spacingDesktop={Number(content.spacingDesktop ?? 20) || 20}
          spacingTablet={Number(content.spacingTablet ?? 16) || 16}
          spacingMobile={Number(content.spacingMobile ?? 14) || 14}
          elementGap={Number(content.elementGap ?? 12) || 12}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          textColor={textColor}
          secondaryTextColor={secondaryTextColor}
          fontFamily={fontFamily}
        />
      </div>;
    }

    if (section.type === "hero") {
      const titleProps = interactiveTextProps(section, "title");
      const subtitleProps = interactiveTextProps(section, "text");
      const buttonProps = interactiveTextProps(section, "button");
      const buttonHref = publicLink(content.buttonLink, slug);
      const navigationProps = onNavigate && buttonHref
        ? { onClick: (event: React.MouseEvent<HTMLAnchorElement>) => { event.preventDefault(); onNavigate(buttonHref); } }
        : {};
      return <section key={key} {...baseSectionProps} className={`${styles.previewSiteBlock} ${styles.heroBlock} ${isSelected ? styles.previewSiteBlockSelected : ""} siteHeroBlock`.trim()} style={{ ...spacingStyle(content), "--site-primary": primaryColor, "--site-secondary": secondaryColor, "--site-text": textColor, "--site-secondary-text": secondaryTextColor, fontFamily } as CSSProperties}><div className={styles.heroPreviewContent}><div><p className={styles.previewEyebrow}>{siteName}</p><h3 {...titleProps} style={styleFor(content, "title")} dangerouslySetInnerHTML={{ __html: titleHtml }} /><p {...subtitleProps} style={{ color: secondaryTextColor, ...styleFor(content, "text") }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />{hasButton && <a {...buttonProps} {...navigationProps} href={buttonHref} className={styles.editableButton} style={styleFor(content, "button")} dangerouslySetInnerHTML={{ __html: buttonHtml }} />}</div>{imageUrl ? <div className={styles.previewHeroImage}><img src={imageUrl} alt={title} loading="lazy" decoding="async" /></div> : <div className={styles.heroPreviewVisual}>Image</div>}</div></section>;
    }

    if (section.type === "banner") {
      const titleProps = interactiveTextProps(section, "title");
      const subtitleProps = interactiveTextProps(section, "text");
      return <section key={key} {...baseSectionProps}>{imageUrl && <div className={styles.previewBannerImage}><img src={imageUrl} alt={title} loading="lazy" decoding="async" /></div>}<h3 {...titleProps} style={styleFor(content, "title")} dangerouslySetInnerHTML={{ __html: titleHtml }} /><p {...subtitleProps} style={{ color: secondaryTextColor, ...styleFor(content, "text") }} dangerouslySetInnerHTML={{ __html: bodyHtml }} /></section>;
    }

    if (section.type === "gallery") {
      const titleProps = interactiveTextProps(section, "title");
      return <section key={key} {...baseSectionProps}><h3 {...titleProps} style={styleFor(content, "title")}>{title}</h3><ProductCards products={products} gallery /></section>;
    }

    const titleProps = interactiveTextProps(section, "title");
    const subtitleProps = interactiveTextProps(section, "text");
    return <section key={key} {...baseSectionProps}>{imageUrl && <div className={styles.previewSectionImage}><img src={imageUrl} alt={title} loading="lazy" decoding="async" /></div>}<h3 {...titleProps} style={styleFor(content, "title")} dangerouslySetInnerHTML={{ __html: titleHtml }} /><p {...subtitleProps} style={{ color: secondaryTextColor, ...styleFor(content, "text") }} dangerouslySetInnerHTML={{ __html: bodyHtml }} /></section>;
  })}</>;
}
