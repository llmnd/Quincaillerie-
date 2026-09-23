"use client";

import { Menu, X } from "lucide-react";
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
  backHref?: string;
}>;

export default function SiteHeader({ slug, siteName, logo, primaryColor, secondaryColor, textColor, backHref }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "Accueil", href: `/site/${slug}#accueil` },
    { label: "À propos", href: `/site/${slug}#apropos` },
    { label: "Produits", href: `/site/${slug}/produits` },
    { label: "Services", href: `/site/${slug}#services` },
    { label: "Contact", href: `/site/${slug}#contact` },
  ];

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header className={styles.header} style={{ "--primary": primaryColor, "--secondary": secondaryColor, "--text": textColor } as React.CSSProperties}>
      <a href={backHref ?? `/site/${slug}`} className={styles.brand} onClick={() => setOpen(false)}>
        {logo ? <img src={logo} alt="" className={styles.logo} /> : <span className={styles.initials}>{siteName.slice(0, 2).toUpperCase()}</span>}
        <span className={styles.siteName}>{siteName}</span>
      </a>

      <button
        type="button"
        className={styles.menuButton}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        aria-controls="site-navigation"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      <nav id="site-navigation" className={`${styles.navigation} ${open ? styles.navigationOpen : ""}`} aria-label="Navigation principale">
        {links.map((link) => (
          <a key={link.label} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>
        ))}
        <CartBadge slug={slug} textColor={textColor} secondaryColor={secondaryColor} />
        <a href={`/site/${slug}#contact`} className={styles.contactLink} onClick={() => setOpen(false)}>Contactez-nous</a>
      </nav>
    </header>
  );
}
