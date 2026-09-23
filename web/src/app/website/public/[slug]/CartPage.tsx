"use client";

import { Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CartLine, readCart, writeCart } from "./cart";
import styles from "./productCatalog.module.css";

type CartPageProps = Readonly<{
  slug: string;
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  secondaryTextColor: string;
}>;

function formatPrice(value: CartLine["product"]["price"]): string {
  if (typeof value === "number") return `${value.toLocaleString("fr-FR")} FCFA`;
  return value ? String(value) : "Prix sur demande";
}

function productImage(line: CartLine): string {
  return line.product.image || line.product.image_url || "";
}

export default function CartPage({ slug, siteName, primaryColor, secondaryColor, textColor, secondaryTextColor }: CartPageProps) {
  const [cart, setCart] = useState<CartLine[]>([]);

  useEffect(() => {
    setCart(readCart(slug));
  }, [slug]);

  const totalQuantity = useMemo(() => cart.reduce((total, line) => total + line.quantity, 0), [cart]);

  function changeQuantity(target: CartLine, delta: number) {
    const next = cart.map((line) => line === target ? { ...line, quantity: line.quantity + delta } : line).filter((line) => line.quantity > 0);
    setCart(next);
    writeCart(slug, next);
  }

  return (
    <main className={styles.pageShell} style={{ "--primary": primaryColor, "--secondary": secondaryColor, "--text": textColor, "--muted": secondaryTextColor } as React.CSSProperties}>
      <div className={styles.pageContainer}>
        <a href={`/site/${slug}/produits`} className={styles.backLink}>← Retour au catalogue</a>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>Votre sélection</p>
          <h1 className={styles.pageTitle}>Panier</h1>
          <p className={styles.pageLead}>Vérifiez vos articles avant de transmettre la demande à {siteName}.</p>
        </header>
        {cart.length === 0 ? (
          <section className={styles.emptyCart}>
            <ShoppingBag size={32} aria-hidden="true" />
            <h2>Votre panier est vide</h2>
            <p>Ajoutez des produits depuis le catalogue pour commencer.</p>
            <a href={`/site/${slug}/produits`} className={styles.btnSolid}><ShoppingBag size={15} /> Voir les produits</a>
          </section>
        ) : (
          <section className={styles.cartPageGrid}>
            <div className={styles.cartPageList}>
              {cart.map((line) => (
                <article className={styles.cartPageItem} key={line.product.id ?? line.product.name}>
                  <div className={styles.cartPageImage}>{productImage(line) ? <img src={productImage(line)} alt={line.product.name ?? "Produit"} /> : <span>{line.product.name?.slice(0, 1) ?? "?"}</span>}</div>
                  <div className={styles.cartPageInfo}>
                    <h2>{line.product.name ?? "Produit"}</h2>
                    <p>{line.product.description || "Produit disponible sur demande."}</p>
                    <strong>{formatPrice(line.product.price)}</strong>
                  </div>
                  <div className={styles.cartPageQuantity}>
                    <button type="button" onClick={() => changeQuantity(line, -1)} aria-label="Retirer"><Minus size={14} /></button>
                    <span>{line.quantity}</span>
                    <button type="button" onClick={() => changeQuantity(line, 1)} aria-label="Ajouter"><Plus size={14} /></button>
                  </div>
                </article>
              ))}
            </div>
            <aside className={styles.orderSummary}>
              <p className={styles.eyebrow}>Résumé</p>
              <h2>{totalQuantity} article{totalQuantity > 1 ? "s" : ""}</h2>
              <p>Le paiement sera confirmé directement avec l&apos;organisation.</p>
              <a href={`/site/${slug}/commande`} className={styles.btnSolid}>Continuer la commande <ArrowRight size={15} /></a>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
