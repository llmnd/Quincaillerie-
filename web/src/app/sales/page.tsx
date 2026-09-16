"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import styles from "./page.module.css";

type Product = { id: number; name: string; sku: string; unit_price: number; stock_quantity: number };
type Customer = { id: number; name: string; email?: string | null };
type CartLine = Product & { quantity: number };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState("0");
  const [hasOpenSession, setHasOpenSession] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem("quincaillerie_access_token");
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    Promise.all([
      fetch(`${API_URL}/api/v1/products`, { headers }).then((response) => response.json()),
      fetch(`${API_URL}/api/v1/customers`, { headers }).then((response) => response.json()),
      fetch(`${API_URL}/api/v1/cash/sessions`, { headers }).then((response) => response.json()),
    ])
      .then(([productData, customerData, sessionData]) => {
        setProducts(Array.isArray(productData) ? productData : []);
        setCustomers(Array.isArray(customerData) ? customerData : []);
        setHasOpenSession(Array.isArray(sessionData) && sessionData.some((session: { status: string }) => session.status === "open"));
      })
      .catch(() => setMessage("Impossible de charger les données de vente."))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredProducts = products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(search.toLowerCase()));
  const total = useMemo(() => cart.reduce((sum, line) => sum + line.unit_price * line.quantity, 0), [cart]);

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

  async function submitSale() {
    if (cart.length === 0) {
      setMessage("Ajoutez au moins un produit.");
      return;
    }

    const token = window.localStorage.getItem("quincaillerie_access_token");
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/v1/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ customer_id: selectedCustomer ? Number(selectedCustomer) : null, status: "pending", discount_amount: Number(discount), payment_method: paymentMethod, items: cart.map((line) => ({ product_id: line.id, quantity: line.quantity, unit_price: line.unit_price })) }),
      });
      if (!response.ok) throw new Error();
      setCart([]);
      setSelectedCustomer("");
      setMessage("Vente créée et enregistrée dans la session de caisse.");
    } catch {
      setMessage("La vente n’a pas pu être créée. Vérifiez le stock disponible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell>
      <header className={styles.pageHeader}><div><p className={styles.eyebrow}>Ventes</p><h1>Nouvelle vente</h1><p className={styles.description}>Le client est facultatif. Ajoutez les produits à vendre.</p></div><span className={hasOpenSession ? styles.status : styles.warning}>{hasOpenSession ? "Caisse ouverte" : "Caisse à ouvrir"}</span></header>
      {!hasOpenSession ? <div className={styles.sessionNotice}>Une session de caisse ouverte est obligatoire pour valider une vente. <Link href="/cash">Ouvrir une caisse</Link></div> : null}
      <div className={styles.salesLayout}>
        <section className={styles.catalogPanel}>
          <div className={styles.panelHeader}><div><p className={styles.eyebrow}>Catalogue</p><h2>Ajouter des produits</h2></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher…" aria-label="Rechercher un produit" /></div>
          {isLoading ? <div className={styles.state}>Chargement…</div> : null}
          {!isLoading && products.length === 0 ? <div className={styles.state}>Aucun produit disponible.</div> : null}
          <div className={styles.productList}>{filteredProducts.map((product) => <button type="button" className={styles.productRow} key={product.id} onClick={() => addProduct(product)} disabled={product.stock_quantity < 1}><span><strong>{product.name}</strong><small>{product.sku} · {product.stock_quantity} en stock</small></span><b>{product.unit_price.toLocaleString("fr-FR")} FCFA</b><i>+</i></button>)}</div>
        </section>

        <section className={styles.cartPanel}>
          <div className={styles.panelHeader}><div><p className={styles.eyebrow}>Commande</p><h2>Panier</h2></div><span>{cart.length} ligne{cart.length > 1 ? "s" : ""}</span></div>
          <label className={styles.customerLabel} htmlFor="customer">Client <span>(facultatif)</span></label>
          <select id="customer" value={selectedCustomer} onChange={(event) => setSelectedCustomer(event.target.value)}><option value="">Vente comptoir / aucun client</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select>
          <div className={styles.saleOptions}><label htmlFor="payment">Paiement<select id="payment" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="cash">Espèces</option><option value="card">Carte</option><option value="mobile_money">Mobile Money</option><option value="other">Autre</option></select></label><label htmlFor="discount">Remise FCFA<input id="discount" type="number" min="0" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label></div>
          <div className={styles.cartLines}>{cart.length === 0 ? <div className={styles.emptyCart}><span className={styles.cartIcon}>+</span><p>Votre panier est vide.</p></div> : cart.map((line) => <div className={styles.cartLine} key={line.id}><div><strong>{line.name}</strong><small>{line.unit_price.toLocaleString("fr-FR")} FCFA l’unité</small></div><div className={styles.quantity}><button type="button" onClick={() => updateQuantity(line.id, line.quantity - 1)}>-</button><span>{line.quantity}</span><button type="button" onClick={() => updateQuantity(line.id, line.quantity + 1)}>+</button></div><b>{(line.unit_price * line.quantity).toLocaleString("fr-FR")} FCFA</b><button type="button" className={styles.remove} onClick={() => removeProduct(line.id)}>×</button></div>)}</div>
          <div className={styles.totalRow}><span>Total</span><strong>{total.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FCFA</strong></div>
          {message ? <p className={styles.message} role="status">{message}</p> : null}
          <button type="button" className={styles.primaryButton} onClick={submitSale} disabled={isSubmitting || cart.length === 0 || !hasOpenSession}>{isSubmitting ? "Enregistrement…" : "Confirmer la vente"}</button>
        </section>
      </div>
    </AppShell>
  );
}