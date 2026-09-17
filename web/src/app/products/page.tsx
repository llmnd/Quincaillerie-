"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import styles from "./page.module.css";

type Product = { id: number; sku: string; name: string; category?: string | null; unit_price: number; initial_stock_quantity: number; sold_quantity: number; remaining_stock: number; is_active: boolean };
type ProductForm = { sku: string; name: string; category: string; unit_price: string; stock_quantity: string };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const emptyForm: ProductForm = { sku: "", name: "", category: "", unit_price: "", stock_quantity: "" };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const isAdmin = typeof window !== "undefined" && JSON.parse(window.localStorage.getItem("quincaillerie_user") ?? "{}")?.role === "admin";
  const tokenHeaders = (): Record<string, string> => {
    const token = window.localStorage.getItem("quincaillerie_access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  async function loadProducts() {
    const response = await fetch(`${API_URL}/api/v1/products`, { headers: tokenHeaders() });
    if (!response.ok) throw new Error();
    setProducts(await response.json());
  }

  useEffect(() => {
    loadProducts()
      .catch(() => setError("Le catalogue n'est pas disponible pour le moment."))
      .finally(() => setIsLoading(false));
  }, []);

  const visibleProducts = useMemo(
    () =>
      products.filter((product) =>
        `${product.name} ${product.sku} ${product.category ?? ""}`.toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      category: product.category ?? "",
      unit_price: String(product.unit_price),
      stock_quantity: String(product.remaining_stock),
    });
    setShowForm(true);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch(`${API_URL}/api/v1/products${editingId ? `/${editingId}` : ""}`, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", ...tokenHeaders() },
      body: JSON.stringify({
        ...form,
        unit_price: Number(form.unit_price),
        stock_quantity: Number(form.stock_quantity),
      }),
    });
    if (!response.ok) {
      setError("Enregistrement impossible. Vérifiez vos droits et le SKU.");
      return;
    }
    setShowForm(false);
    setForm(emptyForm);
    setEditingId(null);
    await loadProducts();
  }

  async function archiveProduct(product: Product) {
    if (!window.confirm(`Archiver « ${product.name} » ? L'historique des ventes sera conservé.`)) return;
    const response = await fetch(`${API_URL}/api/v1/products/${product.id}`, {
      method: "DELETE",
      headers: tokenHeaders(),
    });
    if (!response.ok) {
      setError("Archivage impossible.");
      return;
    }
    await loadProducts();
  }

  return (
    <AppShell>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Catalogue & traçabilité</p>
          <h1>Produits</h1>
          <p>Stock initial, prix, ventes cumulées et stock restant.</p>
        </div>
        {isAdmin && (
          <button type="button" className={styles.primaryButton} onClick={openCreate}>
            Nouveau produit
          </button>
        )}
      </header>

      {showForm && (
        <form className={styles.createForm} onSubmit={saveProduct}>
          <h2>{editingId ? "Modifier le produit" : "Nouveau produit"}</h2>
          <input
            required
            placeholder="SKU"
            value={form.sku}
            onChange={(event) => setForm({ ...form, sku: event.target.value })}
          />
          <input
            required
            placeholder="Nom du produit"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <input
            placeholder="Catégorie"
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
          />
          <input
            required
            type="number"
            min="0"
            step="1"
            placeholder="Prix en FCFA"
            value={form.unit_price}
            onChange={(event) => setForm({ ...form, unit_price: event.target.value })}
          />
          <input
            required
            type="number"
            min="0"
            placeholder={editingId ? "Stock restant corrigé" : "Stock de départ"}
            value={form.stock_quantity}
            onChange={(event) => setForm({ ...form, stock_quantity: event.target.value })}
          />
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={() => setShowForm(false)}>
              Annuler
            </button>
            <button className={styles.primaryButton}>Enregistrer</button>
          </div>
        </form>
      )}

      <section className={styles.toolbar}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Rechercher un produit"
          placeholder="Rechercher une référence…"
        />
        <span>
          {visibleProducts.length} référence{visibleProducts.length > 1 ? "s" : ""}
        </span>
      </section>

      {error && <div className={styles.state}>{error}</div>}
      {isLoading && <div className={styles.state}>Chargement du catalogue…</div>}
      {!isLoading && !error && products.length === 0 && (
        <div className={styles.state}>
          <h2>Aucun produit</h2>
          <p>Ajoutez votre première référence pour commencer à vendre.</p>
        </div>
      )}

      {visibleProducts.length > 0 && (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Produit</span>
            <span>Prix</span>
            <span>Départ</span>
            <span>Vendu</span>
            <span>Restant</span>
            <span>Actions</span>
          </div>
          {visibleProducts.map((product) => (
            <div className={styles.row} key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <small>
                  {product.sku} · {product.category ?? "Sans catégorie"}
                </small>
              </div>
              <span className={styles.price}>{product.unit_price.toLocaleString("fr-FR")} FCFA</span>
              <span>{product.initial_stock_quantity}</span>
              <span className={styles.sold}>{product.sold_quantity}</span>
              <span className={styles.remaining}>{product.remaining_stock}</span>
              <div className={styles.actions}>
                {isAdmin ? (
                  <>
                    <button type="button" onClick={() => openEdit(product)}>
                      Modifier
                    </button>
                    <button type="button" onClick={() => archiveProduct(product)}>
                      Archiver
                    </button>
                  </>
                ) : (
                  <small>Lecture seule</small>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}