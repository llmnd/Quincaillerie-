"use client";

import { Minus, Plus, ShoppingBag, ArrowRight, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartLine,
  readCart,
  writeCart,
  notifyCartUpdated,
} from "./cart";
import styles from "./productCatalog.module.css";

type CartPageProps = Readonly<{
  slug: string;
  onNavigate?: (href: string) => void;
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  secondaryTextColor: string;
}>;

function formatPrice(value: CartLine["product"]["price"]): string {
  if (typeof value === "number")
    return `${value.toLocaleString("fr-FR")} FCFA`;
  return value ? String(value) : "Prix sur demande";
}

function priceToNumber(value: CartLine["product"]["price"]): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function productImage(line: CartLine): string {
  return line.product.image || line.product.image_url || "";
}

function lineKey(line: CartLine): string {
  return String(line.product.id ?? line.product.name ?? Math.random());
}

export default function CartPage({
  slug,
  onNavigate,
  siteName,
  primaryColor,
  secondaryColor,
  textColor,
  secondaryTextColor,
}: CartPageProps) {
  const [cart, setCart] = useState<CartLine[]>([]);

  useEffect(() => {
    setCart(readCart(slug));
  }, [slug]);

  /* ---------- Persistance + notification différée ---------- */
  function persist(next: CartLine[]) {
    setCart(next);
    writeCart(slug, next);
    queueMicrotask(() => notifyCartUpdated(slug, "updated"));
  }

  function changeQuantity(target: CartLine, delta: number) {
    const next = cart
      .map((line) =>
        line === target
          ? { ...line, quantity: line.quantity + delta }
          : line
      )
      .filter((line) => line.quantity > 0);
    persist(next);
  }

  function removeLine(target: CartLine) {
    persist(cart.filter((line) => line !== target));
  }

  const totalQuantity = useMemo(
    () => cart.reduce((total, line) => total + line.quantity, 0),
    [cart]
  );

  const subtotal = useMemo(
    () =>
      cart.reduce((sum, line) => {
        const unit = priceToNumber(line.product.price);
        return unit === null ? sum : sum + unit * line.quantity;
      }, 0),
    [cart]
  );

  const hasPricedItems = useMemo(
    () =>
      cart.some((line) => priceToNumber(line.product.price) !== null),
    [cart]
  );

  return (
    <main
      className={styles.pageShell}
      style={
        {
          "--primary": primaryColor,
          "--secondary": secondaryColor,
          "--text": textColor,
          "--muted": secondaryTextColor,
        } as React.CSSProperties
      }
    >
      <div className={styles.pageContainer}>
        <a href={`/site/${slug}/produits`} className={styles.backLink}>
          ← Retour au catalogue
        </a>

        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>Votre sélection</p>
          <h1 className={styles.pageTitle}>Panier</h1>
          <p className={styles.pageLead}>
            Vérifiez vos articles avant de transmettre la demande à {siteName}.
          </p>
        </header>

        {cart.length === 0 ? (
          <section className={styles.emptyCart}>
            <ShoppingBag size={36} aria-hidden="true" />
            <h2>Votre panier est vide</h2>
            <p>
              Ajoutez des produits depuis le catalogue pour commencer votre
              demande.
            </p>
            <a href={`/site/${slug}/produits`} className={styles.btnSolid}>
              <ShoppingBag size={15} /> Voir les produits
            </a>
          </section>
        ) : (
          <section className={styles.cartPageGrid}>
            <div className={styles.cartPageList}>
              {cart.map((line) => (
                <article className={styles.cartPageItem} key={lineKey(line)}>
                  <div className={styles.cartPageImage}>
                    {productImage(line) ? (
                      <img
                        src={productImage(line)}
                        alt={line.product.name ?? "Produit"}
                      />
                    ) : (
                      <span>
                        {line.product.name?.slice(0, 1) ?? "?"}
                      </span>
                    )}
                  </div>

                  <div className={styles.cartPageInfo}>
                    <h2>{line.product.name ?? "Produit"}</h2>
                    <p>
                      {line.product.description ||
                        "Produit disponible sur demande."}
                    </p>
                    <strong>{formatPrice(line.product.price)}</strong>
                  </div>

                  <div className={styles.cartPageQuantity}>
                    <button
                      type="button"
                      onClick={() => changeQuantity(line, -1)}
                      aria-label={`Diminuer la quantité de ${
                        line.product.name ?? "produit"
                      }`}
                    >
                      <Minus size={14} />
                    </button>
                    <span>{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(line, 1)}
                      aria-label={`Augmenter la quantité de ${
                        line.product.name ?? "produit"
                      }`}
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLine(line)}
                      aria-label={`Retirer ${
                        line.product.name ?? "le produit"
                      } du panier`}
                      className={styles.removeBtn}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <aside className={styles.orderSummary}>
              <p className={styles.eyebrow}>Résumé</p>
              <h2>
                {totalQuantity} article{totalQuantity > 1 ? "s" : ""}
              </h2>

              {hasPricedItems && (
                <>
                  <div className={styles.summaryRow}>
                    <span>Sous-total</span>
                    <strong>
                      {subtotal.toLocaleString("fr-FR")} FCFA
                    </strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Livraison</span>
                    <strong>À définir</strong>
                  </div>
                  <div className={styles.summaryTotal}>
                    <span>Total estimé</span>
                    <strong>
                      {subtotal.toLocaleString("fr-FR")} FCFA
                    </strong>
                  </div>
                </>
              )}

              <p>
                Le paiement sera confirmé directement avec l&apos;organisation.
              </p>

              <a
                href={`/site/${slug}/commande`}
                className={styles.btnSolid}
                onClick={(event) => {
                  if (!onNavigate) return;
                  event.preventDefault();
                  onNavigate(`/site/${slug}/commande`);
                }}
              >
                Continuer la commande <ArrowRight size={15} />
              </a>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}