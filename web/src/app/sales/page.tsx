"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "../../components/AppShell";
import { authHeaders } from "../../lib/auth";
import styles from "./page.module.css";

type Product = { id: number; name: string; sku: string; image_url?: string | null; unit_price: number; stock_quantity: number };
type Customer = { id: number; name: string; email?: string | null };
type CartLine = Product & { quantity: number };
type Handoff = { theoretical_balance: number; sales_total: number; cash_collected: number; withdrawals: number; previous_seller?: string | null; handoff_at: string; last_operation?: { type: string; amount: number } | null; requires_acknowledgement: boolean };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function SalesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error" | "info">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState("0");
  const [hasOpenSession, setHasOpenSession] = useState(false);
  const [isPaymentStep, setIsPaymentStep] = useState(false);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [isAcknowledgingHandoff, setIsAcknowledgingHandoff] = useState(false);
  const [userRole] = useState<"admin" | "seller">(() => {
    if (typeof window === "undefined") return "seller";
    try {
      const storedUser = window.localStorage.getItem("quincaillerie_user");
      if (!storedUser) return "seller";
      const parsed = JSON.parse(storedUser) as { role?: "admin" | "seller"; user?: { role?: "admin" | "seller" } };
      return (parsed.user?.role ?? parsed.role) === "admin" ? "admin" : "seller";
    } catch {
      return "seller";
    }
  });
  const queryClient = useQueryClient();
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
        const response = await fetch(`${API_URL}${path}`, { headers, credentials: "include" });
        return response.ok ? await response.json() as T : fallback;
      } catch {
        return fallback;
      }
    };

    Promise.all([
      loadResource<Customer[]>("/api/v1/customers", []),
      loadResource<{ status: string }[]>("/api/v1/cash/sessions", []),
      loadResource<Handoff | null>("/api/v1/cash/sessions/current/handoff", null),
    ]).then(([customerData, sessionData, handoffData]) => {
      setCustomers(customerData);
      setHasOpenSession(sessionData.some((session) => session.status === "open"));
      setHandoff(handoffData);
    }).finally(() => setIsLoading(false));
  }, []);

  const filteredProducts = products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(search.toLowerCase()));
  const total = useMemo(() => cart.reduce((sum, line) => sum + line.unit_price * line.quantity, 0), [cart]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  function addProduct(product: Product) {
    setMessage("");
    setCart((current) => {
      const existing = current.find((line) => line.id === product.id);
      if (existing) return current.map((line) => line.id === product.id ? { ...line, quantity: Math.min(line.quantity + 1, product.stock_quantity) } : line);
      return [...current, { ...product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: number, quantity: number) {
    setCart((current) => current.map((line) => line.id === productId ? { ...line, quantity: Math.max(1, Math.min(quantity, line.stock_quantity)) } : line));
  }

  function removeProduct(productId: number) {
    setCart((current) => current.filter((line) => line.id !== productId));
  }

  function continueToPayment() {
    if (cart.length === 0) {
      setNoticeType("error");
      setMessage("Ajoutez au moins un produit.");
      return;
    }
    setMessage("");
    setIsPaymentStep(true);
  }

  async function submitSale() {
    if (cart.length === 0) {
      setMessage("Ajoutez au moins un produit.");
      return;
    }

    setIsSubmitting(true);
    setNoticeType("info");
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/v1/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ customer_id: selectedCustomer ? Number(selectedCustomer) : null, status: "pending", discount_amount: Number(discount), payment_method: paymentMethod, items: cart.map((line) => ({ product_id: line.id, quantity: line.quantity, unit_price: line.unit_price })) }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = typeof payload?.detail === "string" ? payload.detail : "Erreur inconnue.";
        const normalized = detail.toLowerCase();

        setNoticeType("error");
        if (normalized.includes("stock")) {
          setMessage(`Vente non validée : ${detail}`);
        } else if (normalized.includes("caisse") || normalized.includes("cash session") || normalized.includes("open a cash session") || normalized.includes("acknowledge")) {
          setMessage("Une caisse ouverte est obligatoire pour valider une vente.");
        } else if (normalized.includes("payment")) {
          setMessage("Le mode de paiement sélectionné est invalide.");
        } else {
          setMessage(`La vente n'a pas pu être créée : ${detail}`);
        }
        return;
      }

      setCart([]);
      void queryClient.invalidateQueries({ queryKey: ["products", "catalog"] });
      setSelectedCustomer("");
      setIsPaymentStep(false);
      setNoticeType("success");
      setMessage("Vente créée et enregistrée dans la session de caisse.");
    } catch {
      setNoticeType("error");
      setMessage("La vente n'a pas pu être créée. Vérifiez les informations saisies.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function acknowledgeHandoff() {
    setIsAcknowledgingHandoff(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/cash/sessions/current/handoff/acknowledge`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error();
      setHandoff(await response.json());
    } catch {
      setMessage("Impossible d'enregistrer la prise en charge de la caisse.");
    } finally {
      setIsAcknowledgingHandoff(false);
    }
  }

  const requiresHandoff = userRole === "seller" && handoff?.requires_acknowledgement;

  useEffect(() => {
    if (!requiresHandoff) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [requiresHandoff]);

  return (
    <AppShell>
      {!isLoading && !hasOpenSession && (
        <div className={styles.sessionNotice}>
          <strong>Caisse à ouvrir.</strong> Une session ouverte est obligatoire pour valider une vente.{" "}
          <Link href="/cash">Ouvrir une caisse</Link>
        </div>
      )}

      <div className={styles.salesLayout}>
        <section className={styles.catalogPanel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Catalogue</p>
              <h2>Ajouter des produits</h2>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher un produit"
            />
          </div>

          {(isLoading || productsQuery.isPending) && <div className={styles.state}>Chargement…</div>}
          {!isLoading && !productsQuery.isPending && products.length === 0 && <div className={styles.state}>Aucun produit disponible.</div>}

          <div className={styles.productList}>
            {filteredProducts.map((product) => (
              <button
                type="button"
                className={styles.productRow}
                key={product.id}
                onClick={() => addProduct(product)}
                disabled={product.stock_quantity < 1 || Boolean(requiresHandoff)}
              >
                <span>
                  <strong>{product.image_url ? <img src={product.image_url} alt="" className={styles.productThumb} /> : null}{product.name}</strong>
                  <small>{product.sku} · {product.stock_quantity} en stock</small>
                </span>
                <b>{product.unit_price.toLocaleString("fr-FR")} FCFA</b>
                <i><Plus size={16} aria-hidden="true" /></i>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.cartPanel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Vente</p>
              <h2>Nouvelle vente</h2>
            </div>
            <span>{cart.length} ligne{cart.length > 1 ? "s" : ""}</span>
          </div>

          {isPaymentStep && <div className={styles.paymentStep}><p className={styles.stepEyebrow}>Étape 2 sur 2</p><h3>Choisir le paiement</h3><div className={styles.saleOptions}><label htmlFor="payment">Paiement<select id="payment" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="cash">Espèces</option><option value="wave">Wave</option><option value="orange_money">Orange Money</option><option value="mobile_money">Mobile Money</option><option value="card">Carte</option><option value="other">Autre</option></select></label><label htmlFor="discount">Remise FCFA<input id="discount" type="number" min="0" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label></div></div>}

          <div className={styles.cartLines}>
            {cart.length === 0 ? (
              <div className={styles.emptyCart}>
                <span className={styles.cartIcon}>+</span>
                <p>Votre panier est vide.</p>
              </div>
            ) : (
              cart.map((line) => (
                <div className={styles.cartLine} key={line.id}>
                  <div>
                    <strong>{line.image_url ? <img src={line.image_url} alt="" className={styles.cartThumb} /> : null}{line.name}</strong>
                    <small>{line.unit_price.toLocaleString("fr-FR")} FCFA par unité</small>
                  </div>
                  <div className={styles.quantity}>
                    <button type="button" onClick={() => updateQuantity(line.id, line.quantity - 1)}>
                      <Minus size={14} aria-hidden="true" />
                    </button>
                    <span>{line.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(line.id, line.quantity + 1)}>
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </div>
                  <b>{(line.unit_price * line.quantity).toLocaleString("fr-FR")} FCFA</b>
                  <button type="button" className={styles.remove} onClick={() => removeProduct(line.id)}>
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className={styles.totalRow}>
            <span>Total</span>
            <strong>{total.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FCFA</strong>
          </div>

          {message && (
            <div className={styles.statusModalBackdrop} onClick={() => setMessage("")}>
              <div className={`${styles.statusModal} ${noticeType === "success" ? styles.success : styles.error}`} role="status" aria-live="polite" onClick={(event) => event.stopPropagation()}>
                <div className={styles.statusModalHeader}>{noticeType === "success" ? "Succès" : "Attention"}</div>
                <h3 className={styles.statusModalTitle}>{noticeType === "success" ? "Vente enregistrée" : "Vente non validée"}</h3>
                <p className={styles.statusModalMessage}>{message}</p>
              </div>
            </div>
          )}

          <div className={styles.checkoutActions}>{isPaymentStep ? <><button type="button" className={styles.secondaryButton} onClick={() => setIsPaymentStep(false)} disabled={isSubmitting}>Retour au panier</button><button type="button" className={styles.primaryButton} onClick={submitSale} disabled={isSubmitting || cart.length === 0 || !hasOpenSession || Boolean(requiresHandoff)}>{isSubmitting ? "Enregistrement…" : "Confirmer la vente"}</button></> : <button type="button" className={styles.primaryButton} onClick={continueToPayment} disabled={cart.length === 0 || !hasOpenSession || Boolean(requiresHandoff)}>Passer au paiement</button>}</div>

          <label className={styles.customerLabel} htmlFor="customer">
            Client <span>(facultatif)</span>
          </label>
          <select
            id="customer"
            value={selectedCustomer}
            onChange={(event) => setSelectedCustomer(event.target.value)}
          >
            <option value="">Vente comptoir / aucun client</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </section>
      </div>
      {requiresHandoff && handoff && <div className={styles.handoffBackdrop}><section className={styles.handoffModal} role="dialog" aria-modal="true" aria-labelledby="handoff-title"><p className={styles.stepEyebrow}>Passation de caisse</p><h2 id="handoff-title">Prendre connaissance avant de vendre</h2><p className={styles.handoffIntro}>La caisse reste ouverte. Vérifiez la situation laissée par le vendeur précédent, puis confirmez votre prise en charge.</p><div className={styles.handoffMetrics}><div><span>Solde théorique actuel</span><strong>{handoff.theoretical_balance.toLocaleString("fr-FR")} FCFA</strong></div><div><span>Ventes réalisées</span><strong>{handoff.sales_total.toLocaleString("fr-FR")} FCFA</strong></div><div><span>Encaissements</span><strong>{handoff.cash_collected.toLocaleString("fr-FR")} FCFA</strong></div><div><span>Dépenses / retraits</span><strong>{handoff.withdrawals.toLocaleString("fr-FR")} FCFA</strong></div></div><div className={styles.handoffDetails}><span>Vendeur précédent <strong>{handoff.previous_seller ?? "Ouverture de journée"}</strong></span><span>Heure de passation <strong>{new Date(handoff.handoff_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</strong></span><span>Dernière opération <strong>{handoff.last_operation ? `${handoff.last_operation.type} · ${handoff.last_operation.amount.toLocaleString("fr-FR")} FCFA` : "Aucune opération"}</strong></span></div><button type="button" className={styles.primaryButton} onClick={acknowledgeHandoff} disabled={isAcknowledgingHandoff}>{isAcknowledgingHandoff ? "Enregistrement…" : "Je prends connaissance du solde et des opérations"}</button></section></div>}
    </AppShell>
  );
}