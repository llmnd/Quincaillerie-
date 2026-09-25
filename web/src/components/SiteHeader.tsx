"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import CartBadge from "../app/website/public/[slug]/CartBadge";
import styles from "./SiteHeader.module.css";

type SiteHeaderProps = Readonly<{
  slug: string;
  siteName: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  headerStyle?: string;
  backHref?: string;
  preview?: boolean;
  showCart?: boolean;
  labels?: Partial<{
    home: string;
    about: string;
    products: string;
    services: string;
    contact: string;
    cta: string;
  }>;
  labelColors?: Partial<Record<"brand" | "home" | "about" | "products" | "services" | "contact" | "cta" | "cart" | "cartCount", string>>;
}>;

export default function SiteHeader({
  slug,
  siteName,
  logo,
  primaryColor,
  secondaryColor,
  textColor,
  headerStyle,
  backHref,
  labels,
  preview = false,
  showCart = true,
  labelColors,
}: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const base = preview ? "#": `/site/${slug}`;
  const links = [
    { label: labels?.home || "Accueil", href: preview ? "#accueil" : `${base}#accueil` },
    { label: labels?.about || "À propos", href: preview ? "#apropos" : `${base}#apropos` },
    { label: labels?.products || "Produits", href: preview ? "#produits" : `${base}/produits` },
    { label: labels?.services || "Services", href: preview ? "#services" : `${base}#services` },
    { label: labels?.contact || "Contact", href: preview ? "#contact" : `${base}#contact` },
    { label: "Commande", href: preview ? "#commande" : `${base}/commande` },
    { label: "Panier", href: preview ? "#panier" : `${base}/panier` },
  ];

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    const closeOnViewportChange = () => {
      if (window.innerWidth > 820) setOpen(false);
    };
    window.addEventListener("resize", closeOnViewportChange);
    return () => window.removeEventListener("resize", closeOnViewportChange);
  }, []);

  return (
    <header className={`${styles.header} ${preview ? styles.previewHeader : ""} ${headerStyle === "centered" ? styles.headerCentered : ""}`} style={{ "--primary": primaryColor, "--secondary": secondaryColor, "--text": textColor } as React.CSSProperties}>
      <a href={backHref ?? `/site/${slug}`} className={styles.brand} onClick={() => setOpen(false)}>
        {logo ? <img src={logo} alt="" className={styles.logo} /> : <span className={styles.initials}>{siteName.slice(0, 2).toUpperCase()}</span>}
        <span className={styles.siteName} style={labelColors?.brand ? { color: labelColors.brand } : undefined}>{siteName}</span>
      </a>

      <button
        type="button"
        className={styles.menuButton}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        aria-controls="site-navigation"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X size={20} strokeWidth={1.35} /> : (
          <span className={styles.menuLines} aria-hidden="true">
            <span />
            <span />
          </span>
        )}
      </button>

      <nav id="site-navigation" className={`${styles.navigation} ${open ? styles.navigationOpen : ""}`} aria-label="Navigation principale">
        {links.map((link, index) => {
          const colorKey = ["home", "about", "products", "services", "contact", "cta", "cta"][index] as keyof typeof labelColors;
          return (
          <a key={link.label} href={link.href} onClick={() => setOpen(false)} style={labelColors?.[colorKey] ? { color: labelColors[colorKey] } : undefined}>{link.label}</a>
          );
        })}
        {showCart && (
          <CartBadge
            slug={slug}
            textColor={labelColors?.cart ?? textColor}
            secondaryColor={secondaryColor}
            countStyle={labelColors?.cartCount ? { color: labelColors.cartCount } : undefined}
          />
        )}
        <a href={preview ? "#contact" : `${base}#contact`} className={styles.contactLink} onClick={() => setOpen(false)} style={labelColors?.cta ? { color: labelColors.cta } : undefined}>{labels?.cta || "Contactez-nous"}</a>
      </nav>
    </header>
  );
}
