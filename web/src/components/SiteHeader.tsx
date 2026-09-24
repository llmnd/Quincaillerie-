"use client";

import { Search, X } from "lucide-react";
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
  labels?: Partial<{
    home: string;
    about: string;
    products: string;
    services: string;
    contact: string;
    cta: string;
  }>;
}>;

export default function SiteHeader({ slug, siteName, logo, primaryColor, secondaryColor, textColor, headerStyle, backHref, labels }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const links = [
    { label: labels?.home || "Accueil", href: `/site/${slug}#accueil` },
    { label: labels?.about || "À propos", href: `/site/${slug}#apropos` },
    { label: labels?.products || "Produits", href: `/site/${slug}/produits` },
    { label: labels?.services || "Services", href: `/site/${slug}#services` },
    { label: labels?.contact || "Contact", href: `/site/${slug}#contact` },
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
    <header className={`${styles.header} ${headerStyle === "centered" ? styles.headerCentered : ""}`} style={{ "--primary": primaryColor, "--secondary": secondaryColor, "--text": textColor } as React.CSSProperties}>
      <a href={backHref ?? `/site/${slug}`} className={styles.brand} onClick={() => setOpen(false)}>
        {logo ? <img src={logo} alt="" className={styles.logo} /> : <span className={styles.initials}>{siteName.slice(0, 2).toUpperCase()}</span>}
        <span className={styles.siteName}>{siteName}</span>
      </a>

      <CartBadge slug={slug} textColor={textColor} secondaryColor={secondaryColor} />

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
        {links.map((link) => (
          <a key={link.label} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>
        ))}
        <a href={`/site/${slug}#contact`} className={styles.contactLink} onClick={() => setOpen(false)}>{labels?.cta || "Contactez-nous"}</a>
      </nav>
    </header>
  );
}
