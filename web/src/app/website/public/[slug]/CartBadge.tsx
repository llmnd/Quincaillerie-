"use client";

import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { readCart } from "./cart";
import styles from "./productCatalog.module.css";

type CartBadgeProps = Readonly<{
  slug: string;
  textColor: string;
  secondaryColor: string;
}>;

export default function CartBadge({ slug, textColor, secondaryColor }: CartBadgeProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCount(readCart(slug).reduce((total, line) => total + line.quantity, 0));
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("website-cart-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("website-cart-updated", refresh);
    };
  }, [slug]);

  return (
    <a href={`/site/${slug}/panier`} className={styles.headerCart} style={{ color: textColor, borderColor: secondaryColor }} aria-label={`Panier${count ? `, ${count} article${count > 1 ? "s" : ""}` : "vide"}`}>
      <ShoppingBag size={17} aria-hidden="true" />
      <span>Panier</span>
      <strong className={styles.headerCartCount} style={{ background: secondaryColor, color: textColor }}>{count}</strong>
    </a>
  );
}
