"use client";

import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import {
  readCart,
  writeCart,
  notifyCartUpdated,
  type CartLine,
} from "./cart";
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

type SortKey = "default" | "price-asc" | "price-desc" | "name";

type ProductCatalogProps = Readonly<{
  slug: string;
  products: Product[];
  eyebrowText?: string;
  title?: string;
  introText?: string;
  categoryLabel?: string;
  allCategoriesLabel?: string;
  searchPlaceholder?: string;
  resetLabel?: string;
  noResultsTitle?: string;
  noResultsText?: string;
  editable?: boolean;
  sectionId?: string | number;
  fieldStyles?: Partial<Record<string, CSSProperties>>;
  onTextChange?: (field: string, value: string) => void;
  onSelectField?: (field: string) => void;
  showPrices?: boolean;
  showDescriptions?: boolean;
  showCategories?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  showSort?: boolean;
  columns?: number;
  columnsTablet?: number;
  columnsMobile?: number;
  spacingDesktop?: number;
  spacingTablet?: number;
  spacingMobile?: number;
  elementGap?: number;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  secondaryTextColor: string;
  fontFamily?: string;
}>;

function formatPrice(value: Product["price"]): string {
  if (typeof value === "number")
    return `${value.toLocaleString("fr-FR")} FCFA`;
  return value ? String(value) : "Prix sur demande";
}

