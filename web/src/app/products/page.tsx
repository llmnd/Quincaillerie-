"use client";

import { FormEvent, useEffect, useMemo, useState, ChangeEvent } from "react";
import { Plus, X, Search, Image as ImageIcon, UploadCloud } from "lucide-react";
import AppShell from "../../components/AppShell";
import { authHeaders } from "../../lib/auth";
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

const emptyForm: ProductForm = {
  sku: "",
  name: "",
  category: "",
  unit_price: "",
  stock_quantity: "",
  image_url: "",
};

const formatFCFA = (amount: number) =>
  `${amount.toLocaleString("fr-FR")} FCFA`;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Fix Hydration Error: On initialise `isAdmin` à `false` et met à jour au montage client
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedUser = window.localStorage.getItem("quincaillerie_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser) as { role?: "admin" | "seller"; user?: { role?: "admin" | "seller" } };
        setIsAdmin((parsed.user?.role ?? parsed.role) === "admin");
      }
    } catch {
      setIsAdmin(false);
    }
  }, []);

  async function loadProducts() {
    const response = await fetch(`${API_URL}/api/v1/products`, { headers: authHeaders(), credentials: "include" });
    if (!response.ok) throw new Error("Le catalogue n'est pas disponible.");
    return response.json() as Promise<Product[]>;
  }

  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      try {
        const nextProducts = await loadProducts();
        if (isMounted) setProducts(nextProducts);
      } catch {
        if (isMounted) setError("Le catalogue n'est pas disponible.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void fetchProducts();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedProduct && !showForm) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [selectedProduct, showForm]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category?.trim()).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, "fr")),
    [products]
  );

  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch = `${product.name} ${product.sku} ${product.category ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
        return matchesSearch && matchesCategory;
      }),
    [products, search, selectedCategory]
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

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  }

  function removeSelectedImage() {
    setImageFile(null);
    setImagePreview("");
    setForm({ ...form, image_url: "" });
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
          const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: uploadData,
          });
          if (uploadResponse.ok) {
            imageUrl = (await uploadResponse.json()).secure_url;
          }
        }
      } catch {
        setError("L'image n'a pas pu être envoyée.");
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    const response = await fetch(`${API_URL}/api/v1/products${editingId ? `/${editingId}` : ""}`, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
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
      headers: authHeaders(),
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
          <p className={styles.eyebrow}>Catalogue & Stock</p>
          <h1>Produits</h1>
          <p>Consulter et gérer les références, prix et inventaires.</p>
        </div>
        {isAdmin && (
          <button type="button" className={styles.primaryButton} onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            <span>Nouveau produit</span>
          </button>
        )}
      </header>

      {/* BARRE D'OUTILS ET RECHERCHE */}
      <section className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={16} aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher un produit"
            placeholder="Rechercher une référence ou une désignation..."
          />
        </div>
        {categories.length > 0 && (
          <select
            className={styles.categorySelect}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filtrer par catégorie"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
        <span className={styles.counterBadge}>
          {visibleProducts.length} référence{visibleProducts.length > 1 ? "s" : ""}
        </span>
      </section>

      {error && <div className={styles.state}>{error}</div>}
      {isLoading && <div className={styles.state}>Chargement du catalogue...</div>}
      {!isLoading && !error && products.length === 0 && (
        <div className={styles.state}>
          <p>Aucun produit dans le catalogue.</p>
        </div>
      )}

      {/* TABLEAU DES PRODUITS */}
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
          {visibleProducts.map((product) => {
            const isCritical = product.remaining_stock <= 2;
            const isLow = product.remaining_stock > 2 && product.remaining_stock <= 10;
            const stockClass = isCritical ? styles.stockCritical : isLow ? styles.stockLow : styles.stockNormal;

            return (
              <div
                className={styles.row}
                key={product.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedProduct(product)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedProduct(product);
                }}
              >
                <div className={styles.productMeta}>
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className={styles.productThumb} />
                  ) : (
                    <div className={`${styles.productThumb} ${styles.productThumbPlaceholder}`}>
                      <ImageIcon size={16} />
                    </div>
                  )}
                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.sku} · {product.category ?? "—"}</small>
                  </div>
                </div>
                <span className={styles.price}>{formatFCFA(product.unit_price)}</span>
                <span>{product.initial_stock_quantity}</span>
                <span className={styles.sold}>{product.sold_quantity}</span>
                <span className={`${styles.remaining} ${stockClass}`}>
                  {product.remaining_stock}
                </span>
                <div className={styles.actions}>
                  {isAdmin ? (
                    <>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={(e) => { e.stopPropagation(); openEdit(product); }}
                      >
                        Éditer
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        onClick={(e) => { e.stopPropagation(); archiveProduct(product); }}
                      >
                        Archiver
                      </button>
                    </>
                  ) : (
                    <small className={styles.sold}>Lecture seule</small>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE DE CRÉATION / ÉDITION */}
      {showForm && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Gestion Produit</p>
                <h2>{editingId ? "Modifier le produit" : "Ajouter un produit"}</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setShowForm(false)} aria-label="Fermer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={saveProduct} className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label htmlFor="sku">Référence (SKU)</label>
                <input
                  id="sku"
                  required
                  placeholder="ex: REF-8802"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="name">Nom du produit</label>
                <input
                  id="name"
                  required
                  placeholder="ex: Marteau de charpentier"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="category">Catégorie</label>
                <select
                  id="category"
                  value={isNewCategory ? NEW_CATEGORY : form.category}
                  onChange={(e) => {
                    const isNew = e.target.value === NEW_CATEGORY;
                    setIsNewCategory(isNew);
                    setForm({ ...form, category: isNew ? "" : e.target.value });
                  }}
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value={NEW_CATEGORY}>+ Nouvelle catégorie</option>
                </select>
              </div>

              {isNewCategory && (
                <div className={styles.fieldGroup}>
                  <label htmlFor="newCategory">Nom de la catégorie</label>
                  <input
                    id="newCategory"
                    required
                    placeholder="ex: Outillage manuel"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
              )}

              <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
                <label>Image du produit</label>
                <label className={styles.dropzone}>
                  <UploadCloud size={20} />
                  <span>Glisser un fichier ou cliquer pour parcourir</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} />
                </label>
                {imagePreview && (
                  <div className={styles.previewContainer}>
                    <img src={imagePreview} alt="Aperçu" className={styles.imagePreview} />
                    <button type="button" className={styles.removeImgBtn} onClick={removeSelectedImage} aria-label="Supprimer l'image">
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="price">Prix unitaire (FCFA)</label>
                <input
                  id="price"
                  required
                  type="number"
                  min="0"
                  step="1"
                  placeholder="ex: 15000"
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="stock">
                  {editingId ? "Stock restant" : "Stock de départ"}
                </label>
                <input
                  id="stock"
                  required
                  type="number"
                  min="0"
                  placeholder="ex: 50"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setShowForm(false)}>
                  Annuler
                </button>
                <button type="submit" className={styles.primaryButton} disabled={isUploadingImage}>
                  {isUploadingImage ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE DÉTAIL DU PRODUIT */}
      {selectedProduct && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setSelectedProduct(null)}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="product-detail-title">
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Fiche Produit</p>
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
              <div><span>Prix unitaire</span><strong>{formatFCFA(selectedProduct.unit_price)}</strong></div>
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