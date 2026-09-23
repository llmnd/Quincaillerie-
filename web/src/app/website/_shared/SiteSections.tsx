import type { CSSProperties } from "react";
import ProductCatalog from "../public/[slug]/productCatalog";
import styles from "./preview.module.css";

type Section = Readonly<{
  id?: number;
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
  editable?: boolean;
}>;

const sizes: Record<string, string> = { sm: "0.875rem", md: "1rem", lg: "1.25rem", xl: "1.75rem", "2xl": "2.5rem" };
const weights: Record<string, number> = { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 };

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : fallback;
}

function rich(value: unknown, fallback: string): string {
  const html = text(value);
  return html ? sanitizeInlineHtml(html) : fallback;
}

export function sanitizeInlineHtml(value: string): string {
  return value
    .replace(/<(?!\/?(?:strong|em|u|a)(?:\s[^>]*)?>)[^>]*>/gi, "")
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

function imageOf(product: Product): string {
  return product.image || product.image_url || "";
}

function productPrice(product: Product): string {
  const value = product.price ?? product.unit_price;
  return typeof value === "number" ? `${value.toLocaleString("fr-FR")} FCFA` : value ? String(value) : "Prix sur demande";
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

export default function SiteSections({ sections, products, siteName, textColor, secondaryTextColor, primaryColor, secondaryColor, slug }: SiteSectionsProps) {
  return <>{sections.filter((section) => section.visible !== false).map((section, index) => {
    const content = section.content ?? {};
    const key = section.id ?? `${section.type}-${index}`;
    const imageUrl = text(content.image, text(content.image_url));
    const title = text(content.title, section.type === "hero" ? "Bienvenue" : section.type === "banner" ? "Bannière" : section.type);
    const body = text(content.text, text(content.subtitle, "Contenu de cette section."));
    const titleHtml = rich(content.titleHtml, title);
    const bodyHtml = rich(content.textHtml, body);
    const buttonHtml = rich(content.buttonTextHtml, text(content.buttonText));

    if (section.type === "products" && slug) {
      const catalogProducts = products.map((product) => ({ ...product, image: imageOf(product), price: product.price ?? product.unit_price ?? null }));
      return <ProductCatalog key={key} slug={slug} products={catalogProducts} primaryColor={primaryColor} secondaryColor={secondaryColor} textColor={textColor} secondaryTextColor={secondaryTextColor} />;
    }

    if (section.type === "hero") {
      return <section key={key} className={styles.previewSiteBlock}><div className={styles.heroPreviewContent}><div><p className={styles.previewEyebrow}>{siteName}</p><h3 style={styleFor(content, "title")} dangerouslySetInnerHTML={{ __html: titleHtml }} /><p style={{ color: secondaryTextColor, ...styleFor(content, "text") }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />{text(content.buttonText) && <a href={text(content.buttonLink, "#contact")} className={styles.editableButton} style={styleFor(content, "button")} onClick={(event) => { if (!slug) event.preventDefault(); }} dangerouslySetInnerHTML={{ __html: buttonHtml }} />}</div>{imageUrl ? <div className={styles.previewHeroImage}><img src={imageUrl} alt={title} loading="lazy" decoding="async" /></div> : <div className={styles.heroPreviewVisual}>Image</div>}</div></section>;
    }

    if (section.type === "banner") {
      return <section key={key} className={styles.previewSiteBlock}>{imageUrl && <div className={styles.previewBannerImage}><img src={imageUrl} alt={title} loading="lazy" decoding="async" /></div>}<h3 style={styleFor(content, "title")} dangerouslySetInnerHTML={{ __html: titleHtml }} /><p style={{ color: secondaryTextColor, ...styleFor(content, "text") }} dangerouslySetInnerHTML={{ __html: bodyHtml }} /></section>;
    }

    if (section.type === "gallery") {
      return <section key={key} className={styles.previewSiteBlock}><h3 style={styleFor(content, "title")}>{title}</h3><ProductCards products={products} gallery /></section>;
    }

    return <section key={key} className={styles.previewSiteBlock}>{imageUrl && <div className={styles.previewSectionImage}><img src={imageUrl} alt={title} loading="lazy" decoding="async" /></div>}<h3 style={styleFor(content, "title")} dangerouslySetInnerHTML={{ __html: titleHtml }} /><p style={{ color: secondaryTextColor, ...styleFor(content, "text") }} dangerouslySetInnerHTML={{ __html: bodyHtml }} /></section>;
  })}</>;
}
