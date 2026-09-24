"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Plus,
  Printer,
  Send,
  ShoppingBag,
  Tag,
  User,
  X,
} from "lucide-react";
import PosSessionMenu from "../../components/PosSessionMenu";
import { authHeaders } from "../../lib/auth";
import { openSalesReceipt } from "../../lib/salesReceipt";
import styles from "./page.module.css";

type Product = {
  id: number; name: string; sku: string;
  image_url?: string | null; category?: string | null;
  unit_price: number; stock_quantity: number;
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
type Organization = { name?: string; logo?: string | null; email?: string | null; phone?: string | null; address?: string | null };
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
const DISCOUNT_PRESETS = [5, 10, 20];

const money = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} FCFA`;

const emptyDraft = (): Draft => ({
  cart: [], selectedCustomer: "", discount: "0", createdAt: Date.now(),
});

export default function CheckoutPage() {
  const router = useRouter();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [orderTabs, setOrderTabs] = useState<OrderTab[]>([]);
  const [activeOrderId, setActiveOrderId] = useState(1);
  const [showOrders, setShowOrders] = useState(false);
  const [step, setStep] = useState<Step>("payment");

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [seller, setSeller] = useState<{ full_name?: string; role?: string } | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [selectedCartLineId, setSelectedCartLineId] = useState<number | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [completedSale, setCompletedSale] = useState<{
    saleId: number; total: number; given: number; change: number;
    method: PaymentMethod; lines: CartLine[]; discount: number;
  } | null>(null);

  /* ---------- Chargement initial ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const createFreshDraft = () => {
      const initialDraft = emptyDraft();
      setDraft(initialDraft);
      setOrderTabs([{ id: 1, draft: initialDraft }]);
      setActiveOrderId(1);
      setStep("products");
    };

    try {
      const stored = window.sessionStorage.getItem("quincaillerie_sale_draft");
      if (!stored) {
        createFreshDraft();
        return;
      }

      const parsed = JSON.parse(stored) as Draft & {
        draft?: Draft; orderTabs?: OrderTab[]; activeOrderId?: number; step?: Step;
      };
      const initialDraft = parsed.draft ?? parsed;
      setDraft(initialDraft);
      setOrderTabs(parsed.orderTabs?.length ? parsed.orderTabs : [{ id: 1, draft: initialDraft }]);
      setActiveOrderId(parsed.activeOrderId ?? 1);
      setStep(parsed.step ?? (initialDraft.cart.length ? "payment" : "products"));
    } catch {
      createFreshDraft();
    }
  }, [router]);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/v1/cash/sessions`, { headers: authHeaders(), credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((sessions: { status: string }[]) => {
        if (active && !sessions.some((s) => s.status === "open")) router.replace("/cash");
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!draft) return;
    window.sessionStorage.setItem(
      "quincaillerie_sale_draft",
      JSON.stringify({ ...draft, draft, orderTabs, activeOrderId, step })
    );
  }, [activeOrderId, draft, orderTabs, step]);

  useEffect(() => {
    setProductsLoading(true);
    fetch(`${API_URL}/api/v1/products`, { headers: authHeaders(), credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<Product[]>) : []))
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));

    fetch(`${API_URL}/api/v1/customers`, { headers: authHeaders(), credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<Customer[]>) : []))
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/organization/profile`, { headers: authHeaders(), credentials: "include" })
      .then((response) => (response.ok ? (response.json() as Promise<Organization>) : null))
      .then(setOrganization)
      .catch(() => undefined);
    try {
      const stored = window.localStorage.getItem("quincaillerie_user");
      if (stored) {
        const parsed = JSON.parse(stored) as { full_name?: string; role?: string; user?: { full_name?: string; role?: string } };
        setSeller(parsed.user ?? parsed);
      }
    } catch {
      setSeller(null);
    }
  }, []);

  /* ---------- Calculs ---------- */
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) { const c = p.category?.trim(); if (c) set.add(c); }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const n = search.trim().toLowerCase();
    return products.filter((p) => {
      const okS = !n || `${p.name} ${p.sku}`.toLowerCase().includes(n);
      const okC = !activeCategory || p.category === activeCategory;
      return okS && okC;
    });
  }, [products, search, activeCategory]);

  const filteredCustomers = useMemo(() => {
    const n = customerQuery.trim().toLowerCase();
    if (!n) return customers.slice(0, 8);
    return customers.filter((c) => c.name.toLowerCase().includes(n)).slice(0, 8);
  }, [customers, customerQuery]);

  const subtotal = useMemo(
    () => draft?.cart.reduce((s, l) => s + l.unit_price * l.quantity, 0) ?? 0,
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
    : !cashReceived ? "idle"
    : received < amountDue ? "insufficient" : "ok";

  /* ---------- Actions ---------- */
  function updateDraft(next: Draft) {
    setDraft(next);
    setOrderTabs((c) => c.map((o) => (o.id === activeOrderId ? { ...o, draft: next } : o)));
  }
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
    const cart = draft.cart.flatMap((line) => {
      if (line.id !== productId) return [line];
      if (line.quantity <= 1) return [];
      return [{ ...line, quantity: line.quantity - 1 }];
    });
    updateDraft({ ...draft, cart });
  }
  function createOrderTab() {
    const nextId = Math.max(0, ...orderTabs.map((o) => o.id)) + 1;
    const nd = emptyDraft();
    setOrderTabs((c) => [...c, { id: nextId, draft: nd }]);
    setActiveOrderId(nextId); setDraft(nd);
    setStep("products"); setPaymentMethod("cash");
    setCashReceived(""); setShowOrders(false);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }
  function selectOrderTab(order: OrderTab) {
    setActiveOrderId(order.id); setDraft(order.draft);
    setStep(order.draft.cart.length ? "payment" : "products");
    setPaymentMethod("cash"); setCashReceived(""); setShowOrders(false);
  }
  function closeOrderTab(orderId: number) {
    if (orderTabs.length <= 1) {
      const fresh = emptyDraft();
      setDraft(fresh);
      setOrderTabs([{ id: orderTabs[0]?.id ?? 1, draft: fresh }]);
      setStep("products"); setShowOrders(false);
      return;
    }
    const remaining = orderTabs.filter((o) => o.id !== orderId);
    setOrderTabs(remaining);
    if (activeOrderId === orderId) {
      const next = remaining[remaining.length - 1];
      setActiveOrderId(next.id); setDraft(next.draft);
      setStep(next.draft.cart.length ? "payment" : "products");
    }
  }
  function appendDigit(digit: string) {
    setCashReceived((current) => {
      if (digit === "C") return "";
      if (digit === "00") {
        const base = current || "0";
        return base === "0" ? "0" : String(Number(base) * 100);
      }
      const next = `${current}${digit}`.replace(/^0+(?=\d)/, "");
      return next || "0";
    });
  }

  /* ---------- Raccourcis clavier ---------- */
  useEffect(() => {
    if (step === "success") return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isField = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
      if (e.key === "Delete" && !isField && step === "products" && selectedCartLineId !== null) {
        e.preventDefault();
        removeProduct(selectedCartLineId);
        setSelectedCartLineId(null);
        return;
      }
      if (e.key === "Escape") {
        if (showOrders) setShowOrders(false);
        else if (step === "payment") setStep("products");
        else if (isField) (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === "Enter" && !isField && step === "payment" && cashSufficient && !isSubmitting) {
        submitSale();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, showOrders, cashSufficient, isSubmitting, selectedCartLineId, draft]);

  async function submitSale() {
    if (!draft || !cashSufficient || isSubmitting) return;
    setIsSubmitting(true); setError("");
    const given = isCash ? received : amountDue;
    const changeValue = isCash ? change : 0;
    const linesSnapshot = draft.cart.map((l) => ({ ...l }));

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
            product_id: l.id, quantity: l.quantity, unit_price: l.unit_price,
          })),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        id?: number; total_amount?: number; detail?: string;
      };
      if (!response.ok) {
        setError(typeof payload?.detail === "string"
          ? payload.detail
          : "La vente n'a pas pu être enregistrée.");
        return;
      }
      setCompletedSale({
        saleId: payload.id ?? 0,
        total: Number(payload.total_amount ?? amountDue),
        given, change: changeValue, method: paymentMethod,
        lines: linesSnapshot, discount,
      });
      setStep("success");
    } catch {
      setError("Erreur réseau. La vente n'a pas pu être enregistrée.");
    } finally { setIsSubmitting(false); }
  }

  function printReceipt() {
    if (!completedSale) return;
    openSalesReceipt({
      ...completedSale,
      methodLabel: PAYMENT_LABELS[completedSale.method],
      companyName: organization?.name ?? "MIZAN ERP",
      companyLogo: organization?.logo,
      companyEmail: organization?.email,
      companyPhone: organization?.phone,
      companyAddress: organization?.address,
      sellerName: seller?.full_name ?? "Vendeur",
      sellerRole: seller?.role,
      customerName: customers.find((customer) => String(customer.id) === draft?.selectedCustomer)?.name,
    });
  }

  function startNewSale() {
    setCompletedSale(null); setError("");
    const nd = emptyDraft();
    const remaining = orderTabs.filter((o) => o.id !== activeOrderId);
    const nextId = Math.max(0, ...remaining.map((o) => o.id), activeOrderId) + 1;
    const nextOrder = { id: nextId, draft: nd };
    setDraft(nd); setOrderTabs([...remaining, nextOrder]);
    setActiveOrderId(nextId); setStep("products");
    setPaymentMethod("cash"); setCashReceived("");
    setDiscountOpen(false);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function handleSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    if (filteredProducts.length === 0) return;
    addProduct(filteredProducts[0]);
    setSearch("");
  }

  if (!draft) return <main className={styles.paymentPage} aria-busy="true" />;

  return (
    <main className={styles.paymentPage}>
      <div className={styles.paymentPageContent}>
        {/* ============ TOOLBAR ============ */}
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
            type="button" className={styles.checkoutNewOrder}
            onClick={createOrderTab} disabled={isSubmitting}
            aria-label="Nouvelle commande" title="Nouvelle commande"
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
                  <button type="button" className={styles.checkoutOrderTab}
                    onClick={() => selectOrderTab(order)}>
                    <span className={styles.checkoutOrderTabNumber}>#{order.id}</span>
                    <span className={styles.checkoutOrderTabTotal}>
                      {order.draft.cart.length > 0 ? money(total) : "vide"}
                    </span>
                  </button>
                  <button type="button" className={styles.checkoutOrderTabClose}
                    onClick={(e) => { e.stopPropagation(); closeOrderTab(order.id); }}
                    aria-label={`Fermer la commande ${order.id}`}>
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className={`${styles.catalogToolbar} ${styles.checkoutHeaderSearch}`}>
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKey}
              placeholder="Rechercher… (Entrée pour ajouter)"
              aria-label="Rechercher"
              autoFocus
            />
            {search && (
              <button type="button" className={styles.searchClear}
                onClick={() => setSearch("")} aria-label="Effacer">
                <X size={15} />
              </button>
            )}
          </div>

          <PosSessionMenu inline />
        </nav>

        {/* ============ SUCCÈS ============ */}
        {step === "success" && completedSale ? (
          <section className={styles.successScreen}>
            <div className={styles.successIcon}>
              <CheckCircle2 size={46} strokeWidth={1.5} />
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

            <details className={styles.receiptPreview} open>
              <summary>Aperçu du reçu</summary>
              <div className={styles.receiptPreviewBody}>
                {completedSale.lines.map((l) => (
                  <div className={styles.receiptLine} key={l.id}>
                    <span>{l.quantity}× {l.name}</span>
                    <span>{money(l.unit_price * l.quantity)}</span>
                  </div>
                ))}
                {completedSale.discount > 0 && (
                  <div className={styles.receiptLine}>
                    <span>Remise</span>
                    <span>- {money(completedSale.discount)}</span>
                  </div>
                )}
                <div className={`${styles.receiptLine} ${styles.receiptTotal}`}>
                  <span>Total</span>
                  <strong>{money(completedSale.total)}</strong>
                </div>
              </div>
            </details>

            <div className={styles.successActionsLarge}>
              <button type="button" className={styles.secondaryButton} onClick={printReceipt}>
                <Printer size={17} /> Imprimer
              </button>
              <button type="button" className={styles.secondaryButton}
                onClick={() => alert("Envoi à connecter")}>
                <Send size={17} /> Envoyer
              </button>
              <button type="button" className={styles.primaryButton} onClick={startNewSale}>
                <Plus size={17} /> Nouvelle vente
              </button>
            </div>
          </section>
        ) : showOrders ? (
          /* ============ LISTE COMMANDES ============ */
          <section className={styles.pendingOrdersPage}>
            <div className={styles.checkoutSelectionHeader}>
              <div>
                <p className={styles.stepEyebrow}>Commandes</p>
                <h1>Reprendre une commande</h1>
              </div>
              <button type="button" className={styles.primaryButton}
                onClick={createOrderTab} style={{ width: "auto" }}>
                <Plus size={15} /> Nouvelle
              </button>
            </div>
            <div className={styles.pendingOrdersList}>
              {orderTabs.map((order) => {
                const total = order.draft.cart.reduce((s, l) => s + l.unit_price * l.quantity, 0);
                const items = order.draft.cart.reduce((s, l) => s + l.quantity, 0);
                return (
                  <button key={order.id} type="button"
                    className={`${styles.pendingOrderCard} ${activeOrderId === order.id ? styles.pendingOrderCardActive : ""}`}
                    onClick={() => selectOrderTab(order)}>
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
          /* ============ SÉLECTION PRODUITS ============ */
          <section className={styles.checkoutProductSelection}>
            <aside className={styles.checkoutDraftCart}>
              <div className={styles.checkoutSelectionHeader}>
                <div />
              </div>

              <div className={styles.checkoutDraftLines}>
                {draft.cart.length === 0 ? (
                  <div className={styles.emptyCart}>
                    <span className={styles.cartIcon}><ShoppingBag size={18} /></span>
                    <p>Ajoutez des produits.</p>
                    <small>Touchez une carte pour l’ajouter.</small>
                  </div>
                ) : (
                  draft.cart.map((line) => (
                    <div
                      className={`${styles.checkoutDraftLine} ${selectedCartLineId === line.id ? styles.checkoutDraftLineSelected : ""}`}
                      key={line.id}
                      tabIndex={0}
                      role="button"
                      onFocus={() => setSelectedCartLineId(line.id)}
                      onClick={() => setSelectedCartLineId(line.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedCartLineId(line.id);
                        }
                      }}
                      aria-label={`${line.name}, appuyez sur Delete pour supprimer`}
                    >
                      <span className={styles.checkoutDraftLineQty}>{line.quantity}</span>
                      <span className={styles.checkoutDraftLineName}>{line.name}</span>
                      <b className={styles.checkoutDraftLinePrice}>
                        {money(line.unit_price * line.quantity)}
                      </b>
                      <button type="button" className={styles.checkoutDraftLineRemove}
                        onClick={() => removeProduct(line.id)}
                        aria-label={`Retirer ${line.name}`}>
                        <X size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className={styles.checkoutDraftFooter}>
                {/* Remise */}
                <div className={styles.discountRow}>
                  <button type="button" className={styles.discountToggle}
                    onClick={() => setDiscountOpen((v) => !v)}
                    aria-expanded={discountOpen}>
                    <Tag size={14} /> Remise {discount > 0 ? `· ${money(discount)}` : ""}
                  </button>
                  {discountOpen && (
                    <div className={styles.discountPanel}>
                      <input type="number" inputMode="numeric" min={0} max={subtotal}
                        value={draft.discount}
                        onChange={(e) => updateDraft({ ...draft, discount: e.target.value })}
                        placeholder="Montant (FCFA)" />
                      <div className={styles.discountPresets}>
                        {DISCOUNT_PRESETS.map((pct) => (
                          <button key={pct} type="button" className={styles.discountPreset}
                            onClick={() => updateDraft({ ...draft, discount: String(Math.round((subtotal * pct) / 100)) })}>
                            {pct}%
                          </button>
                        ))}
                        <button type="button" className={styles.discountPreset}
                          onClick={() => updateDraft({ ...draft, discount: "0" })}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Client */}
                {customers.length > 0 && (
                  <div className={styles.customerPicker}>
                    <div className={styles.customerFieldWrap}>
                      <User size={16} className={styles.customerFieldIcon} />
                      <input
                        id="checkout-customer"
                        type="text"
                        autoComplete="off"
                        value={
                          customerOpen
                            ? customerQuery
                            : customers.find((c) => String(c.id) === draft.selectedCustomer)?.name ?? customerQuery
                        }
                        placeholder="Client"
                        onChange={(e) => { setCustomerQuery(e.target.value); setCustomerOpen(true); }}
                        onFocus={() => setCustomerOpen(true)}
                        onBlur={() => setTimeout(() => setCustomerOpen(false), 150)}
                      />
                      {draft.selectedCustomer && (
                        <button type="button" className={styles.customerFieldClear}
                          onClick={() => { updateDraft({ ...draft, selectedCustomer: "" }); setCustomerQuery(""); }}
                          aria-label="Effacer le client">
                          <X size={14} />
                        </button>
                      )}
                      {customerOpen && filteredCustomers.length > 0 && (
                        <ul className={styles.customerDropdown} role="listbox">
                          <li>
                            <button type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                updateDraft({ ...draft, selectedCustomer: "" });
                                setCustomerQuery(""); setCustomerOpen(false);
                              }}>
                              Vente comptoir
                            </button>
                          </li>
                          {filteredCustomers.map((c) => (
                            <li key={c.id}>
                              <button type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  updateDraft({ ...draft, selectedCustomer: String(c.id) });
                                  setCustomerQuery(c.name); setCustomerOpen(false);
                                }}>
                                {c.name}
                                {c.email && <small>{c.email}</small>}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                <div className={styles.totalRow}>
                  <div>
                    <span>Total</span>
                    {discount > 0 && (
                      <small>Sous-total {money(subtotal)} · Remise {money(discount)}</small>
                    )}
                  </div>
                  <strong>{money(amountDue)}</strong>
                </div>
                <button type="button" className={styles.primaryButton}
                  onClick={() => setStep("payment")} disabled={!draft.cart.length}>
                  Paiement
                </button>
              </div>
            </aside>

            <div className={styles.checkoutCatalogSide}>
              {categories.length > 0 && (
                <div className={styles.categoryBar} role="tablist">
                  <button type="button"
                    className={activeCategory === "" ? styles.categoryActive : styles.categoryChip}
                    onClick={() => setActiveCategory("")}>Toutes</button>
                  {categories.map((category) => (
                    <button key={category} type="button"
                      className={activeCategory === category ? styles.categoryActive : styles.categoryChip}
                      onClick={() => setActiveCategory(category)}>
                      {category}
                    </button>
                  ))}
                </div>
              )}

              <div className={styles.checkoutProductList}>
                {productsLoading ? (
                  Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className={styles.productRowSkeleton} aria-hidden="true">
                      <span className={styles.skeletonImage} />
                      <div className={styles.productRowSkeletonText}>
                        <span className={styles.skeletonLine} style={{ width: "72%" }} />
                        <span className={styles.skeletonLine} style={{ width: "44%" }} />
                      </div>
                    </div>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <div className={styles.productListEmpty}>
                    <p>Aucun produit.</p>
                    {(search || activeCategory) && (
                      <button type="button" className={styles.resetFilters}
                        onClick={() => { setSearch(""); setActiveCategory(""); }}>
                        Réinitialiser
                      </button>
                    )}
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const inCart = draft.cart.find((l) => l.id === product.id);
                    const isOut = product.stock_quantity < 1;
                    return (
                      <button key={product.id} type="button"
                        className={`${styles.productRow}${inCart ? ` ${styles.productRowActive}` : ""}${isOut ? ` ${styles.productRowOut}` : ""}`}
                        onClick={() => addProduct(product)}
                        disabled={isOut}
                        aria-label={product.name}>
                        <span className={styles.productImageWrap}>
                          {product.image_url ? (
                            <img src={product.image_url} alt="" className={styles.productThumb} loading="lazy" />
                          ) : (
                            <span className={styles.productImageFallback}>
                              {product.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          {inCart && (
                            <span className={styles.productQtyBadge}>{inCart.quantity}</span>
                          )}
                          {isOut && (
                            <span className={styles.productOutOverlay}>Rupture</span>
                          )}
                          <span className={styles.productAddIcon} aria-hidden="true">
                            <Plus size={14} />
                          </span>
                        </span>
                        <span className={styles.productName}>{product.name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        ) : (
          /* ============ PAIEMENT ============ */
          <div className={styles.paymentBody}>
            <div className={styles.paymentCol}>
              <section className={styles.paymentSection}>
                <p className={styles.paymentSectionLabel}>Mode de paiement</p>
                <div className={styles.methodGrid}>
                  {PAYMENT_METHODS.map((method) => (
                    <button key={method.id} type="button"
                      className={paymentMethod === method.id ? styles.methodButtonActive : styles.methodButton}
                      onClick={() => { setPaymentMethod(method.id); if (method.id !== "cash") setCashReceived(""); }}
                      disabled={isSubmitting}>
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
                        <span className={styles.cashInputDisplayValue}>{received.toLocaleString("fr-FR")}</span>
                        <span className={styles.cashInputDisplaySuffix}>FCFA</span>
                      </div>
                      <button type="button" className={styles.exactButton}
                        onClick={() => setCashReceived(String(Math.round(amountDue)))}
                        disabled={isSubmitting}>Exact</button>
                    </div>
                  </section>

                  <div className={styles.keypadRow}>
                    <div className={styles.keypad}>
                      {["1","2","3","4","5","6","7","8","9","00","0","C"].map((digit) => (
                        <button key={digit} type="button"
                          className={`${styles.keypadKey} ${digit === "C" ? styles.keypadKeyDanger : ""} ${digit === "00" ? styles.keypadKeyAccent : ""}`}
                          onClick={() => appendDigit(digit)} disabled={isSubmitting}>
                          {digit}
                        </button>
                      ))}
                    </div>
                    <div className={styles.quickAmounts}>
                      {QUICK_AMOUNTS.map((amount) => (
                        <button key={amount} type="button" className={styles.quickAmount}
                          onClick={() => setCashReceived(String(received + amount))}
                          disabled={isSubmitting}>
                          +{amount.toLocaleString("fr-FR")}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {error && <p className={styles.message} role="alert">{error}</p>}

              <div className={styles.paymentActions}>
                <button type="button" className={styles.secondaryButton}
                  onClick={() => setStep("products")} disabled={isSubmitting}>
                  Retour
                </button>
                <button type="button" className={styles.primaryButton}
                  onClick={submitSale} disabled={!cashSufficient || isSubmitting}>
                  {isSubmitting ? "…"
                    : isCash
                    ? cashSufficient ? `Valider · ${money(amountDue)}` : "Montant insuffisant"
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
                  {discount > 0 ? ` · Remise ${money(discount)}` : ""}
                </span>
              </div>

              {isCash && received > 0 && (
                <div className={styles.paymentLineList}>
                  <div className={styles.paymentLineItem}>
                    <div>
                      <span>Espèces reçues</span>
                      <strong>{money(received)}</strong>
                    </div>
                    <button type="button" className={styles.paymentLineRemove}
                      onClick={() => setCashReceived("")} aria-label="Effacer" disabled={isSubmitting}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {isCash ? (
                <div className={`${styles.remainingBox} ${changeState === "insufficient" ? styles.remainingInsufficient : changeState === "ok" ? styles.remainingOk : ""}`}
                  aria-live="polite">
                  <div className={styles.remainingRow}>
                    <span>
                      {changeState === "insufficient" ? "Restant"
                        : changeState === "ok" && received === amountDue ? "Exact"
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
                  <div className={styles.remainingMeta}>
                    Validation par {PAYMENT_LABELS[paymentMethod].toLowerCase()}
                  </div>
                </div>
              )}

              {draft.cart.length > 0 && (
                <details className={styles.paymentLinesDetails}>
                  <summary>
                    Détail · {draft.cart.reduce((s, l) => s + l.quantity, 0)} article(s)
                  </summary>
                  <div className={styles.paymentLinesDetailsBody}>
                    {draft.cart.map((l) => (
                      <div className={styles.receiptLine} key={l.id}>
                        <span>{l.quantity}× {l.name}</span>
                        <span>{money(l.unit_price * l.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}