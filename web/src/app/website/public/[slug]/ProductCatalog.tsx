"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { readCart, writeCart, type CartLine } from "./cart";
import styles from "./productCatalog.module.css";

type Product = {
  id?: number;
  name?: string;
  description?: string | null;
  price?: number | string | null;
  image?: string | null;
  image_url?: string | null;
  category?: string | null;
};

type ProductCatalogProps = Readonly<{
  slug: string;
  products: Product[];
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  secondaryTextColor: string;
}>;

function formatPrice(value: Product["price"]): string {
  if (typeof value === "number") return `${value.toLocaleString("fr-FR")} FCFA`;
  return value ? String(value) : "Prix sur demande";
}

function productKey(product: Product, index: number): string | number {
  return product.id ?? `${product.name ?? "produit"}-${index}`;
}

function productImage(product: Product): string {
  return product.image || product.image_url || "";
}

export default function ProductCatalog({
  slug,
  products,
  primaryColor,
  secondaryColor,
  textColor,
  secondaryTextColor,
}: ProductCatalogProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Toutes");
  const [selected, setSelected] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);

  useEffect(() => {
    setCart(readCart(slug));
  }, [slug]);

  const categories = useMemo(() => [
    "Toutes",
    ...Array.from(new Set(products.map((product) => product.category?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "fr")),
  ], [products]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) =>
      (category === "Toutes" || product.category?.trim() === category) &&
      (!normalized || [product.name, product.category, product.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)))
    );
  }, [category, products, query]);

  /* ---------- Fermer les modales à l'Escape ---------- */
  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handler);
    };
  }, [selected]);

  /* ---------- Actions panier ---------- */
  function addToRequest(product: Product) {
    setCart((current) => {
      const cartProduct = { ...product, image: productImage(product) || null };
      const index = current.findIndex((line) => line.product.id === product.id || line.product.name === product.name);
      const next = index >= 0
        ? current.map((line, i) => i === index ? { ...line, quantity: line.quantity + 1 } : line)
        : [...current, { product: cartProduct, quantity: 1 }];
      writeCart(slug, next);
      return next;
    });
  }

  function resetQuery() {
    setQuery("");
  }

  function resetFilters() {
    setQuery("");
    setCategory("Toutes");
  }

  const themeVars = {
    "--primary": primaryColor,
    "--secondary": secondaryColor,
    "--text": textColor,
    "--muted": secondaryTextColor,
  } as React.CSSProperties;

  return (
    <section id="produits" className={styles.section} style={themeVars}>
      {/* ============================= EN-TÊTE ============================= */}
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <p className={styles.eyebrow}>Catalogue</p>
          <h2 className={styles.title}>Nos produits</h2>
          <p className={styles.subtitle}>
            Choisissez vos produits et envoyez votre demande directement à
            l&apos;entreprise.
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit"
              aria-label="Rechercher un produit"
              className={styles.searchInput}
            />
            {query && (
              <button
                type="button"
                onClick={resetQuery}
                className={styles.searchClear}
                aria-label="Effacer la recherche"
              >
                <X size={12} />
              </button>
            )}
          </div>

        </div>
      </header>

      <div className={styles.categoryFilters} aria-label="Filtrer par catégorie">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className={`${styles.categoryFilter} ${category === item ? styles.categoryFilterActive : ""}`}
            onClick={() => setCategory(item)}
            aria-pressed={category === item}
          >
            {item}
          </button>
        ))}
      </div>

      <div className={styles.resultsMeta} aria-live="polite">
        <span>
          {filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""}
          {category !== "Toutes" ? ` dans ${category}` : ""}
        </span>
        {(query || category !== "Toutes") && (
          <button type="button" onClick={resetFilters}>
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* ============================= GRILLE ============================= */}
      {filteredProducts.length === 0 ? (
        <div className={styles.empty}>
          <p>Aucun produit ne correspond à votre recherche.</p>
          {(query || category !== "Toutes") && (
            <button type="button" onClick={resetFilters}>
              Réinitialiser la recherche
            </button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredProducts.map((product, index) => {
            const inCart = cart.find((line) => line.product.id === product.id || line.product.name === product.name);
            return (
              <article
                key={productKey(product, index)}
                className={styles.card}
              >
                <button
                  type="button"
                  className={styles.cardMain}
                  onClick={() => setSelected(product)}
                  aria-label={`Voir ${product.name ?? "le produit"}`}
                >
                  <div className={styles.cardImageWrap}>
                    {product.category && (
                      <span className={styles.cardCategory}>
                        {product.category}
                      </span>
                    )}
                    {inCart && (
                      <span className={styles.cardBadge}>{inCart.quantity}</span>
                    )}
                    {productImage(product) ? (
                      <img
                        src={productImage(product)}
                        alt={product.name ?? "Produit"}
                        className={styles.cardImage}
                        loading={index < 4 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    ) : (
                      <div className={styles.cardImageFallback}>
                        {product.name?.slice(0, 1).toUpperCase() ?? "?"}
                      </div>
                    )}
                  </div>

                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>
                      {product.name || "Produit"}
                    </h3>
                    <p className={styles.cardDescription}>
                      {product.description || "Produit disponible sur demande."}
                    </p>
                    <strong className={styles.cardPrice}>
                      {formatPrice(product.price)}
                    </strong>
                  </div>
                </button>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.btnOutline}
                    onClick={() => setSelected(product)}
                  >
                    Voir
                  </button>
                  <button
                    type="button"
                    className={styles.btnSolid}
                    onClick={() => addToRequest(product)}
                  >
                    <Plus size={13} aria-hidden="true" />
                    Commander
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ============================= MODALE DÉTAIL ============================= */}
      {selected && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSelected(null)}
          role="presentation"
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className={styles.modalHeader}>
              <div className={styles.modalHeaderText}>
                <p className={styles.modalEyebrow}>
                  {selected.category || "Référence"}
                </p>
                <h2 id="product-detail-title" className={styles.modalTitle}>
                  {selected.name || "Produit"}
                </h2>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setSelected(null)}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </header>

            <div className={styles.modalBody}>
              {productImage(selected) && (
                <img
                  src={productImage(selected)}
                  alt={selected.name ?? "Produit"}
                  className={styles.modalImage}
                />
              )}
              <p className={styles.modalDescription}>
                {selected.description || "Produit disponible sur demande."}
              </p>
              <strong className={styles.modalPrice}>
                {formatPrice(selected.price)}
              </strong>
              <button
                type="button"
                className={styles.btnSolid}
                style={{ width: "100%" }}
                onClick={() => {
                  addToRequest(selected);
                  setSelected(null);
                }}
              >
                <Plus size={14} aria-hidden="true" />
                Ajouter à ma demande
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}