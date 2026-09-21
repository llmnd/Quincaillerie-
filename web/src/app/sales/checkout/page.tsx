"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Plus,
  Printer,
  Send,
  ShoppingBag,
  X,
} from "lucide-react";
import { authHeaders } from "../../../lib/auth";
import styles from "../page.module.css";

type Product = {
  id: number;
  name: string;
  sku: string;
  image_url?: string | null;
  category?: string | null;
  unit_price: number;
  stock_quantity: number;
};

type CartLine = Product & { quantity: number };
type PaymentMethod = "cash" | "wave" | "orange_money" | "card" | "other";

type Draft = {
  cart: CartLine[];
  selectedCustomer: string;
  discount: string;
  createdAt?: number;
};

type OrderTab = { id: number; draft: Draft };
type Customer = { id: number; name: string; email?: string | null };
type Step = "products" | "payment" | "success";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const PAYMENT_METHODS: Array<{ id: PaymentMethod; label: string; icon: string; image?: string }> = [
  { id: "cash", label: "Espèces", icon: "💵" },
  { id: "wave", label: "Wave", icon: "🌊", image: "https://i.pinimg.com/736x/42/59/b1/4259b108a2b649a2ab983439c62c79bd.jpg" },
  { id: "orange_money", label: "Orange", icon: "🟠", image: "https://i.pinimg.com/736x/e2/cc/bf/e2ccbf284b0f18ae6e8dc544ac097f4c.jpg" },
  { id: "card", label: "Carte", icon: "💳" },
  { id: "other", label: "Autre", icon: "•" },
];

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  card: "Carte",
  other: "Autre",
};

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

const money = (value: number) =>
  `${Math.round(value).toLocaleString("fr-FR")} FCFA`;

