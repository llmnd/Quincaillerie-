"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/AppShell";
import PosSessionMenu from "../../components/PosSessionMenu";
import POSCheckoutView from "../../components/POSCheckoutView";
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
type OrderTab = { id: number; cart: CartLine[]; selectedCustomer: string };

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
  const [isInitialViewResolved, setIsInitialViewResolved] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [orderTabs, setOrderTabs] = useState<OrderTab[]>([{ id: 1, cart: [], selectedCustomer: "" }]);
  const [activeOrderId, setActiveOrderId] = useState(1);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasOpenSession, setHasOpenSession] = useState(false);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [hasPendingSale, setHasPendingSale] = useState(false);
  const [entryChoice, setEntryChoice] = useState<"choice" | "pos">("choice");
  const [isCheckoutView, setIsCheckoutView] = useState(false);
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
    const posIsOpen = window.sessionStorage.getItem("quincaillerie_pos_open") === "1";
    const checkoutIsOpen = window.sessionStorage.getItem("quincaillerie_checkout_view") === "1";
    setIsCheckoutView(checkoutIsOpen);
    setEntryChoice(posIsOpen ? "pos" : "choice");
    setIsInitialViewResolved(true);
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem("quincaillerie_pos_return_path", "/sales");

    try {
      const stored = window.sessionStorage.getItem("quincaillerie_sale_draft");
      if (stored) {
        const draft = JSON.parse(stored) as {
          cart?: CartLine[];
          selectedCustomer?: string;
          orderTabs?: { id: number; draft?: { cart?: CartLine[]; selectedCustomer?: string } }[];
          activeOrderId?: number;
        };
        const hasSale = Array.isArray(draft.cart) && draft.cart.length > 0;
        setHasPendingSale(hasSale);
        setCart(hasSale ? draft.cart! : []);
        setSelectedCustomer(draft.selectedCustomer ?? "");
        if (draft.orderTabs?.length) {
          const tabs = draft.orderTabs.map((tab) => ({
            id: tab.id,
            cart: tab.draft?.cart ?? [],
            selectedCustomer: tab.draft?.selectedCustomer ?? "",
          }));
          const activeId = draft.activeOrderId ?? tabs[0].id;
          const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
          setOrderTabs(tabs);
          setActiveOrderId(active.id);
          setCart(active.cart);
          setSelectedCustomer(active.selectedCustomer);
        }
      }
    } catch {
      window.sessionStorage.removeItem("quincaillerie_sale_draft");
    } finally {
      setIsDraftHydrated(true);
    }
  }, [router]);

  useEffect(() => {
    if (!isDraftHydrated) return;
    setOrderTabs((current) =>
      current.map((tab) =>
        tab.id === activeOrderId ? { ...tab, cart, selectedCustomer } : tab
      )
    );
  }, [activeOrderId, cart, isDraftHydrated, selectedCustomer]);

  useEffect(() => {
    if (!isDraftHydrated) return;
    window.sessionStorage.setItem(
      "quincaillerie_sale_draft",
      JSON.stringify({
        cart,
        selectedCustomer,
        orderTabs: orderTabs.map((tab) => ({
          id: tab.id,
          draft: { cart: tab.cart, selectedCustomer: tab.selectedCustomer, discount: "0" },
        })),
        activeOrderId,
        discount: "0",
        createdAt: Date.now(),
      })
    );
  }, [activeOrderId, cart, isDraftHydrated, orderTabs, selectedCustomer]);

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

  function continueSale() {
    window.sessionStorage.removeItem("quincaillerie_pos_return_path");
    window.sessionStorage.setItem("quincaillerie_pos_open", "1");
    setEntryChoice("pos");
  }

  function openCash() {
    router.push("/cash");
  }

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
    return () => {
      document.body.style.overflow = prev;
    };
  }, [requiresHandoff]);

  function addProduct(product: Product) {
    if (product.stock_quantity < 1 || requiresHandoff) return;
    setCart((current) => {
      const existing = current.find((line) => line.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.id === product.id
            ? {
                ...line,
                quantity: Math.min(line.quantity + 1, product.stock_quantity),
              }
            : line
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
  }

  function incrementLine(productId: number) {
    setCart((current) =>
      current.map((line) => {
        if (line.id !== productId) return line;
        const limit =
          products.find((p) => p.id === productId)?.stock_quantity ??
          line.quantity + 1;
        return { ...line, quantity: Math.min(line.quantity + 1, limit) };
      })
    );
  }

  function decrementLine(productId: number) {
    setCart((current) =>
      current.flatMap((line) => {
        if (line.id !== productId) return [line];
        if (line.quantity <= 1) return [];
        return [{ ...line, quantity: line.quantity - 1 }];
      })
    );
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
        orderTabs: orderTabs.map((tab) => ({
          id: tab.id,
          draft: { cart: tab.cart, selectedCustomer: tab.selectedCustomer, discount: "0" },
        })),
        activeOrderId,
        discount: "0",
        createdAt: Date.now(),
      })
    );
    window.sessionStorage.setItem("quincaillerie_checkout_view", "1");
    setIsCheckoutView(true);
  }

  function selectOrderTab(tab: OrderTab) {
    setActiveOrderId(tab.id);
    setCart(tab.cart);
    setSelectedCustomer(tab.selectedCustomer);
  }

  function createOrderTab() {
    const nextId = Math.max(0, ...orderTabs.map((tab) => tab.id)) + 1;
    const nextTab = { id: nextId, cart: [], selectedCustomer: "" };
    setOrderTabs((current) => [...current, nextTab]);
    setActiveOrderId(nextId);
    setCart([]);
    setSelectedCustomer("");
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

  if (!isInitialViewResolved || isLoading || !isDraftHydrated) {
    return (
      <AppShell>
        <main
          className={`${styles.salesEntry} ${styles.salesLoading}`}
          aria-busy="true"
          aria-label="Chargement du point de vente"
        >
          <section className={styles.salesEntryCard}>
            <span className={styles.eyebrow}>Point de vente</span>
            <h1>Préparation de la vente…</h1>
          </section>
        </main>
      </AppShell>
    );
  }

  if (isCheckoutView) {
    return <POSCheckoutView />;
  }

  if (entryChoice === "choice") {
    return (
      <AppShell>
        <main className={styles.salesEntry}>
          <section className={styles.salesEntryCard}>
            <span className={styles.eyebrow}>Point de vente</span>
            <h1>{hasPendingSale ? "Une vente est en cours" : "Point de vente"}</h1>
            <p>
              {hasPendingSale && hasOpenSession
                ? "Reprenez la vente en attente ou ouvrez la caisse pour gérer la session."
                : hasOpenSession
                ? "La caisse est ouverte. Continuez pour accéder au point de vente."
                : "Ouvrez d’abord une caisse pour commencer ou reprendre une vente."}
            </p>
            <div className={styles.salesEntryActions}>
              {hasOpenSession && (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={continueSale}
                >
                  Continuer la vente
                </button>
              )}
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={openCash}
              >
                Ouvrir la caisse
              </button>
            </div>
          </section>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell hideSidebar hideTopbar hideContentPadding>
      <div className={styles.salesPage}>
        <nav className={styles.checkoutToolbar} aria-label="Commandes">
          <button type="button" className={`${styles.checkoutTab} ${styles.checkoutTabActive}`}>
            Caisse
          </button>
          <button type="button" className={styles.checkoutTab}>
            Commandes ({orderTabs.length})
          </button>
          <span className={styles.checkoutToolbarDivider} aria-hidden="true" />
          <button
            type="button"
            className={styles.checkoutNewOrder}
            onClick={createOrderTab}
            aria-label="Nouvelle commande"
          >
            +
          </button>
          <div className={styles.checkoutOrderTabsList}>
            {orderTabs.map((tab) => {
              const total = tab.cart.reduce(
                (sum, line) => sum + line.unit_price * line.quantity,
                0
              );
              return (
                <div
                  key={tab.id}
                  className={`${styles.checkoutOrderTabWrap} ${
                    tab.id === activeOrderId ? styles.checkoutOrderTabWrapActive : ""
                  }`}
                >
                  <button
                    type="button"
                    className={styles.checkoutOrderTab}
                    onClick={() => selectOrderTab(tab)}
                  >
                    <span className={styles.checkoutOrderTabNumber}>#{tab.id}</span>
                    <span className={styles.checkoutOrderTabTotal}>
                      {tab.cart.length > 0 ? formatFCFA(total) : "vide"}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          <PosSessionMenu />
        </nav>

        {!isLoading && !hasOpenSession && (
          <div className={styles.sessionNotice}>
            <strong>Caisse à ouvrir.</strong> Une session ouverte est obligatoire
            pour valider une vente. <Link href="/cash">Ouvrir une caisse</Link>
          </div>
        )}

        <div className={styles.salesLayout}>
          {/* ============================= PANIER ============================= */}
          <section className={styles.cartPanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Vente</p>
                <h2>Panier</h2>
              </div>
              {cart.length > 0 ? (
                <button
                  type="button"
                  className={styles.clearCartButton}
                  onClick={clearCart}
                >
                  <Trash2 size={11} /> Vider
                </button>
              ) : (
                <span>0 ligne</span>
              )}
            </div>

            <div className={styles.cartLines}>
              {cart.length === 0 ? (
                <div className={styles.emptyCart}>
                  <span className={styles.cartIcon}>
                    <ShoppingBag size={16} />
                  </span>
                  <p>Panier vide.</p>
                  <small>Touchez un produit pour l’ajouter.</small>
                </div>
              ) : (
                cart.map((line) => (
                  <div className={styles.cartLine} key={line.id}>
                    <div
                      className={styles.qtyControl}
                      role="group"
                      aria-label={`Quantité ${line.name}`}
                    >
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        onClick={() => decrementLine(line.id)}
                        aria-label={`Réduire ${line.name}`}
                      >
                        <Minus size={12} />
                      </button>
                      <span className={styles.qtyValue}>{line.quantity}</span>
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        onClick={() => incrementLine(line.id)}
                        aria-label={`Augmenter ${line.name}`}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
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

            <div className={styles.cartFooter}>
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
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

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
                  disabled={
                    cart.length === 0 ||
                    !hasOpenSession ||
                    Boolean(requiresHandoff)
                  }
                >
                  Payer {formatFCFA(subtotal)}
                </button>
              </div>
            </div>
          </section>

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
                placeholder="Rechercher un produit par nom ou SKU…"
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
                  className={
                    activeCategory === ""
                      ? styles.categoryActive
                      : styles.categoryChip
                  }
                  onClick={() => setActiveCategory("")}
                >
                  Toutes
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={
                      activeCategory === category
                        ? styles.categoryActive
                        : styles.categoryChip
                    }
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
                  <div
                    key={i}
                    className={styles.productRowSkeleton}
                    aria-hidden="true"
                  >
                    <span className={styles.skeletonImage} />
                    <div className={styles.productRowSkeletonText}>
                      <span
                        className={styles.skeletonLine}
                        style={{ width: "72%" }}
                      />
                      <span
                        className={styles.skeletonLine}
                        style={{ width: "44%" }}
                      />
                    </div>
                  </div>
                ))
              ) : products.length === 0 ? (
                <div className={styles.productListEmpty}>
                  <span className={styles.cartIcon}>
                    <ShoppingBag size={16} />
                  </span>
                  <p>Aucun produit.</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className={styles.productListEmpty}>
                  <p>Aucun résultat.</p>
                  {(search || activeCategory) && (
                    <button
                      type="button"
                      className={styles.resetFilters}
                      onClick={() => {
                        setSearch("");
                        setActiveCategory("");
                      }}
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const inCart = cart.find((l) => l.id === product.id);
                  const isOut = product.stock_quantity < 1;
                  const isLow =
                    product.stock_quantity > 0 && product.stock_quantity <= 5;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      className={`${styles.productRow}${
                        inCart ? ` ${styles.productRowActive}` : ""
                      }`}
                      onClick={() => addProduct(product)}
                      disabled={isOut || Boolean(requiresHandoff)}
                    >
                      <span className={styles.productImageWrap}>
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt=""
                            className={styles.productThumb}
                          />
                        ) : (
                          <span className={styles.productImageFallback}>
                            {product.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        {inCart && (
                          <span className={styles.productQtyBadge}>
                            {inCart.quantity}
                          </span>
                        )}
                      </span>
                      <div className={styles.productInfo}>
                        <strong>{product.name}</strong>
                        <small>{product.sku}</small>
                        <span
                          className={`${styles.stockPill} ${
                            isOut
                              ? styles.stockOut
                              : isLow
                              ? styles.stockLow
                              : styles.stockOk
                          }`}
                        >
                          {isOut ? "Rupture" : `${product.stock_quantity} en stock`}
                        </span>
                      </div>
                      <div className={styles.productPriceCol}>
                        <b>{formatFCFA(product.unit_price)}</b>
                        <i>
                          <Plus size={12} aria-hidden="true" />
                        </i>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* ============================= MODALE HANDOFF ============================= */}
        {requiresHandoff && handoff && (
          <div className={styles.handoffBackdrop}>
            <section
              className={styles.handoffModal}
              role="dialog"
              aria-modal="true"
            >
              <p className={styles.stepEyebrow}>Passation de caisse</p>
              <h2>Prendre connaissance avant de vendre</h2>
              <p className={styles.handoffIntro}>
                Vérifiez la situation laissée par le vendeur précédent.
              </p>
              <div className={styles.handoffMetrics}>
                <div>
                  <span>Solde théorique</span>
                  <strong>
                    {handoff.theoretical_balance.toLocaleString("fr-FR")} FCFA
                  </strong>
                </div>
                <div>
                  <span>Ventes réalisées</span>
                  <strong>
                    {handoff.sales_total.toLocaleString("fr-FR")} FCFA
                  </strong>
                </div>
                <div>
                  <span>Encaissements</span>
                  <strong>
                    {handoff.cash_collected.toLocaleString("fr-FR")} FCFA
                  </strong>
                </div>
                <div>
                  <span>Dépenses / retraits</span>
                  <strong>
                    {handoff.withdrawals.toLocaleString("fr-FR")} FCFA
                  </strong>
                </div>
              </div>
              <div className={styles.handoffDetails}>
                <span>
                  Vendeur précédent{" "}
                  <strong>
                    {handoff.previous_seller ?? "Ouverture de journée"}
                  </strong>
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