"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import AppShell from "../../components/AppShell";
import styles from "./page.module.css";

type Product = {
  id: number;
  sku: string;
  name: string;
  image_url?: string | null;
  category?: string | null;
  unit_price: number;
  initial_stock_quantity: number;
  sold_quantity: number;
  remaining_stock: number;
  is_active: boolean;
};

type ProductForm = {
  sku: string;
  name: string;
  category: string;
  unit_price: string;
  stock_quantity: string;
  image_url: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const NEW_CATEGORY = "__new_category__";
const emptyForm: ProductForm = { sku: "", name: "", category: "", unit_price: "", stock_quantity: "", image_url: "" };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const isAdmin = typeof window !== "undefined" && JSON.parse(window.localStorage.getItem("quincaillerie_user") ?? "{}")?.role === "admin";
  const tokenHeaders = (): Record<string, string> => ({});

  async function loadProducts() {
    const response = await fetch(`${API_URL}/api/v1/products`, { headers: tokenHeaders(), credentials: "include" });
    if (!response.ok) throw new Error();
    setProducts(await response.json());
  }

  useEffect(() => {
    loadProducts()
      .catch(() => setError("Le catalogue n'est pas disponible."))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedProduct]);

  const visibleProducts = useMemo(
    () =>
      products.filter((product) =>
        `${product.name} ${product.sku} ${product.category ?? ""}`.toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  );

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category?.trim()).filter((category): category is string => Boolean(category)))].sort((left, right) => left.localeCompare(right, "fr")),
    [products]
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setIsNewCategory(false);
    setImageFile(null);
    setImagePreview("");
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
      image_url: product.image_url ?? "",
    });
    setImageFile(null);
    setImagePreview(product.image_url ?? "");
    setIsNewCategory(!product.category || !categories.includes(product.category));
    setShowForm(true);
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Erreur de lecture d'image."));
      reader.readAsDataURL(file);
    });
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    let imageUrl = form.image_url || null;
    if (imageFile) {
      setIsUploadingImage(true);
      try {
        if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET) {
          const uploadData = new FormData();
          uploadData.append("file", imageFile);
          uploadData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
          const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: uploadData });
          if (uploadResponse.ok) {
            imageUrl = (await uploadResponse.json()).secure_url;
          }
        }

        if (!imageUrl) {
          imageUrl = await readFileAsDataUrl(imageFile);
        }
      } catch {
        setError("L'image n'a pas pu être téléversée.");
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    const response = await fetch(`${API_URL}/api/v1/products${editingId ? `/${editingId}` : ""}`, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", ...tokenHeaders() },
      credentials: "include",
      body: JSON.stringify({
        ...form,
        image_url: imageUrl,
        unit_price: Number(form.unit_price),
        stock_quantity: Number(form.stock_quantity),
      }),
    });

    if (!response.ok) {
      setError("Échec de l'enregistrement. Vérifiez les données.");
      return;
    }

    setShowForm(false);
    setForm(emptyForm);
    setIsNewCategory(false);
    setImageFile(null);
    setImagePreview("");
    setEditingId(null);
    await loadProducts();
  }

  async function archiveProduct(product: Product) {
    if (!window.confirm(`Archiver « ${product.name} » ?`)) return;
    const response = await fetch(`${API_URL}/api/v1/products/${product.id}`, {
      method: "DELETE",
      headers: tokenHeaders(),
      credentials: "include",
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
          <p className={styles.eyebrow}>Collection & Traçabilité</p>
          <h1>Produits</h1>
          <p>Consulter les stocks, prix et historique d'inventaire.</p>
        </div>
        {isAdmin && (
          <button type="button" className={styles.primaryButton} onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            <span>Nouveau produit</span>
          </button>
        )}
      </header>

      {showForm && (
        <form className={styles.createForm} onSubmit={saveProduct}>
          <h2>{editingId ? "Modifier l'article" : "Nouvel article"}</h2>
          <input
            required
            placeholder="SKU"
            value={form.sku}
            onChange={(event) => setForm({ ...form, sku: event.target.value })}
          />
          <input
            required
            placeholder="Nom de l'article"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <select
            value={isNewCategory ? NEW_CATEGORY : form.category}
            onChange={(event) => {
              const newCategory = event.target.value === NEW_CATEGORY;
              setIsNewCategory(newCategory);
              setForm({ ...form, category: newCategory ? "" : event.target.value });
            }}
          >
            <option value="">Sélectionner une catégorie</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
            <option value={NEW_CATEGORY}>+ Nouvelle catégorie</option>
          </select>
          {isNewCategory && (
            <input
              required
              placeholder="Nom de la nouvelle catégorie"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            />
          )}
          <label className={styles.imageField}>
            Visuel de l'article
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setImageFile(file);
                setImagePreview(file ? URL.createObjectURL(file) : form.image_url);
              }}
            />
            {imagePreview && <img src={imagePreview} alt="Aperçu" className={styles.imagePreview} />}
          </label>
          <input
            required
            type="number"
            min="0"
            step="1"
            placeholder="Prix (FCFA)"
            value={form.unit_price}
            onChange={(event) => setForm({ ...form, unit_price: event.target.value })}
          />
          <input
            required
            type="number"
            min="0"
            placeholder={editingId ? "Ajuster le stock" : "Stock initial"}
            value={form.stock_quantity}
            onChange={(event) => setForm({ ...form, stock_quantity: event.target.value })}
          />
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={() => setShowForm(false)}>
              Annuler
            </button>
            <button type="submit" className={styles.primaryButton} disabled={isUploadingImage}>
              {isUploadingImage ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      )}

      <section className={styles.toolbar}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Rechercher un produit"
          placeholder="Rechercher par référence, désignation..."
        />
        <span>
          {visibleProducts.length} référence{visibleProducts.length > 1 ? "s" : ""}
        </span>
      </section>

      {error && <div className={styles.state}>{error}</div>}
      {isLoading && <div className={styles.state}>Chargement...</div>}
      {!isLoading && !error && products.length === 0 && (
        <div className={styles.state}>
          <p>Aucun produit enregistré.</p>
        </div>
      )}

      {visibleProducts.length > 0 && (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Désignation</span>
            <span>Prix</span>
            <span>Départ</span>
            <span>Vendus</span>
            <span>Restants</span>
            <span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {visibleProducts.map((product) => (
            <div
              className={styles.row}
              key={product.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedProduct(product)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") setSelectedProduct(product);
              }}
            >
              <div className={styles.productMeta}>
                {product.image_url ? (
                  <img src={product.image_url} alt="" className={styles.productThumb} />
                ) : (
                  <div className={styles.productThumb} />
                )}
                <div>
                  <strong>{product.name}</strong>
                  <small>{product.sku} · {product.category ?? "—"}</small>
                </div>
              </div>
              <span className={styles.price}>{product.unit_price.toLocaleString("fr-FR")} FCFA</span>
              <span>{product.initial_stock_quantity}</span>
              <span className={styles.sold}>{product.sold_quantity}</span>
              <span className={styles.remaining}>{product.remaining_stock}</span>
              <div className={styles.actions}>
                {isAdmin ? (
                  <>
                    <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(product); }}>
                      Éditer
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); archiveProduct(product); }}>
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

      {selectedProduct && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setSelectedProduct(null)}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="product-detail-title">
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Détails de l'article</p>
                <h2 id="product-detail-title">{selectedProduct.name}</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setSelectedProduct(null)} aria-label="Fermer">
                <X size={16} />
              </button>
            </div>
            {selectedProduct.image_url && (
              <img src={selectedProduct.image_url} alt={selectedProduct.name} className={styles.detailImage} />
            )}
            <div className={styles.detailGrid}>
              <div><span>SKU</span><strong>{selectedProduct.sku}</strong></div>
              <div><span>Catégorie</span><strong>{selectedProduct.category ?? "—"}</strong></div>
              <div><span>Prix unitaire</span><strong>{selectedProduct.unit_price.toLocaleString("fr-FR")} FCFA</strong></div>
              <div><span>Stock de départ</span><strong>{selectedProduct.initial_stock_quantity}</strong></div>
              <div><span>Vendus</span><strong>{selectedProduct.sold_quantity}</strong></div>
              <div><span>Restants</span><strong className={styles.remaining}>{selectedProduct.remaining_stock}</strong></div>
              <div><span>Statut</span><strong>{selectedProduct.is_active ? "Actif" : "Archivé"}</strong></div>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}