export default function CheckoutPage() {
  const router = useRouter();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [orderTabs, setOrderTabs] = useState<OrderTab[]>([]);
  const [activeOrderId, setActiveOrderId] = useState(1);
  const [showOrders, setShowOrders] = useState(false);
  const [step, setStep] = useState<Step>("payment");

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [completedSale, setCompletedSale] = useState<{
    saleId: number;
    total: number;
    given: number;
    change: number;
    method: PaymentMethod;
  } | null>(null);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("quincaillerie_sale_draft");
    if (!stored) { router.replace("/sales"); return; }
    try {
      const parsed = JSON.parse(stored) as Draft;
      setDraft(parsed);
      setOrderTabs([{ id: 1, draft: parsed }]);
      setStep(parsed.cart.length ? "payment" : "products");
    } catch {
      router.replace("/sales");
    }
  }, [router]);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/products`, { headers: authHeaders(), credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<Product[]>) : []))
      .then(setProducts)
      .catch(() => setProducts([]));
    fetch(`${API_URL}/api/v1/customers`, { headers: authHeaders(), credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<Customer[]>) : []))
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const c = p.category?.trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !normalized || `${p.name} ${p.sku}`.toLowerCase().includes(normalized);
      const matchesCategory = !activeCategory || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  const subtotal = useMemo(
    () => draft?.cart.reduce((sum, l) => sum + l.unit_price * l.quantity, 0) ?? 0,
    [draft]
  );
  const discount = Math.min(Number(draft?.discount) || 0, subtotal);
  const amountDue = Math.max(0, subtotal - discount);
  const received = Number(cashReceived) || 0;
  const change = Math.max(0, received - amountDue);
  const isCash = paymentMethod === "cash";
  const cashSufficient = !isCash || received >= amountDue;

  const changeState: "idle" | "insufficient" | "ok" = !isCash
    ? "ok"
    : !cashReceived
    ? "idle"
    : received < amountDue
    ? "insufficient"
    : "ok";

  function addProduct(product: Product) {
    if (!draft) return;
    const existing = draft.cart.find((l) => l.id === product.id);
    const cart = existing
      ? draft.cart.map((l) =>
          l.id === product.id
            ? { ...l, quantity: Math.min(l.quantity + 1, product.stock_quantity) }
            : l
        )
      : [...draft.cart, { ...product, quantity: 1 }];
    updateDraft({ ...draft, cart });
  }

  function removeProduct(productId: number) {
    if (!draft) return;
    updateDraft({ ...draft, cart: draft.cart.filter((l) => l.id !== productId) });
  }

  function updateDraft(next: Draft) {
    setDraft(next);
    setOrderTabs((current) =>
      current.map((o) => (o.id === activeOrderId ? { ...o, draft: next } : o))
    );
  }

  function createOrderTab() {
    const nextId = Math.max(0, ...orderTabs.map((o) => o.id)) + 1;
    const newDraft: Draft = { cart: [], selectedCustomer: "", discount: "0", createdAt: Date.now() };
    setOrderTabs((c) => [...c, { id: nextId, draft: newDraft }]);
    setActiveOrderId(nextId);
    setDraft(newDraft);
    setStep("products");
    setPaymentMethod("cash");
    setCashReceived("");
    setShowOrders(false);
  }

  function selectOrderTab(order: OrderTab) {
    setActiveOrderId(order.id);
    setDraft(order.draft);
    setStep(order.draft.cart.length ? "payment" : "products");
    setPaymentMethod("cash");
    setCashReceived("");
    setShowOrders(false);
  }

  function closeOrderTab(orderId: number) {
    if (orderTabs.length <= 1) { router.replace("/sales"); return; }
    const remaining = orderTabs.filter((o) => o.id !== orderId);
    setOrderTabs(remaining);
    if (activeOrderId === orderId) {
      const next = remaining[remaining.length - 1];
      setActiveOrderId(next.id);
      setDraft(next.draft);
      setStep(next.draft.cart.length ? "payment" : "products");
    }
  }

  function appendDigit(digit: string) {
    setCashReceived((current) => {
      if (digit === "C") return "";
      if (digit === "00") return current ? String(Number(current) * 100) : "0";
      return String(Number(`${current}${digit}`.replace(/^0+(?=\d)/, "")));
    });
  }

  async function submitSale() {
    if (!draft || !cashSufficient || isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    const given = isCash ? received : amountDue;
    const changeValue = isCash ? change : 0;

    try {
      const response = await fetch(`${API_URL}/api/v1/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          customer_id: draft.selectedCustomer ? Number(draft.selectedCustomer) : null,
          status: "completed",
          discount_amount: discount,
          payment_method: paymentMethod,
          items: draft.cart.map((l) => ({
            product_id: l.id,
            quantity: l.quantity,
            unit_price: l.unit_price,
          })),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        id?: number;
        total_amount?: number;
        detail?: string;
      };

      if (!response.ok) {
        setError(typeof payload?.detail === "string" ? payload.detail : "La vente n'a pas pu être enregistrée.");
        return;
      }

      window.sessionStorage.removeItem("quincaillerie_sale_draft");
      setCompletedSale({
        saleId: payload.id ?? 0,
        total: Number(payload.total_amount ?? amountDue),
        given,
        change: changeValue,
        method: paymentMethod,
      });
      setStep("success");
    } catch {
      setError("Erreur réseau. La vente n'a pas pu être enregistrée.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function printReceipt() {
    if (!completedSale || !draft) return;
    const w = window.open("", "_blank", "width=420,height=640");
    if (!w) return;
    const esc = (s: string) =>
      s.replace(/[&<>'"]/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c] ?? c)
      );
    const rows = draft.cart
      .map(
        (l) =>
          `<tr><td>${esc(l.name)}<br><small>${esc(l.sku)}</small></td><td>${l.quantity}</td><td>${l.unit_price.toLocaleString("fr-FR")}</td><td>${(l.unit_price * l.quantity).toLocaleString("fr-FR")}</td></tr>`
      )
      .join("");
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Reçu #${completedSale.saleId}</title><style>
      @page{margin:12mm}body{font-family:Arial,sans-serif;color:#111;max-width:400px;margin:0 auto;padding:16px}
      h1{font-size:16px;margin:0 0 4px;text-align:center}
      .muted{text-align:center;color:#666;font-size:11px;margin-bottom:14px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{padding:6px 4px;text-align:left;border-bottom:1px solid #eee}
      th:nth-child(n+2),td:nth-child(n+2){text-align:right}
      .total{display:flex;justify-content:space-between;font-size:16px;font-weight:700;padding:12px 0;border-top:2px solid #111;margin-top:8px}
      .small{font-size:11px;color:#444;padding:3px 0;display:flex;justify-content:space-between}
      .center{text-align:center;margin-top:16px;font-size:12px;color:#555}
    </style></head><body>
      <h1>Reçu de vente</h1>
      <p class="muted">Vente #${completedSale.saleId} · ${new Date().toLocaleString("fr-FR")}</p>
      <table><thead><tr><th>Produit</th><th>Qté</th><th>PU</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="total"><span>Total</span><strong>${completedSale.total.toLocaleString("fr-FR")} FCFA</strong></div>
      <div class="small"><span>Mode</span><strong>${PAYMENT_LABELS[completedSale.method]}</strong></div>
      ${completedSale.method === "cash" ? `<div class="small"><span>Reçu</span><strong>${completedSale.given.toLocaleString("fr-FR")} FCFA</strong></div><div class="small"><span>Monnaie</span><strong>${completedSale.change.toLocaleString("fr-FR")} FCFA</strong></div>` : ""}
      <p class="center">Merci pour votre achat.</p>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),400)}</script>
    </body></html>`);
    w.document.close();
  }

  function startNewSale() {
    setCompletedSale(null);
    setError("");
    const newDraft: Draft = { cart: [], selectedCustomer: "", discount: "0", createdAt: Date.now() };
    setDraft(newDraft);
    setOrderTabs([{ id: 1, draft: newDraft }]);
    setActiveOrderId(1);
    setStep("products");
    setPaymentMethod("cash");
    setCashReceived("");
  }

  if (!draft) return <main className={styles.paymentPage} aria-busy="true" />;

  return (
    <main className={styles.paymentPage}>
      <div className={styles.paymentPageContent}>
        {/* ============================= TOOLBAR ============================= */}
        <nav className={styles.checkoutToolbar} aria-label="Commandes">
          <button
            type="button"
            className={`${styles.checkoutTab} ${!showOrders && step !== "success" ? styles.checkoutTabActive : ""}`}
            onClick={() => { setShowOrders(false); setStep(draft.cart.length ? "payment" : "products"); }}
          >
            Caisse
          </button>
          <button
            type="button"
            className={`${styles.checkoutTab} ${showOrders ? styles.checkoutTabActive : ""}`}
            onClick={() => setShowOrders(true)}
          >
            Commandes ({orderTabs.length})
          </button>

          <span className={styles.checkoutToolbarDivider} aria-hidden="true" />

          <button
            type="button"
            className={styles.checkoutNewOrder}
            onClick={createOrderTab}
            disabled={isSubmitting}
            aria-label="Nouvelle commande"
          >
            +
          </button>

          <div className={styles.checkoutOrderTabsList}>
            {orderTabs.map((order) => {
              const total = order.draft.cart.reduce((s, l) => s + l.unit_price * l.quantity, 0);
              return (
                <div
                  key={order.id}
                  className={`${styles.checkoutOrderTabWrap} ${activeOrderId === order.id && !showOrders ? styles.checkoutOrderTabWrapActive : ""}`}
                >
                  <button type="button" className={styles.checkoutOrderTab} onClick={() => selectOrderTab(order)}>
                    <span className={styles.checkoutOrderTabNumber}>#{order.id}</span>
                    <span className={styles.checkoutOrderTabTotal}>
                      {order.draft.cart.length > 0 ? money(total) : "vide"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.checkoutOrderTabClose}
                    onClick={(e) => { e.stopPropagation(); closeOrderTab(order.id); }}
                    aria-label={`Fermer la commande ${order.id}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className={styles.checkoutCloseButton}
            onClick={() => router.replace("/sales")}
            aria-label="Retour aux ventes"
            disabled={isSubmitting}
          >
            <X size={16} />
          </button>
        </nav>

        {/* ============================= ÉCRAN SUCCÈS ============================= */}
        {step === "success" && completedSale ? (
          <section className={styles.successScreen}>
            <div className={styles.successIcon}>
              <CheckCircle2 size={40} strokeWidth={1.5} />
            </div>
            <h1>Paiement réussi</h1>
            <p className={styles.successSubtitle}>Vente #{completedSale.saleId}</p>

            <div className={styles.successGrid}>
              <div className={styles.successCard}>
                <span>Total payé</span>
                <strong>{money(completedSale.total)}</strong>
              </div>
              <div className={styles.successCard}>
                <span>Mode</span>
                <strong>{PAYMENT_LABELS[completedSale.method]}</strong>
              </div>
              {completedSale.method === "cash" && (
                <>
                  <div className={styles.successCard}>
                    <span>Espèces reçues</span>
                    <strong>{money(completedSale.given)}</strong>
                  </div>
                  <div className={styles.successCard}>
                    <span>Monnaie rendue</span>
                    <strong>{money(completedSale.change)}</strong>
                  </div>
                </>
              )}
            </div>

            <div className={styles.successActionsLarge}>
              <button type="button" className={styles.secondaryButton} onClick={printReceipt}>
                <Printer size={15} /> Imprimer
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => alert("Envoi à connecter")}
              >
                <Send size={15} /> Envoyer
              </button>
              <button type="button" className={styles.primaryButton} onClick={startNewSale}>
                <Plus size={15} /> Nouvelle vente
              </button>
            </div>
          </section>
        ) : showOrders ? (
          /* ============================= LISTE COMMANDES ============================= */
          <section className={styles.pendingOrdersPage}>
            <div className={styles.checkoutSelectionHeader}>
              <div>
                <p className={styles.stepEyebrow}>Commandes</p>
                <h1>Reprendre une commande</h1>
              </div>
              <button type="button" className={styles.primaryButton} onClick={createOrderTab} style={{ width: "auto" }}>
                <Plus size={13} /> Nouvelle
              </button>
            </div>
            <div className={styles.pendingOrdersList}>
              {orderTabs.map((order) => {
                const total = order.draft.cart.reduce((s, l) => s + l.unit_price * l.quantity, 0);
                const items = order.draft.cart.reduce((s, l) => s + l.quantity, 0);
                return (
                  <button
                    key={order.id}
                    type="button"
                    className={`${styles.pendingOrderCard} ${activeOrderId === order.id ? styles.pendingOrderCardActive : ""}`}
                    onClick={() => selectOrderTab(order)}
                  >
                    <div className={styles.pendingOrderHeader}>
                      <span className={styles.pendingOrderNumber}>Commande #{order.id}</span>
                      <span className={styles.pendingOrderTime}>
                        {order.draft.createdAt
                          ? new Date(order.draft.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </span>
                    </div>
                    <strong>
                      {order.draft.cart.length === 0
                        ? "Panier vide"
                        : `${order.draft.cart.length} ligne${order.draft.cart.length > 1 ? "s" : ""} · ${items} art.`}
                    </strong>
                    <b>{money(total)}</b>
                  </button>
                );
              })}
            </div>
          </section>
        ) : step === "products" ? (
          /* ============================= SÉLECTION PRODUITS ============================= */
          <section className={styles.checkoutProductSelection}>
            <aside className={styles.checkoutDraftCart}>
              <div className={styles.checkoutSelectionHeader}>
                <div>
                  <p className={styles.stepEyebrow}>Commande #{activeOrderId}</p>
                  <h1>Panier</h1>
                </div>
              </div>

              <div className={styles.checkoutDraftLines}>
                {draft.cart.length === 0 ? (
                  <div className={styles.emptyCart}>
                    <span className={styles.cartIcon}><ShoppingBag size={16} /></span>
                    <p>Ajoutez des produits.</p>
                  </div>
                ) : (
                  draft.cart.map((line) => (
                    <div className={styles.checkoutDraftLine} key={line.id}>
                      <span className={styles.checkoutDraftLineQty}>{line.quantity}</span>
                      <span className={styles.checkoutDraftLineName}>{line.name}</span>
                      <b className={styles.checkoutDraftLinePrice}>
                        {money(line.unit_price * line.quantity)}
                      </b>
                      <button
                        type="button"
                        className={styles.checkoutDraftLineRemove}
                        onClick={() => removeProduct(line.id)}
                        aria-label={`Retirer ${line.name}`}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {customers.length > 0 && (
                <>
                  <label className={styles.customerLabel} htmlFor="checkout-customer">
                    Client <span>(facultatif)</span>
                  </label>
                  <select
                    id="checkout-customer"
                    value={draft.selectedCustomer}
                    onChange={(e) => updateDraft({ ...draft, selectedCustomer: e.target.value })}
                  >
                    <option value="">Vente comptoir</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </>
              )}

              <div className={styles.checkoutDraftFooter}>
                <div className={styles.totalRow}>
                  <span>Total</span>
                  <strong>{money(subtotal)}</strong>
                </div>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => setStep("payment")}
                  disabled={!draft.cart.length}
                >
                  Paiement {money(subtotal)}
                </button>
              </div>
            </aside>

            <div className={styles.checkoutCatalogSide}>
              <div className={styles.checkoutSelectionHeader}>
                <div>
                  <p className={styles.stepEyebrow}>Catalogue</p>
                  <h1>Ajouter des produits</h1>
                </div>
              </div>

              <div className={styles.catalogToolbar}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  aria-label="Rechercher"
                />
                {search && (
                  <button type="button" className={styles.searchClear} onClick={() => setSearch("")} aria-label="Effacer">
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

              <div className={styles.checkoutProductList}>
                {filteredProducts.length === 0 ? (
                  <div className={styles.productListEmpty}>
                    <p>Aucun produit.</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const inCart = draft.cart.find((l) => l.id === product.id);
                    const isOut = product.stock_quantity < 1;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        className={styles.productRow}
                        onClick={() => addProduct(product)}
                        disabled={isOut}
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
                        </div>
                        <div className={styles.productPriceCol}>
                          <b>{money(product.unit_price)}</b>
                          <i><Plus size={12} /></i>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        ) : (
          /* ============================= PAIEMENT ============================= */
          <div className={styles.paymentBody}>
            <div className={styles.paymentCol}>
              <section className={styles.paymentSection}>
                <p className={styles.paymentSectionLabel}>Mode de paiement</p>
                <div className={styles.methodGrid}>
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      className={paymentMethod === method.id ? styles.methodButtonActive : styles.methodButton}
                      onClick={() => {
                        setPaymentMethod(method.id);
                        if (method.id !== "cash") setCashReceived("");
                      }}
                      disabled={isSubmitting}
                    >
                      {method.image ? (
                        <img className={styles.methodImage} src={method.image} alt="" />
                      ) : (
                        <span className={styles.methodIcon}>{method.icon}</span>
                      )}
                      <span className={styles.methodLabel}>{method.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {isCash && (
                <>
                  <section className={styles.paymentSection}>
                    <p className={styles.paymentSectionLabel}>Montant reçu</p>
                    <div className={styles.cashInputRow}>
                      <div className={`${styles.cashInputDisplay} ${cashReceived ? styles.cashInputDisplayActive : ""}`}>
                        <span className={styles.cashInputDisplayValue}>
                          {received.toLocaleString("fr-FR")}
                        </span>
                        <span className={styles.cashInputDisplaySuffix}>FCFA</span>
                      </div>
                      <button
                        type="button"
                        className={styles.exactButton}
                        onClick={() => setCashReceived(String(amountDue))}
                        disabled={isSubmitting}
                      >
                        Exact
                      </button>
                    </div>
                  </section>

                  <div className={styles.keypadRow}>
                    <div className={styles.keypad}>
                      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "C"].map((digit) => (
                        <button
                          key={digit}
                          type="button"
                          className={`${styles.keypadKey} ${digit === "C" ? styles.keypadKeyDanger : ""} ${digit === "00" ? styles.keypadKeyAccent : ""}`}
                          onClick={() => appendDigit(digit)}
                          disabled={isSubmitting}
                        >
                          {digit}
                        </button>
                      ))}
                    </div>
                    <div className={styles.quickAmounts}>
                      {QUICK_AMOUNTS.map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          className={styles.quickAmount}
                          onClick={() => setCashReceived(String(received + amount))}
                          disabled={isSubmitting}
                        >
                          +{amount.toLocaleString("fr-FR")}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {error && <p className={styles.message} role="alert">{error}</p>}

              <div className={styles.paymentActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setStep("products")}
                  disabled={isSubmitting}
                >
                  Retour
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={submitSale}
                  disabled={!cashSufficient || isSubmitting}
                >
                  {isSubmitting
                    ? "…"
                    : isCash
                    ? cashSufficient
                      ? "Valider"
                      : "Montant insuffisant"
                    : `Payer ${money(amountDue)}`}
                </button>
              </div>
            </div>

            <aside className={styles.paymentSummary}>
              <div className={styles.totalHero}>
                <span className={styles.totalHeroLabel}>Total</span>
                <div className={styles.totalHeroAmount}>
                  <strong>{Math.round(amountDue).toLocaleString("fr-FR")}</strong>
                  <em>FCFA</em>
                </div>
                <span className={styles.totalHeroMeta}>
                  {draft.cart.length} art. · Commande #{activeOrderId}
                </span>
              </div>

              {isCash && received > 0 && (
                <div className={styles.paymentLineList}>
                  <div className={styles.paymentLineItem}>
                    <div>
                      <span>Espèces reçues</span>
                      <strong>{money(received)}</strong>
                    </div>
                    <button
                      type="button"
                      className={styles.paymentLineRemove}
                      onClick={() => setCashReceived("")}
                      aria-label="Effacer"
                      disabled={isSubmitting}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}

              {isCash ? (
                <div
                  className={`${styles.remainingBox} ${
                    changeState === "insufficient"
                      ? styles.remainingInsufficient
                      : changeState === "ok"
                      ? styles.remainingOk
                      : ""
                  }`}
                  aria-live="polite"
                >
                  <div className={styles.remainingRow}>
                    <span>
                      {changeState === "insufficient"
                        ? "Restant"
                        : changeState === "ok" && received === amountDue
                        ? "Exact"
                        : "Monnaie"}
                    </span>
                    <strong>
                      {changeState === "insufficient"
                        ? money(amountDue - received)
                        : changeState === "ok" && received === amountDue
                        ? "0 FCFA"
                        : money(change)}
                    </strong>
                  </div>
                  <div className={styles.remainingMeta}>
                    {changeState === "idle" && "Entrez le montant"}
                    {changeState === "insufficient" && "Montant insuffisant"}
                    {changeState === "ok" && received === amountDue && "Montant exact"}
                    {changeState === "ok" && received > amountDue && "À rendre"}
                  </div>
                </div>
              ) : (
                <div className={styles.remainingBox}>
                  <div className={styles.remainingRow}>
                    <span>Mode</span>
                    <strong>{PAYMENT_LABELS[paymentMethod]}</strong>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}