function numericPrice(value: Product["price"]): number {
  if (typeof value === "number") return value;
  const parsed = parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
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
  eyebrowText = "Catalogue",
  title = "Nos produits",
  introText = "Choisissez vos produits et envoyez votre demande directement à l'entreprise.",
  categoryLabel = "Catégorie",
  allCategoriesLabel = "Toutes",
  searchPlaceholder = "Rechercher un produit",
  resetLabel = "Réinitialiser les filtres",
  noResultsTitle = "Aucun produit trouvé",
  noResultsText = "Essayez d'autres mots-clés ou parcourez toutes les catégories pour découvrir l'ensemble du catalogue.",
  editable = false,
  sectionId,
  fieldStyles,
  onTextChange,
  onSelectField,
  showPrices = true,
  showDescriptions = true,
  showCategories = true,
  showSearch = true,
  showFilters = true,
  showSort = true,
  columns = 3,
  columnsTablet = 2,
  columnsMobile = 2,
  spacingDesktop = 20,
  spacingTablet = 16,
  spacingMobile = 14,
  elementGap = 12,
  primaryColor,
  secondaryColor,
  textColor,
  secondaryTextColor,
  fontFamily,
}: ProductCatalogProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(allCategoriesLabel);
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [selected, setSelected] = useState<Product | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>(() => readCart(slug));
  const [pulseKey, setPulseKey] = useState<string | number | null>(null);
  const [drafts, setDrafts] = useState({
    eyebrow: eyebrowText,
    title: title,
    introText: introText,
    categoryLabel,
    allCategoriesLabel,
    searchPlaceholder,
    resetLabel,
    noResultsTitle,
    noResultsText,
  });

  const cartRef = useRef<CartLine[]>([]);
  const categoryRef = useRef<HTMLDivElement>(null);
  const productPointerRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressProductClickRef = useRef(false);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const catalogAllCategoriesLabel = drafts.allCategoriesLabel || allCategoriesLabel;

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((product) => {
      const cat = product.category?.trim();
      if (cat) counts.set(cat, (counts.get(cat) ?? 0) + 1);
    });
    return [
      { name: catalogAllCategoriesLabel, count: products.length },
      ...Array.from(counts.entries())
        .sort(([a], [b]) => a.localeCompare(b, "fr"))
        .map(([name, count]) => ({ name, count })),
    ];
  }, [catalogAllCategoriesLabel, products]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const list = products.filter(
      (product) =>
        (category === catalogAllCategoriesLabel || product.category?.trim() === category) &&
        (!normalized ||
          [product.name, product.category, product.description]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(normalized)
            ))
    );

    if (sortBy === "default") return list;

    return [...list].sort((a, b) => {
      if (sortBy === "name")
        return (a.name ?? "").localeCompare(b.name ?? "", "fr", {
          sensitivity: "base",
        });
      const pa = numericPrice(a.price);
      const pb = numericPrice(b.price);
      return sortBy === "price-asc" ? pa - pb : pb - pa;
    });
  }, [catalogAllCategoriesLabel, category, products, query, sortBy]);

  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handler);
    };
  }, [selected]);

  useEffect(() => {
    if (!categoryOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCategoryOpen(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (
        categoryRef.current &&
        event.target instanceof Node &&
        !categoryRef.current.contains(event.target)
      ) {
        setCategoryOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [categoryOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  function addToRequest(product: Product) {
    const current = cartRef.current;
    const cartProduct = { ...product, image: productImage(product) || null };

    const index = current.findIndex(
      (line) =>
        line.product.id === product.id || line.product.name === product.name
    );

    const next: CartLine[] =
      index >= 0
        ? current.map((line, i) =>
            i === index ? { ...line, quantity: line.quantity + 1 } : line
          )
        : [...current, { product: cartProduct, quantity: 1 }];

    cartRef.current = next;
    setCart(next);
    writeCart(slug, next);

    // Feedback visuel
    const key = product.id ?? product.name ?? "x";
    setPulseKey(key);
    window.setTimeout(() => setPulseKey(null), 420);

    queueMicrotask(() => {
      notifyCartUpdated(slug, "added");
      notifyCartUpdated(slug, "updated");
    });
  }

  function openProduct(product: Product) {
    setSelected(product);
  }

  function handleProductPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "touch") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    productPointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  }

  function handleProductPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const gesture = productPointerRef.current;
    if (gesture?.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 8) {
      gesture.moved = true;
    }
  }

  function handleProductPointerUp(
    event: ReactPointerEvent<HTMLButtonElement>,
    product: Product,
  ) {
    const gesture = productPointerRef.current;
    if (gesture?.pointerId !== event.pointerId) return;
    productPointerRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!gesture.moved) {
      suppressProductClickRef.current = true;
      openProduct(product);
    }
  }

  function handleProductPointerCancel() {
    productPointerRef.current = null;
  }

  function resetQuery() {
    setQuery("");
  }

  function resetFilters() {
    setQuery("");
    setCategory(catalogAllCategoriesLabel);
  }

  const themeVars = {
    "--primary": primaryColor,
    "--secondary": secondaryColor,
    "--text": textColor,
    "--muted": secondaryTextColor,
  } as React.CSSProperties;

  const displayCategoryLabel = drafts.categoryLabel || categoryLabel;
  const displayAllCategoriesLabel = drafts.allCategoriesLabel || allCategoriesLabel;
  const displaySearchPlaceholder = drafts.searchPlaceholder || searchPlaceholder;
  const displayResetLabel = drafts.resetLabel || resetLabel;
  const displayNoResultsTitle = drafts.noResultsTitle || noResultsTitle;
  const displayNoResultsText = drafts.noResultsText || noResultsText;
  const hasActiveFilters = query || category !== displayAllCategoriesLabel;

  const applyTextValue = (field: string, nextValue: string) => {
    const normalizedField = field === "introText" ? "subtitle" : field;
    const previousLabel = drafts.allCategoriesLabel || allCategoriesLabel;
    setDrafts((previous) => ({ ...previous, [field]: nextValue }));
    if (field === "allCategoriesLabel" && category === previousLabel) {
      setCategory(nextValue);
    }
    onTextChange?.(normalizedField, nextValue);
  };

  const editableText = (field: string, value: string) => {
    if (!editable) return undefined;
    return {
      contentEditable: true,
      suppressContentEditableWarning: true,
      spellCheck: false,
      style: fieldStyles?.[field] ?? undefined,
      "data-section-id": String(sectionId ?? `catalog-${field}`),
      "data-element-id": field,
      "data-editor-type": "text",
      onMouseDown: (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        onSelectField?.(field);
      },
      onFocus: (event: React.FocusEvent<HTMLElement>) => {
        event.stopPropagation();
        onSelectField?.(field);
      },
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        onSelectField?.(field);
      },
      onInput: (event: React.FormEvent<HTMLElement>) => {
        const nextValue = (event.currentTarget.textContent ?? "").trim();
        if (!nextValue) return;
        onTextChange?.((field === "introText" ? "subtitle" : field), nextValue);
      },
      onBlur: (event: React.FocusEvent<HTMLElement>) => {
        const nextValue = (event.currentTarget.textContent ?? "").trim() || value;
        setDrafts((previous) => ({ ...previous, [field]: nextValue }));
        onTextChange?.((field === "introText" ? "subtitle" : field), nextValue);
      },
    };
  };

  return (
    <section
      id="produits"
      className={`${styles.section} ${styles.catalogSection} siteCatalogSection`}
      style={
        {
          ...themeVars,
          "--catalog-padding-desktop": `${spacingDesktop}px`,
          "--catalog-padding-tablet": `${spacingTablet}px`,
          "--catalog-padding-mobile": `${spacingMobile}px`,
          "--catalog-gap": `${elementGap}px`,
          "--catalog-font-family": fontFamily || "inherit",
        } as CSSProperties
      }
    >
      {/* ============================= EN-TÊTE ============================= */}
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <p className={styles.eyebrow} {...editableText("eyebrow", drafts.eyebrow)}>{drafts.eyebrow}</p>
          <h2 className={styles.title} {...editableText("title", drafts.title)}>{drafts.title}</h2>
          <p className={styles.subtitle} {...editableText("introText", drafts.introText)}>{drafts.introText}</p>
        </div>

        {showSearch && (
          <div className={styles.headerActions}>
            {searchOpen ? (
              <div className={styles.searchWrap}>
                <Search
                  size={15}
                  className={styles.searchIcon}
                  aria-hidden="true"
                />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={displaySearchPlaceholder}
                  aria-label={displaySearchPlaceholder}
                  className={styles.searchInput}
                  type="search"
                />
                <button
                  type="button"
                  onClick={() => {
                    resetQuery();
                    setSearchOpen(false);
                  }}
                  className={styles.searchClose}
                  aria-label="Fermer la recherche"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.searchTrigger}
                onClick={() => setSearchOpen(true)}
                aria-label="Rechercher un produit"
              >
                <Search size={17} strokeWidth={1.6} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </header>

      {/* ============================= FILTRES ============================= */}
      {showFilters && (
        <div className={styles.categorySelect} ref={categoryRef}>
          <button
            type="button"
            className={styles.categorySelectTrigger}
            aria-haspopup="listbox"
            aria-expanded={categoryOpen}
            onClick={() => setCategoryOpen((open) => !open)}
          >
            <span className={styles.categorySelectLabel} {...editableText("categoryLabel", displayCategoryLabel)}>{drafts.categoryLabel}</span>
            <span className={styles.categorySelectValue}>
              {category === catalogAllCategoriesLabel ? displayAllCategoriesLabel : category}
              <span className={styles.categoryFilterCount}>
                {categories.find((item) => item.name === category)?.count ?? 0}
              </span>
            </span>
            <span
              className={`${styles.categorySelectChevron} ${
                categoryOpen ? styles.categorySelectChevronOpen : ""
              }`}
              aria-hidden="true"
            >
              ↓
            </span>
          </button>

          {categoryOpen && (
            <div
              className={styles.categorySelectMenu}
              role="listbox"
              aria-label="Catégories"
            >
              {categories.map(({ name, count }) => (
                <button
                  key={name}
                  type="button"
                  role="option"
                  aria-selected={category === name}
                  className={`${styles.categorySelectOption} ${
                    category === name ? styles.categorySelectOptionActive : ""
                  }`}
                  onClick={() => {
                    setCategory(name);
                    setCategoryOpen(false);
                  }}
                >
                  <span>{name === catalogAllCategoriesLabel ? displayAllCategoriesLabel : name}</span>
                  <span className={styles.categoryFilterCount}>{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.resultsMeta} aria-live="polite">
        <span>
          <strong>{filteredProducts.length}</strong> produit
          {filteredProducts.length > 1 ? "s" : ""}
          {category !== catalogAllCategoriesLabel ? ` dans ${category === catalogAllCategoriesLabel ? displayAllCategoriesLabel : category}` : ""}
        </span>

        <div className={styles.resultsMetaActions}>
          {hasActiveFilters && (
            <button type="button" onClick={resetFilters}>
              {displayResetLabel}
            </button>
          )}

          {showSort && (
            <select
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Trier les produits"
            >
              <option value="default">Par défaut</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="name">Nom (A-Z)</option>
            </select>
          )}
        </div>
      </div>

      {/* ============================= GRILLE ============================= */}
      {filteredProducts.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <Search size={22} aria-hidden="true" />
          </div>
          <h3 {...editableText("noResultsTitle", displayNoResultsTitle)}>{drafts.noResultsTitle}</h3>
          <p {...editableText("noResultsText", displayNoResultsText)}>{drafts.noResultsText}</p>
          {hasActiveFilters && (
            <button type="button" onClick={resetFilters}>
              {displayResetLabel}
            </button>
          )}
        </div>
      ) : (
        <div
          className={styles.grid}
          style={
            {
              "--catalog-columns": Math.max(1, Math.min(4, columns)),
              "--catalog-columns-tablet": Math.max(
                1,
                Math.min(3, columnsTablet)
              ),
              "--catalog-columns-mobile": Math.max(
                1,
                Math.min(2, columnsMobile)
              ),
            } as CSSProperties
          }
        >
          {filteredProducts.map((product, index) => {
            const key = productKey(product, index);
            const inCart = cart.find(
              (line) =>
                line.product.id === product.id ||
                line.product.name === product.name
            );
            const isPulsing = pulseKey === (product.id ?? product.name ?? "x");

            return (
              <article key={key} className={styles.card}>
                <div className={styles.cardMain}>
                  <div className={styles.cardImageWrap} data-product-image>
                    {showCategories && product.category && (
                      <span className={styles.cardCategory}>
                        {product.category}
                      </span>
                    )}
                    {inCart && (
                      <span className={styles.cardBadge}>
                        {inCart.quantity}
                      </span>
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
                    {showDescriptions && (
                      <p className={styles.cardDescription}>
                        {product.description ||
                          "Produit disponible sur demande."}
                      </p>
                    )}
                    {showPrices && (
                      <strong className={styles.cardPrice}>
                        {formatPrice(product.price)}
                      </strong>
                    )}
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.btnOutline}
                    onPointerDown={handleProductPointerDown}
                    onPointerMove={handleProductPointerMove}
                    onPointerUp={(event) => handleProductPointerUp(event, product)}
                    onPointerCancel={handleProductPointerCancel}
                    onClick={() => {
                      if (suppressProductClickRef.current) {
                        suppressProductClickRef.current = false;
                        return;
                      }
                      openProduct(product);
                    }}
                  >
                    Voir
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnSolid} ${
                      isPulsing ? styles.btnSolidPulse : ""
                    }`}
                    onClick={() => addToRequest(product)}
                    aria-label={`Ajouter ${
                      product.name ?? "le produit"
                    } au panier`}
                    title="Ajouter au panier"
                  >
                    <Plus size={14} aria-hidden="true" />
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
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
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
              <div className={styles.modalMedia}>
                {productImage(selected) ? (
                  <img
                    src={productImage(selected)}
                    alt={selected.name ?? "Produit"}
                    className={styles.modalImage}
                  />
                ) : (
                  <div className={styles.modalMediaFallback}>
                    {selected.name?.slice(0, 1).toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
              <div className={styles.modalContent}>
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
                  Ajouter au panier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}