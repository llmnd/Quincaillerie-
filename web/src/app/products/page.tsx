"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  Image as ImageIcon,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  UploadCloud,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import AppShell from "../../components/AppShell";
import OdooFormLayout from "../../components/OdooFormLayout";
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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "";

const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const NEW_CATEGORY = "__new_category__";

const emptyForm: ProductForm = {
  sku: "",
  name: "",
  category: "",
  unit_price: "",
  stock_quantity: "",
  image_url: "",
};

function formatFCFA(amount: number) {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const editProductId = searchParams.get("edit");
  const openedQueryProduct = useRef<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [showFilters, setShowFilters] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [isNewCategory, setIsNewCategory] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  /*
   * ============================================================
   * ADMIN
   * ============================================================
   */

  useEffect(() => {
    try {
      const storedUser =
        window.localStorage.getItem("quincaillerie_user");

      if (!storedUser) {
        setIsAdmin(false);
        return;
      }

      const parsed = JSON.parse(storedUser) as {
        role?: "admin" | "seller";
        user?: {
          role?: "admin" | "seller";
        };
      };

      setIsAdmin(
        (parsed.user?.role ?? parsed.role) === "admin"
      );
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    if (!editProductId || openedQueryProduct.current === editProductId || !products.length) return;
    const product = products.find((item) => String(item.id) === editProductId);
    if (!product) return;
    openedQueryProduct.current = editProductId;
    openEdit(product);
  }, [editProductId, products]);

  /*
   * ============================================================
   * LOAD PRODUCTS
   * ============================================================
   */

  async function loadProducts() {
    const response = await fetch(
      `${API_URL}/api/v1/products`,
      {
        headers: authHeaders(),
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(
        "Le catalogue n'est pas disponible."
      );
    }

    return response.json() as Promise<Product[]>;
  }

  async function refreshProducts() {
    try {
      const nextProducts = await loadProducts();
      setProducts(nextProducts);
      setError("");
    } catch {
      setError("Le catalogue n'est pas disponible.");
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      try {
        const nextProducts = await loadProducts();

        if (isMounted) {
          setProducts(nextProducts);
        }
      } catch {
        if (isMounted) {
          setError(
            "Le catalogue n'est pas disponible."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  /*
   * ============================================================
   * BODY LOCK WHEN MODAL / FORM IS OPEN
   * ============================================================
   */

  useEffect(() => {
    if (!selectedProduct && !showForm) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [selectedProduct, showForm]);

  /*
   * ============================================================
   * CATEGORIES
   * ============================================================
   */

  const categories = useMemo(
    () =>
      [
        ...new Set(
          products
            .map((product) =>
              product.category?.trim()
            )
            .filter(
              (category): category is string =>
                Boolean(category)
            )
        ),
      ].sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
    [products]
  );

  /*
   * ============================================================
   * FILTERED PRODUCTS
   * ============================================================
   */

  const visibleProducts = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return products.filter((product) => {
      const searchableText = `
        ${product.name}
        ${product.sku}
        ${product.category ?? ""}
      `.toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      const matchesCategory =
        !selectedCategory ||
        product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [
    products,
    search,
    selectedCategory,
  ]);

  /*
   * ============================================================
   * STATISTICS
   * ============================================================
   */

  const totalProducts = products.length;

  const lowStockCount = products.filter(
    (product) =>
      product.remaining_stock > 0 &&
      product.remaining_stock <= 10
  ).length;

  const criticalStockCount = products.filter(
    (product) =>
      product.remaining_stock <= 2
  ).length;

  const totalUnits = products.reduce(
    (sum, product) =>
      sum + product.remaining_stock,
    0
  );

  /*
   * ============================================================
   * FORM
   * ============================================================
   */

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setIsNewCategory(false);
    setImageFile(null);
    setImagePreview("");
    setError("");

    setShowForm(true);
  }

  function openEdit(product: Product) {
    setEditingId(product.id);

    setForm({
      sku: product.sku,
      name: product.name,
      category: product.category ?? "",
      unit_price: String(product.unit_price),
      stock_quantity: String(
        product.remaining_stock
      ),
      image_url: product.image_url ?? "",
    });

    setImageFile(null);
    setImagePreview(
      product.image_url ?? ""
    );

    setIsNewCategory(
      !product.category ||
        !categories.includes(product.category)
    );

    setError("");
    setShowForm(true);
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
    setIsNewCategory(false);
  }

  function submitCurrentProductForm() {
    const formElement =
      document.getElementById(
        "product-form"
      ) as HTMLFormElement | null;

    formElement?.requestSubmit();
  }

  /*
   * ============================================================
   * IMAGE
   * ============================================================
   */

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Veuillez sélectionner une image."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "L'image ne doit pas dépasser 5 Mo."
      );
      return;
    }

    setError("");
    setImageFile(file);

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(previewUrl);
  }

  function removeSelectedImage() {
    setImageFile(null);
    setImagePreview("");

    setForm((current) => ({
      ...current,
      image_url: "",
    }));
  }

  /*
   * ============================================================
   * SAVE
   * ============================================================
   */

  async function saveProduct(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      let imageUrl =
        form.image_url || null;

      /*
       * Upload Cloudinary
       */
      if (imageFile) {
        setIsUploadingImage(true);

        try {
          if (
            CLOUDINARY_CLOUD_NAME &&
            CLOUDINARY_UPLOAD_PRESET
          ) {
            const uploadData =
              new FormData();

            uploadData.append(
              "file",
              imageFile
            );

            uploadData.append(
              "upload_preset",
              CLOUDINARY_UPLOAD_PRESET
            );

            const uploadResponse =
              await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
                {
                  method: "POST",
                  body: uploadData,
                }
              );

            if (!uploadResponse.ok) {
              throw new Error(
                "Upload Cloudinary impossible."
              );
            }

            const uploadResult =
              await uploadResponse.json();

            imageUrl =
              uploadResult.secure_url;
          }
        } catch {
          setError(
            "L'image n'a pas pu être envoyée."
          );
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      const cleanedForm = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        category:
          form.category.trim() || null,
        image_url: imageUrl || null,
        description: "",
        unit_price: Number(
          form.unit_price || 0
        ),
        stock_quantity: Number(
          form.stock_quantity || 0
        ),
      };

      const response = await fetch(
        `${API_URL}/api/v1/products${
          editingId
            ? `/${editingId}`
            : ""
        }`,
        {
          method: editingId
            ? "PUT"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
            ...authHeaders(),
          },
          credentials: "include",
          body: JSON.stringify(
            cleanedForm
          ),
        }
      );

      if (!response.ok) {
        setError(
          "Échec de l'enregistrement. Vérifiez les données."
        );
        return;
      }

      await refreshProducts();

      closeForm();
    } catch {
      setError(
        "Une erreur est survenue lors de l'enregistrement."
      );
    } finally {
      setIsSaving(false);
    }
  }

  /*
   * ============================================================
   * ARCHIVE
   * ============================================================
   */

  async function archiveProduct(
    product: Product
  ) {
    const confirmed = window.confirm(
      `Archiver « ${product.name} » ?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/v1/products/${product.id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
          credentials: "include",
        }
      );

      if (!response.ok) {
        setError("Archivage impossible.");
        return;
      }

      await refreshProducts();

      if (
        selectedProduct?.id ===
        product.id
      ) {
        setSelectedProduct(null);
      }
    } catch {
      setError("Archivage impossible.");
    }
  }

  /*
   * ============================================================
   * STOCK STATUS
   * ============================================================
   */

  function getStockStatus(
    remaining: number
  ) {
    if (remaining <= 0) {
      return {
        label: "Rupture",
        className: styles.stockCritical,
      };
    }

    if (remaining <= 2) {
      return {
        label: "Critique",
        className: styles.stockCritical,
      };
    }

    if (remaining <= 10) {
      return {
        label: "Faible",
        className: styles.stockLow,
      };
    }

    return {
      label: "Normal",
      className: styles.stockNormal,
    };
  }

  return (
    <AppShell>
      <div className={styles.page}>
        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.titleIcon}>
              <Package
                size={19}
                strokeWidth={1.8}
              />
            </div>

            <div>
              <h1>Produits</h1>

              <p className={styles.subtitle}>
                Références, prix et niveaux de stock.
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={openCreate}
            >
              <Plus
                size={16}
                aria-hidden="true"
              />

              <span>
                Nouveau produit
              </span>
            </button>
          )}
        </header>

        {/* =====================================================
            QUICK STATS
        ===================================================== */}

        <section className={styles.stats}>
          <div className={styles.statCard}>
            <span>Références</span>
            <strong>{totalProducts}</strong>
          </div>

          <div className={styles.statCard}>
            <span>Unités en stock</span>
            <strong>
              {totalUnits.toLocaleString(
                "fr-FR"
              )}
            </strong>
          </div>

          <div className={styles.statCard}>
            <span>Stock faible</span>
            <strong
              className={
                lowStockCount > 0
                  ? styles.statWarning
                  : ""
              }
            >
              {lowStockCount}
            </strong>
          </div>

          <div className={styles.statCard}>
            <span>Ruptures / critiques</span>
            <strong
              className={
                criticalStockCount > 0
                  ? styles.statDanger
                  : ""
              }
            >
              {criticalStockCount}
            </strong>
          </div>
        </section>

        {/* =====================================================
            FORMULAIRE
        ===================================================== */}

        {showForm && (
          <div className={styles.formOverlay}>
            <OdooFormLayout
              category="Produits"
              title={
                editingId
                  ? "Modifier le produit"
                  : "Nouveau produit"
              }
              subtitle={
                editingId
                  ? "Mettre à jour les informations de cette référence."
                  : "Créer une nouvelle référence dans le catalogue."
              }
              actions={[
                {
                  label: isSaving
                    ? "Enregistrement..."
                    : "Enregistrer",
                  variant: "primary",
                  onClick:
                    submitCurrentProductForm,
                },
              ]}
              onNew={openCreate}
              onSettingsClick={() =>
                undefined
              }
              onCloudClick={
                submitCurrentProductForm
              }
              onClose={closeForm}
              showNewButton={false}
            >
              <form
                id="product-form"
                onSubmit={saveProduct}
              >
                <div
                  className={styles.formSection}
                >
                  <div
                    className={
                      styles.sectionTitle
                    }
                  >
                    <div>
                      <h2>
                        Informations générales
                      </h2>

                      <p>
                        Identité et classement du produit.
                      </p>
                    </div>
                  </div>

                  <div
                    className={
                      styles.formGrid
                    }
                  >
                    <div
                      className={
                        styles.fieldGroup
                      }
                    >
                      <label htmlFor="sku">
                        Référence (SKU)
                        <span>*</span>
                      </label>

                      <input
                        id="sku"
                        required
                        placeholder="REF-8802"
                        value={form.sku}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            sku: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div
                      className={
                        styles.fieldGroup
                      }
                    >
                      <label htmlFor="name">
                        Nom du produit
                        <span>*</span>
                      </label>

                      <input
                        id="name"
                        required
                        placeholder="Marteau de charpentier"
                        value={form.name}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div
                      className={
                        styles.fieldGroup
                      }
                    >
                      <label htmlFor="category">
                        Catégorie
                      </label>

                      <div
                        className={
                          styles.selectWrapper
                        }
                      >
                        <select
                          id="category"
                          value={
                            isNewCategory
                              ? NEW_CATEGORY
                              : form.category
                          }
                          onChange={(e) => {
                            const isNew =
                              e.target.value ===
                              NEW_CATEGORY;

                            setIsNewCategory(
                              isNew
                            );

                            setForm({
                              ...form,
                              category: isNew
                                ? ""
                                : e.target.value,
                            });
                          }}
                        >
                          <option value="">
                            Aucune catégorie
                          </option>

                          {categories.map(
                            (category) => (
                              <option
                                key={category}
                                value={category}
                              >
                                {category}
                              </option>
                            )
                          )}

                          <option
                            value={
                              NEW_CATEGORY
                            }
                          >
                            + Nouvelle catégorie
                          </option>
                        </select>

                        <ChevronDown
                          size={15}
                          aria-hidden="true"
                        />
                      </div>
                    </div>

                    {isNewCategory && (
                      <div
                        className={
                          styles.fieldGroup
                        }
                      >
                        <label htmlFor="newCategory">
                          Nom de la catégorie
                          <span>*</span>
                        </label>

                        <input
                          id="newCategory"
                          required
                          placeholder="Outillage manuel"
                          value={
                            form.category
                          }
                          onChange={(e) =>
                            setForm({
                              ...form,
                              category:
                                e.target.value,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={styles.formSection}
                >
                  <div
                    className={
                      styles.sectionTitle
                    }
                  >
                    <div>
                      <h2>
                        Prix & stock
                      </h2>

                      <p>
                        Informations utilisées pour le suivi de l'inventaire.
                      </p>
                    </div>
                  </div>

                  <div
                    className={
                      styles.formGrid
                    }
                  >
                    <div
                      className={
                        styles.fieldGroup
                      }
                    >
                      <label htmlFor="price">
                        Prix unitaire
                        <span>*</span>
                      </label>

                      <div
                        className={
                          styles.inputWithSuffix
                        }
                      >
                        <input
                          id="price"
                          required
                          type="number"
                          min="0"
                          step="1"
                          placeholder="15000"
                          value={
                            form.unit_price
                          }
                          onChange={(e) =>
                            setForm({
                              ...form,
                              unit_price:
                                e.target.value,
                            })
                          }
                        />

                        <span>
                          FCFA
                        </span>
                      </div>
                    </div>

                    <div
                      className={
                        styles.fieldGroup
                      }
                    >
                      <label htmlFor="stock">
                        {editingId
                          ? "Stock restant"
                          : "Stock de départ"}

                        <span>*</span>
                      </label>

                      <input
                        id="stock"
                        required
                        type="number"
                        min="0"
                        step="1"
                        placeholder="50"
                        value={
                          form.stock_quantity
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            stock_quantity:
                              e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div
                  className={styles.formSection}
                >
                  <div
                    className={
                      styles.sectionTitle
                    }
                  >
                    <div>
                      <h2>
                        Image
                      </h2>

                      <p>
                        Ajoutez une image pour identifier rapidement le produit.
                      </p>
                    </div>
                  </div>

                  <div
                    className={
                      styles.imageField
                    }
                  >
                    <label
                      className={
                        styles.dropzone
                      }
                    >
                      <UploadCloud
                        size={21}
                        strokeWidth={1.7}
                      />

                      <strong>
                        Ajouter une image
                      </strong>

                      <span>
                        PNG, JPG ou WEBP · 5 Mo maximum
                      </span>

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={
                          handleImageChange
                        }
                      />
                    </label>

                    {imagePreview && (
                      <div
                        className={
                          styles.previewContainer
                        }
                      >
                        <img
                          src={imagePreview}
                          alt="Aperçu du produit"
                          className={
                            styles.imagePreview
                          }
                        />

                        <button
                          type="button"
                          className={
                            styles.removeImgBtn
                          }
                          onClick={
                            removeSelectedImage
                          }
                          aria-label="Supprimer l'image"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div
                    className={
                      styles.formError
                    }
                  >
                    {error}
                  </div>
                )}

                <div
                  className={
                    styles.formActions
                  }
                >
                  <button
                    type="button"
                    className={
                      styles.cancelButton
                    }
                    onClick={closeForm}
                    disabled={isSaving}
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className={
                      styles.submitButton
                    }
                    disabled={
                      isSaving ||
                      isUploadingImage
                    }
                  >
                    {isUploadingImage
                      ? "Envoi de l'image..."
                      : isSaving
                      ? "Enregistrement..."
                      : editingId
                      ? "Enregistrer les modifications"
                      : "Créer le produit"}
                  </button>
                </div>
              </form>
            </OdooFormLayout>
          </div>
        )}

        {/* =====================================================
            TOOLBAR
        ===================================================== */}

        <section className={styles.toolbar}>
          <div
            className={
              styles.searchWrapper
            }
          >
            <Search
              size={16}
              aria-hidden="true"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              aria-label="Rechercher un produit"
              placeholder="Rechercher une référence, un produit ou une catégorie..."
            />

            {search && (
              <button
                type="button"
                className={
                  styles.clearSearch
                }
                onClick={() =>
                  setSearch("")
                }
                aria-label="Effacer la recherche"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            className={
              `${styles.filterToggle} ${
                selectedCategory
                  ? styles.filterActive
                  : ""
              }`
            }
            onClick={() =>
              setShowFilters(
                (current) => !current
              )
            }
          >
            <SlidersHorizontal
              size={15}
            />

            <span>Filtrer</span>

            {selectedCategory && (
              <span
                className={
                  styles.filterDot
                }
              />
            )}
          </button>

          <div
            className={
              styles.categoryFilter
            }
          >
            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(
                  e.target.value
                )
              }
              aria-label="Filtrer par catégorie"
            >
              <option value="">
                Toutes les catégories
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}
            </select>

            <ChevronDown size={14} />
          </div>

          <span
            className={
              styles.counterBadge
            }
          >
            {visibleProducts.length}
            {" "}
            référence
            {visibleProducts.length !== 1
              ? "s"
              : ""}
          </span>
        </section>

        {showFilters && (
          <div
            className={
              styles.mobileFilterPanel
            }
          >
            <label>
              Catégorie

              <select
                value={selectedCategory}
                onChange={(e) =>
                  setSelectedCategory(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Toutes les catégories
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>
        )}

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && !showForm && (
          <div
            className={
              styles.catalogError
            }
          >
            {error}

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              Fermer
            </button>
          </div>
        )}

        {/* =====================================================
            LOADING
        ===================================================== */}

        {isLoading && (
          <div
            className={styles.state}
          >
            <div
              className={
                styles.loadingLine
              }
            />

            <span>
              Chargement du catalogue...
            </span>
          </div>
        )}

        {/* =====================================================
            EMPTY
        ===================================================== */}

        {!isLoading &&
          !error &&
          products.length === 0 && (
            <div
              className={
                styles.emptyState
              }
            >
              <div
                className={
                  styles.emptyIcon
                }
              >
                <Package size={23} />
              </div>

              <strong>
                Aucun produit
              </strong>

              <span>
                Le catalogue ne contient encore aucune référence.
              </span>

              {isAdmin && (
                <button
                  type="button"
                  className={
                    styles.emptyButton
                  }
                  onClick={openCreate}
                >
                  <Plus size={15} />
                  Ajouter un produit
                </button>
              )}
            </div>
          )}

        {/* =====================================================
            TABLE
        ===================================================== */}

        {!isLoading &&
          visibleProducts.length > 0 && (
            <section
              className={styles.tableSection}
            >
              <div
                className={
                  styles.tableScroll
                }
              >
                <div
                  className={
                    styles.table
                  }
                >
                  <div
                    className={
                      styles.tableHead
                    }
                  >
                    <span>
                      Produit
                    </span>

                    <span>
                      Prix
                    </span>

                    <span>
                      Départ
                    </span>

                    <span>
                      Vendus
                    </span>

                    <span>
                      Stock
                    </span>

                    <span>
                      Statut
                    </span>

                    <span>
                      Actions
                    </span>
                  </div>

                  {visibleProducts.map(
                    (product) => {
                      const stock =
                        getStockStatus(
                          product.remaining_stock
                        );

                      return (
                        <div
                          className={
                            styles.row
                          }
                          key={
                            product.id
                          }
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            setSelectedProduct(
                              product
                            )
                          }
                          onKeyDown={(
                            event
                          ) => {
                            if (
                              event.key ===
                                "Enter" ||
                              event.key ===
                                " "
                            ) {
                              event.preventDefault();

                              setSelectedProduct(
                                product
                              );
                            }
                          }}
                        >
                          <div
                            className={
                              styles.productMeta
                            }
                          >
                            {product.image_url ? (
                              <img
                                src={
                                  product.image_url
                                }
                                alt=""
                                className={
                                  styles.productThumb
                                }
                              />
                            ) : (
                              <div
                                className={
                                  `${styles.productThumb} ${styles.productThumbPlaceholder}`
                                }
                              >
                                <ImageIcon
                                  size={17}
                                />
                              </div>
                            )}

                            <div
                              className={
                                styles.productInfo
                              }
                            >
                              <strong>
                                {
                                  product.name
                                }
                              </strong>

                              <div
                                className={
                                  styles.productMetaLine
                                }
                              >
                                <span>
                                  {
                                    product.sku
                                  }
                                </span>

                                <span>
                                  •
                                </span>

                                <span>
                                  {
                                    product.category ??
                                    "Sans catégorie"
                                  }
                                </span>
                              </div>
                            </div>
                          </div>

                          <span
                            className={
                              styles.price
                            }
                          >
                            {formatFCFA(
                              product.unit_price
                            )}
                          </span>

                          <span
                            className={
                              styles.numberCell
                            }
                          >
                            {
                              product.initial_stock_quantity
                            }
                          </span>

                          <span
                            className={
                              styles.sold
                            }
                          >
                            {
                              product.sold_quantity
                            }
                          </span>

                          <strong
                            className={
                              `${styles.remaining} ${stock.className}`
                            }
                          >
                            {
                              product.remaining_stock
                            }
                          </strong>

                          <span
                            className={
                              `${styles.stockBadge} ${stock.className}`
                            }
                          >
                            <span />

                            {stock.label}
                          </span>

                          <div
                            className={
                              styles.actions
                            }
                          >
                            {isAdmin ? (
                              <>
                                <button
                                  type="button"
                                  className={
                                    styles.actionBtn
                                  }
                                  onClick={(
                                    event
                                  ) => {
                                    event.stopPropagation();

                                    openEdit(
                                      product
                                    );
                                  }}
                                >
                                  Modifier
                                </button>

                                <button
                                  type="button"
                                  className={
                                    `${styles.actionBtn} ${styles.actionBtnDanger}`
                                  }
                                  onClick={(
                                    event
                                  ) => {
                                    event.stopPropagation();

                                    void archiveProduct(
                                      product
                                    );
                                  }}
                                >
                                  Archiver
                                </button>
                              </>
                            ) : (
                              <span
                                className={
                                  styles.readOnly
                                }
                              >
                                Lecture seule
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </section>
          )}

        {!isLoading &&
          products.length > 0 &&
          visibleProducts.length === 0 && (
            <div
              className={
                styles.emptySearch
              }
            >
              <Search size={20} />

              <strong>
                Aucun résultat
              </strong>

              <span>
                Aucun produit ne correspond à votre recherche.
              </span>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory(
                    ""
                  );
                }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}

        {/* =====================================================
            PRODUCT DETAIL
        ===================================================== */}

        {selectedProduct && (
          <div
            className={
              styles.modalBackdrop
            }
            role="presentation"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setSelectedProduct(
                  null
                );
              }
            }}
          >
            <section
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-detail-title"
            >
              <div
                className={
                  styles.modalHeader
                }
              >
                <div>
                  <p
                    className={
                      styles.eyebrow
                    }
                  >
                    Fiche produit
                  </p>

                  <h2 id="product-detail-title">
                    {
                      selectedProduct.name
                    }
                  </h2>

                  <span
                    className={
                      styles.modalSku
                    }
                  >
                    {
                      selectedProduct.sku
                    }
                  </span>
                </div>

                <button
                  type="button"
                  className={
                    styles.closeButton
                  }
                  onClick={() =>
                    setSelectedProduct(
                      null
                    )
                  }
                  aria-label="Fermer"
                >
                  <X size={17} />
                </button>
              </div>

              {selectedProduct.image_url ? (
                <img
                  src={
                    selectedProduct.image_url
                  }
                  alt={
                    selectedProduct.name
                  }
                  className={
                    styles.detailImage
                  }
                />
              ) : (
                <div
                  className={
                    styles.detailImagePlaceholder
                  }
                >
                  <ImageIcon
                    size={28}
                  />
                </div>
              )}

              <div
                className={
                  styles.detailGrid
                }
              >
                <div>
                  <span>
                    Catégorie
                  </span>

                  <strong>
                    {
                      selectedProduct.category ??
                      "—"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Prix unitaire
                  </span>

                  <strong>
                    {formatFCFA(
                      selectedProduct.unit_price
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Stock de départ
                  </span>

                  <strong>
                    {
                      selectedProduct.initial_stock_quantity
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Vendus
                  </span>

                  <strong>
                    {
                      selectedProduct.sold_quantity
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Stock restant
                  </span>

                  <strong
                    className={
                      getStockStatus(
                        selectedProduct.remaining_stock
                      ).className
                    }
                  >
                    {
                      selectedProduct.remaining_stock
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Statut
                  </span>

                  <strong>
                    {selectedProduct.is_active
                      ? "Actif"
                      : "Archivé"}
                  </strong>
                </div>
              </div>

              {isAdmin && (
                <div
                  className={
                    styles.detailActions
                  }
                >
                  <button
                    type="button"
                    className={
                      styles.cancelButton
                    }
                    onClick={() => {
                      setSelectedProduct(
                        null
                      );

                      openEdit(
                        selectedProduct
                      );
                    }}
                  >
                    Modifier
                  </button>

                  <button
                    type="button"
                    className={
                      `${styles.cancelButton} ${styles.detailDanger}`
                    }
                    onClick={() => {
                      void archiveProduct(
                        selectedProduct
                      );
                    }}
                  >
                    Archiver
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}