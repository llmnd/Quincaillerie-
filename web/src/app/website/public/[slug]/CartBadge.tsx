"use client";

import { ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { readCart } from "./cart";
import styles from "./productCatalog.module.css";

type CartBadgeProps = Readonly<{
  slug: string;
  textColor: string;
  secondaryColor: string;
  editable?: boolean;
  onSelect?: () => void;
  onSelectCount?: () => void;
  style?: CSSProperties;
  countStyle?: CSSProperties;
}>;

const CART_EVENTS = [
  "storage",
  "website-cart-added",
  "website-cart-updated",
] as const;

export default function CartBadge({
  slug,
  textColor,
  secondaryColor,
  editable = false,
  onSelect,
  onSelectCount,
  style,
  countStyle,
}: CartBadgeProps) {
  const [count, setCount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const previousCount = useRef<number | null>(null);
  const mountedRef = useRef(false);

  const refresh = useCallback(() => {
    if (!mountedRef.current) return;
    const next = readCart(slug).reduce(
      (total, line) => total + line.quantity,
      0
    );
    setCount(next);
  }, [slug]);

  /* ---------- Abonnement aux événements ---------- */
  useEffect(() => {
    mountedRef.current = true;

    // Lecture initiale différée pour ne pas setState pendant le render parent
    queueMicrotask(refresh);

    const handler = (event: Event) => {
      // Ignore les CustomEvent d'un autre site
      if (
        event instanceof CustomEvent &&
        typeof event.detail?.slug === "string" &&
        event.detail.slug !== slug
      ) {
        return;
      }
      // Différé : sort du cycle React en cours (protection anti-warning)
      queueMicrotask(refresh);
    };

    CART_EVENTS.forEach((name) => window.addEventListener(name, handler));
    return () => {
      mountedRef.current = false;
      CART_EVENTS.forEach((name) =>
        window.removeEventListener(name, handler)
      );
    };
  }, [refresh, slug]);

  /* ---------- Animation "pulse" ---------- */
  useEffect(() => {
    if (previousCount.current === null) {
      previousCount.current = count;
      return;
    }
    if (previousCount.current === count) return;

    previousCount.current = count;
    setPulse(true);
    const timer = window.setTimeout(() => setPulse(false), 450);
    return () => window.clearTimeout(timer);
  }, [count]);

  const label =
    count === 0
      ? "Panier vide"
      : `Panier, ${count} article${count > 1 ? "s" : ""}`;

  return (
    <a
      href={`/site/${slug}/panier`}
      className={styles.headerCart}
      style={{ color: textColor, borderColor: secondaryColor, ...style }}
      data-element-id={editable ? "headerCart" : undefined}
      aria-label={label}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        if (!editable) return;
        event.preventDefault();
        onSelect?.();
      }}
    >
      <ShoppingBag size={17} aria-hidden="true" />
      <span>Panier</span>
      <strong
        className={`${styles.headerCartCount} ${
          pulse ? styles.headerCartCountPulse : ""
        }`}
        style={{ background: secondaryColor, color: textColor, ...countStyle }}
        data-element-id={editable ? "headerCartCount" : undefined}
        onClick={(event) => {
          if (!editable) return;
          event.preventDefault();
          event.stopPropagation();
          onSelectCount?.();
        }}
        aria-hidden="true"
      >
        {count}
      </strong>
    </a>
  );
}