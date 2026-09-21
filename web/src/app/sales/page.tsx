"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/AppShell";
import { authHeaders } from "../../lib/auth";
import styles from "./page.module.css";

type Product = {
  id: number;
  name: string;
  sku: string;
  image_url?: string | null;
  category?: string | null;
  unit_price: number;
  stock_quantity: number;
};

type Customer = { id: number; name: string; email?: string | null };
type CartLine = Product & { quantity: number };

type Handoff = {
  theoretical_balance: number;
  sales_total: number;
  cash_collected: number;
  withdrawals: number;
  previous_seller?: string | null;
  handoff_at: string;
  last_operation?: { type: string; amount: number } | null;
  requires_acknowledgement: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SKELETON_ROWS = 12;

const formatFCFA = (value: number) =>
  `${Math.round(value).toLocaleString("fr-FR")} FCFA`;

export default function SalesPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasOpenSession, setHasOpenSession] = useState(false);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [isAcknowledgingHandoff, setIsAcknowledgingHandoff] = useState(false);
  const [handoffError, setHandoffError] = useState("");

  const productsQuery = useQuery<Product[]>({
    queryKey: ["products", "catalog"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/v1/products`, {
        headers: authHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Impossible de charger les produits.");
      return response.json() as Promise<Product[]>;
    },
  });
  const products = productsQuery.data ?? [];

  useEffect(() => {
    const headers = authHeaders();
    const loadResource = async <T,>(path: string, fallback: T): Promise<T> => {
      try {
        const response = await fetch(`${API_URL}${path}`, {
          headers,
          credentials: "include",
        });
        return response.ok ? ((await response.json()) as T) : fallback;
      } catch {
        return fallback;
      }
    };

    Promise.all([
      loadResource<Customer[]>("/api/v1/customers", []),
      loadResource<{ status: string }[]>("/api/v1/cash/sessions", []),
      loadResource<Handoff | null>("/api/v1/cash/sessions/current/handoff", null),
    ])
      .then(([customerData, sessionData, handoffData]) => {
        setCustomers(customerData);
        setHasOpenSession(sessionData.some((s) => s.status === "open"));
        setHandoff(handoffData);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const product of products) {
      const c = product.category?.trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !normalized ||
        `${product.name} ${product.sku}`.toLowerCase().includes(normalized);
      const matchesCategory =
        !activeCategory || product.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.unit_price * line.quantity, 0),
    [cart]
  );
  const totalItems = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart]
  );

  const requiresHandoff = handoff?.requires_acknowledgement;

  useEffect(() => {
    if (!requiresHandoff) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [requiresHandoff]);

  function addProduct(product: Product) {
    if (product.stock_quantity < 1 || requiresHandoff) return;
    setCart((current) => {
      const existing = current.find((line) => line.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.id === product.id
            ? { ...line, quantity: Math.min(line.quantity + 1, product.stock_quantity) }
            : line
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
  }

  function removeProduct(productId: number) {
    setCart((current) => current.filter((line) => line.id !== productId));
  }

  function clearCart() {
    if (cart.length === 0) return;
    if (!window.confirm("Vider le panier ?")) return;
    setCart([]);
    setSelectedCustomer("");
  }

  function openPayment() {
    if (cart.length === 0) return;
    window.sessionStorage.setItem(
      "quincaillerie_sale_draft",
      JSON.stringify({
        cart,
        selectedCustomer,
        discount: "0",
        createdAt: Date.now(),
      })
    );
    router.push("/sales/checkout");
  }

  async function acknowledgeHandoff() {
    setIsAcknowledgingHandoff(true);
    setHandoffError("");
    try {
      const response = await fetch(
        `${API_URL}/api/v1/cash/sessions/current/handoff/acknowledge`,
        { method: "POST", headers: authHeaders(), credentials: "include" }
      );
      if (!response.ok) throw new Error();
      setHandoff(await response.json());
    } catch {
      setHandoffError("Impossible d'enregistrer la prise en charge.");
    } finally {
      setIsAcknowledgingHandoff(false);
    }
  }

  const showSkeleton = isLoading || productsQuery.isPending;

  return (
    <AppShell hideContentPadding>
      <div className={styles.salesPage}>
      {!isLoading && !hasOpenSession && (
        <div className={styles.sessionNotice}>
          <strong>Caisse à ouvrir.</strong> Une session ouverte est obligatoire
          pour valider une vente. <Link href="/cash">Ouvrir une caisse</Link>
        </div>
      )}

      <div className={styles.salesLayout}>
        {/* ============================= CATALOGUE ============================= */}
        <section className={styles.catalogPanel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Catalogue</p>
              <h2>Produits</h2>
            </div>
            <span>{filteredProducts.length} réf.</span>
          </div>

          <div className={styles.catalogToolbar}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher un produit"
            />
            {search && (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setSearch("")}
                aria-label="Effacer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {categories.length > 0 && (
            <div className={styles.categoryBar} role="tablist">
              <button
                type="button"
                className={activeCategory === "" ? styles.categoryActive : styles.categoryChip}
                onClick={() => setActiveCategory("")}
              >
                Toutes
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={activeCategory === category ? styles.categoryActive : styles.categoryChip}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          <div className={styles.productList}>
            {showSkeleton ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <div key={i} className={styles.productRowSkeleton} aria-hidden="true">
                  <span className={styles.skeletonImage} />
                  <div className={styles.productRowSkeletonText}>
                    <span className={styles.skeletonLine} style={{ width: "72%" }} />
                    <span className={styles.skeletonLine} style={{ width: "44%" }} />
                  </div>
                </div>
              ))
            ) : products.length === 0 ? (
              <div className={styles.productListEmpty}>
                <span className={styles.cartIcon}><ShoppingBag size={16} /></span>
                <p>Aucun produit.</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className={styles.productListEmpty}>
                <p>Aucun résultat.</p>
                {(search || activeCategory) && (
                  <button
                    type="button"
                    className={styles.resetFilters}
                    onClick={() => { setSearch(""); setActiveCategory(""); }}
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            ) : (
              filteredProducts.map((product) => {
                const inCart = cart.find((l) => l.id === product.id);
                const isOut = product.stock_quantity < 1;
                const isLow = product.stock_quantity > 0 && product.stock_quantity <= 5;
                return (
                  <button
                    key={product.id}
                    type="button"
                    className={styles.productRow}
                    onClick={() => addProduct(product)}
                    disabled={isOut || Boolean(requiresHandoff)}
                  >
                    <span className={styles.productImageWrap}>
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className={styles.productThumb} />
                      ) : (
                        <span className={styles.productImageFallback}>
                          {product.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      {inCart && (
                        <span className={styles.productQtyBadge}>{inCart.quantity}</span>
                      )}
                    </span>
                    <div className={styles.productInfo}>
                      <strong>{product.name}</strong>
                      <small>{product.sku}</small>
                      <span className={`${styles.stockPill} ${isOut ? styles.stockOut : isLow ? styles.stockLow : styles.stockOk}`}>
                        {isOut ? "Rupture" : `${product.stock_quantity} en stock`}
                      </span>
                    </div>
                    <div className={styles.productPriceCol}>
                      <b>{formatFCFA(product.unit_price)}</b>
                      <i><Plus size={12} aria-hidden="true" /></i>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* ============================= PANIER ============================= */}
        <section className={styles.cartPanel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Vente</p>
              <h2>Panier</h2>
            </div>
            {cart.length > 0 ? (
              <button type="button" className={styles.clearCartButton} onClick={clearCart}>
                <Trash2 size={11} /> Vider
              </button>
            ) : (
              <span>0 ligne</span>
            )}
          </div>

          <div className={styles.cartLines}>
            {cart.length === 0 ? (
              <div className={styles.emptyCart}>
                <span className={styles.cartIcon}><ShoppingBag size={16} /></span>
                <p>Panier vide.</p>
              </div>
            ) : (
              cart.map((line) => (
                <div className={styles.cartLine} key={line.id}>
                  <span className={styles.cartLineQty}>{line.quantity}</span>
                  <span className={styles.cartLineName}>{line.name}</span>
                  <b className={styles.cartLinePrice}>
                    {formatFCFA(line.unit_price * line.quantity)}
                  </b>
                  <button
                    type="button"
                    className={styles.cartLineRemove}
                    onClick={() => removeProduct(line.id)}
                    aria-label={`Retirer ${line.name}`}
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className={styles.totalRow}>
            <div>
              <span>Total</span>
              <small>
                {totalItems} article{totalItems > 1 ? "s" : ""}
              </small>
            </div>
            <strong>{formatFCFA(subtotal)}</strong>
          </div>

          <div className={styles.checkoutActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={openPayment}
              disabled={cart.length === 0 || !hasOpenSession || Boolean(requiresHandoff)}
            >
              Payer {formatFCFA(subtotal)}
            </button>
          </div>

          <label className={styles.customerLabel} htmlFor="customer">
            Client <span>(facultatif)</span>
          </label>
          <select
            id="customer"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
          >
            <option value="">Vente comptoir</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </section>
      </div>

      {/* ============================= MODALE HANDOFF ============================= */}
      {requiresHandoff && handoff && (
        <div className={styles.handoffBackdrop}>
          <section className={styles.handoffModal} role="dialog" aria-modal="true">
            <p className={styles.stepEyebrow}>Passation de caisse</p>
            <h2>Prendre connaissance avant de vendre</h2>
            <p className={styles.handoffIntro}>
              Vérifiez la situation laissée par le vendeur précédent.
            </p>
            <div className={styles.handoffMetrics}>
              <div>
                <span>Solde théorique</span>
                <strong>{handoff.theoretical_balance.toLocaleString("fr-FR")} FCFA</strong>
              </div>
              <div>
                <span>Ventes réalisées</span>
                <strong>{handoff.sales_total.toLocaleString("fr-FR")} FCFA</strong>
              </div>
              <div>
                <span>Encaissements</span>
                <strong>{handoff.cash_collected.toLocaleString("fr-FR")} FCFA</strong>
              </div>
              <div>
                <span>Dépenses / retraits</span>
                <strong>{handoff.withdrawals.toLocaleString("fr-FR")} FCFA</strong>
              </div>
            </div>
            <div className={styles.handoffDetails}>
              <span>
                Vendeur précédent{" "}
                <strong>{handoff.previous_seller ?? "Ouverture de journée"}</strong>
              </span>
              <span>
                Heure de passation{" "}
                <strong>
                  {new Date(handoff.handoff_at).toLocaleString("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </strong>
              </span>
            </div>
            {handoffError && <p className={styles.message}>{handoffError}</p>}
            <button
              type="button"
              className={styles.primaryButton}
              onClick={acknowledgeHandoff}
              disabled={isAcknowledgingHandoff}
            >
              {isAcknowledgingHandoff ? "…" : "Je prends connaissance"}
            </button>
          </section>
        </div>
      )}
      </div>
    </AppShell>
  );
}