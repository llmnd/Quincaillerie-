"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe,
  ImageIcon,
  LayoutGrid,
  Loader2,
  Mail,
  MapPin,
  Menu,
  Palette,
  Phone,
  Save,
  Trash2,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import AppShell from "../../components/AppShell";
import { authHeaders } from "../../lib/auth";
import styles from "./page.module.css";
import previewStyles from "./_shared/preview.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const MAX_VISIBLE_SECTIONS = 6;

/* ---------- Types ---------- */
type WebsiteRecord = {
  id: number;
  organization_id: number;
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  favicon?: string | null;
  template?: string | null;
  published: boolean;
  theme?: Record<string, unknown>;
  settings?: Record<string, unknown>;
};

type OrganizationProfile = {
  name?: string | null;
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type Theme = {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  font: string;
  radius: string;
  buttonStyle: string;
  cardStyle: string;
  headerStyle: string;
  footerStyle: string;
  /* Couleurs granulaires */
  headerText?: string;
  categoryText?: string;
  priceText?: string;
};

type PageItem = {
  id?: number;
  name: string;
  slug: string;
  position?: number;
  published?: boolean;
};

type Section = {
  id?: number;
  type: string;
  position: number;
  visible: boolean;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
};

type Product = {
  id: number;
  name: string;
  image_url?: string | null;
  description?: string | null;
  unit_price?: number | string | null;
  category?: string | null;
};

type SectionKey = "identity" | "template" | "theme" | null;

const defaultTheme: Theme = {
  primary: "#111827",
  secondary: "#714B67",
  background: "#FFFFFF",
  text: "#111827",
  font: "Inter, sans-serif",
  radius: "medium",
  buttonStyle: "rounded",
  cardStyle: "soft",
  headerStyle: "minimal",
  footerStyle: "simple",
};

const templates = [
  { key: "commerce",      label: "Commerce",     description: "Boutique en ligne, panier et fiches produits.",  accent: "#14b8a6" },
  { key: "quincaillerie", label: "Quincaillerie", description: "Matériel, outillage et références techniques.", accent: "#f59e0b" },
  { key: "services",      label: "Entreprise",    description: "Site corporate, services et contact.",          accent: "#8b5cf6" },
];

const presets = [
  { key: "teal",    label: "Teal",    primary: "#0f172a", secondary: "#14b8a6", background: "#ffffff", text: "#0f172a" },
  { key: "violet",  label: "Violet",  primary: "#1e1b4b", secondary: "#8b5cf6", background: "#faf5ff", text: "#1e1b4b" },
  { key: "sunset",  label: "Sunset",  primary: "#7c2d12", secondary: "#ea580c", background: "#fffbeb", text: "#7c2d12" },
  { key: "forest",  label: "Forest",  primary: "#14532d", secondary: "#16a34a", background: "#f0fdf4", text: "#14532d" },
  { key: "ocean",   label: "Ocean",   primary: "#0c4a6e", secondary: "#0ea5e9", background: "#f0f9ff", text: "#0c4a6e" },
  { key: "midnight",label: "Midnight",primary: "#f8fafc", secondary: "#14b8a6", background: "#0f172a", text: "#f8fafc" },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/* ============================================================
   Helpers tailles / graisses
   ============================================================ */
const SIZE_OPTIONS = [
  { key: "sm",  label: "S",   css: "0.875rem" },
  { key: "md",  label: "M",   css: "1rem" },
  { key: "lg",  label: "L",   css: "1.25rem" },
  { key: "xl",  label: "XL",  css: "1.75rem" },
  { key: "2xl", label: "2XL", css: "2.5rem" },
] as const;

const WEIGHT_OPTIONS = [
  { key: "light",    css: 300 },
  { key: "normal",   css: 400 },
  { key: "medium",   css: 500 },
  { key: "semibold", css: 600 },
  { key: "bold",     css: 700 },
] as const;

function sizeToCss(key: string | undefined, fallback: string | number = ""): string | number {
  const found = SIZE_OPTIONS.find((s) => s.key === key);
  return found?.css ?? fallback;
}
function weightToCss(key: string | undefined, fallback: string | number = ""): string | number {
  const found = WEIGHT_OPTIONS.find((w) => w.key === key);
  return found?.css ?? fallback;
}

/* ============================================================
   Section — accordéon plat
   ============================================================ */
function Section({
  id,
  title,
  icon,
  meta,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  meta?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.section} data-id={id}>
      <button
        type="button"
        className={styles.sectionTrigger}
        onClick={onToggle}
        data-open={open || undefined}
        aria-expanded={open}
      >
        <span className={styles.sectionChevron} data-open={open || undefined}>
          <ChevronRight size={14} />
        </span>
        <span className={styles.sectionIcon}>{icon}</span>
        <span className={styles.sectionLabel}>{title}</span>
        {meta && <span className={styles.sectionMeta}>{meta}</span>}
      </button>
      <div className={styles.sectionBody} data-open={open || undefined}>
        <div className={styles.sectionBodyInner}>
          <div className={styles.sectionContent}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ColorInput
   ============================================================ */
function ColorInput({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (next: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<number | null>(null);
  const lastSentRef = useRef(value);

  useEffect(() => {
    if (value !== lastSentRef.current) {
      setLocal(value);
      lastSentRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function schedule(next: string) {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      lastSentRef.current = next;
      onCommit(next);
    }, 180);
  }

  return (
    <div className={styles.colorField}>
      <span className={styles.colorFieldLabel}>{label}</span>
      <div className={styles.colorRow}>
        <input
          type="color"
          value={local}
          onChange={(event) => {
            const next = event.target.value;
            setLocal(next);
            schedule(next);
          }}
          className={styles.colorSwatch}
          aria-label={label}
        />
        <input
          type="text"
          value={local}
          onChange={(event) => {
            const next = event.target.value;
            setLocal(next);
            if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(next)) schedule(next);
          }}
          className={styles.colorHex}
          spellCheck={false}
          maxLength={7}
        />
      </div>
    </div>
  );
}

/* ============================================================
   FilePicker
   ============================================================ */
function FilePicker({
  label,
  value,
  onUploaded,
  onClear,
  accept = "image/*",
  hint,
}: {
  label: string;
  value: string;
  onUploaded: (url: string) => void;
  onClear?: () => void;
  accept?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const response = await fetch(`${API_URL}/api/v1/websites/current/media/upload`, {
        method: "POST",
        credentials: "include",
        headers: { ...authHeaders() },
        body: fd,
      });

      if (!response.ok) {
        throw new Error("Échec de l'upload");
      }

      const data = (await response.json()) as
        | { url?: string; data?: { url?: string }; file_url?: string }
        | string;

      let url = "";
      if (typeof data === "string") url = data;
      else url = data.url ?? data.data?.url ?? data.file_url ?? "";

      if (!url) throw new Error("URL manquante dans la réponse");
      onUploaded(url);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erreur d'upload");
    } finally {
      setUploading(false);
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
    event.target.value = "";
  }

  return (
    <div className={styles.fileField}>
      <span className={styles.fieldLabel}>{label}</span>

      <div className={styles.filePickerRow}>
        <div className={styles.filePreview}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} />
          ) : (
            <ImageIcon size={18} />
          )}
        </div>

        <div className={styles.fileActions}>
          <button
            type="button"
            className={styles.filePickBtn}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 size={13} className={styles.spin} />
            ) : (
              <Upload size={13} />
            )}
            {uploading ? "Upload…" : value ? "Remplacer" : "Choisir"}
          </button>

          {value && onClear && (
            <button
              type="button"
              className={styles.fileClearBtn}
              onClick={onClear}
              disabled={uploading}
              title="Supprimer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </div>

      {error && <span className={styles.fileError}>{error}</span>}
      {hint && !error && <span className={styles.fieldHint}>{hint}</span>}
    </div>
  );
}

/* ============================================================
   Page
   ============================================================ */
export default function WebsiteConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [website, setWebsite] = useState<WebsiteRecord | null>(null);
  const [organization, setOrganization] = useState<OrganizationProfile | null>(null);
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [toast, setToast] = useState<{ kind: "success" | "error" | "info"; message: string } | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [openSection, setOpenSection] = useState<SectionKey>("identity");
  const [mobileOpen, setMobileOpen] = useState(false);

  const [pages, setPages] = useState<PageItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    template: "commerce",
    logo: "",
    favicon: "",
  });
  const [initialForm, setInitialForm] = useState(form);

  const previewUrl = useMemo(() => {
    if (!form.slug) return "";
    const host = process.env.NEXT_PUBLIC_PUBLIC_HOST ?? "localhost:3000";
    return `https://${form.slug}.${host}`;
  }, [form.slug]);

  const isDirty = useMemo(() => {
    if (!website) return form.name.trim().length > 0;
    return (
      form.name !== initialForm.name ||
      form.slug !== initialForm.slug ||
      form.description !== initialForm.description ||
      form.template !== initialForm.template ||
      form.logo !== initialForm.logo ||
      form.favicon !== initialForm.favicon ||
      JSON.stringify(theme) !== JSON.stringify({ ...defaultTheme, ...(website.theme ?? {}) })
    );
  }, [form, initialForm, theme, website]);

  function showToast(kind: "success" | "error" | "info", message: string) {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  async function apiGet<T>(path: string): Promise<T | null> {
    try {
      const response = await fetch(`${API_URL}${path}`, {
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
        cache: "no-store",
      });
      if (!response.ok) return null;
      return (await response.json()) as T;
    } catch (error) {
      console.error(`Fetch failed: ${path}`, error);
      return null;
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const [org, websiteData, pagesData, productsData] = await Promise.all([
          apiGet<OrganizationProfile>("/api/v1/organization/profile"),
          apiGet<WebsiteRecord>("/api/v1/websites/current"),
          apiGet<PageItem[]>("/api/v1/websites/current/pages"),
          apiGet<Product[]>("/api/v1/products"),
        ]);

        if (org) setOrganization(org);
        if (productsData) {
          setProducts(productsData.filter((p) => p && typeof p.name === "string"));
        }

        if (websiteData) {
          setWebsite(websiteData);
          const nextForm = {
            name: websiteData.name ?? org?.name ?? "",
            slug: websiteData.slug ?? slugify(org?.name ?? ""),
            description: websiteData.description ?? "",
            template: websiteData.template ?? "commerce",
            logo: websiteData.logo ?? org?.logo ?? "",
            favicon: websiteData.favicon ?? "",
          };
          setForm(nextForm);
          setInitialForm(nextForm);
          setSlugTouched(true);
          setTheme({ ...defaultTheme, ...(websiteData.theme ?? {}) } as Theme);
        } else {
          const empty = {
            name: org?.name ?? "",
            slug: slugify(org?.name ?? ""),
            description: "",
            template: "commerce",
            logo: org?.logo ?? "",
            favicon: "",
          };
          setForm(empty);
          setInitialForm(empty);
          setSlugTouched(Boolean(empty.slug));
          setTheme(defaultTheme);
        }

        if (pagesData && pagesData.length > 0) {
          setPages(pagesData);
          const first = [...pagesData].sort(
            (a, b) => (a.position ?? 0) - (b.position ?? 0),
          )[0];
          if (first?.id) {
            const secs = await apiGet<Section[]>(
              `/api/v1/websites/pages/${first.id}/sections`,
            );
            if (secs) setSections(secs.filter((s) => s.visible !== false));
          }
        }
      } catch (error) {
        console.error(error);
        showToast("error", "Impossible de charger la configuration");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleNameChange(value: string) {
    setForm((current) => {
      const next = { ...current, name: value };
      if (!slugTouched) next.slug = slugify(value);
      return next;
    });
  }

  function applyOrganization() {
    if (!organization) return;
    setForm((current) => ({
      ...current,
      name: organization.name ?? current.name,
      slug: slugify(organization.name ?? current.slug),
      logo: organization.logo ?? current.logo,
    }));
    setSlugTouched(true);
    showToast("info", "Infos entreprise appliquées");
  }

  function applyPreset(preset: (typeof presets)[number]) {
    setTheme((current) => ({
      ...current,
      primary: preset.primary,
      secondary: preset.secondary,
      background: preset.background,
      text: preset.text,
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast("error", "Le nom du site est obligatoire");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description,
        template: form.template,
        logo: form.logo || null,
        favicon: form.favicon || null,
        theme,
      };
      const method = website ? "PATCH" : "POST";
      const target = website ? `${API_URL}/api/v1/websites/current` : `${API_URL}/api/v1/websites`;
      const response = await fetch(target, {
        method,
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(
          (errorPayload as { detail?: string }).detail ?? "La sauvegarde a échoué",
        );
      }
      const data = (await response.json()) as WebsiteRecord;
      const next = {
        name: data.name ?? "",
        slug: data.slug ?? "",
        description: data.description ?? "",
        template: data.template ?? "commerce",
        logo: data.logo ?? "",
        favicon: data.favicon ?? "",
      };
      setWebsite(data);
      setForm(next);
      setInitialForm(next);
      setTheme({ ...defaultTheme, ...(data.theme ?? {}) } as Theme);
      showToast("success", website ? "Configuration enregistrée" : "Site créé avec succès");
      router.refresh();
    } catch (error) {
      console.error(error);
      showToast("error", error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished() {
    if (!website) return;
    setPublishing(true);
    try {
      const target = `${API_URL}/api/v1/websites/current/${website.published ? "unpublish" : "publish"}`;
      const response = await fetch(target, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      if (!response.ok) throw new Error("Échec du changement de statut");
      const updated = (await response.json()) as WebsiteRecord;
      setWebsite(updated);
      showToast("success", updated.published ? "Site publié" : "Site dépublié");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Erreur");
    } finally {
      setPublishing(false);
    }
  }

  async function deleteWebsite() {
    if (!website) return;
    if (!confirm("Supprimer définitivement ce site et tout son contenu ?")) return;
    setDeleting(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/websites/current`, {
        method: "DELETE",
        credentials: "include",
        headers: { ...authHeaders() },
      });
      if (!response.ok) throw new Error("Échec de la suppression");
      showToast("success", "Site supprimé");
      setWebsite(null);
      const empty = {
        name: organization?.name ?? "",
        slug: slugify(organization?.name ?? ""),
        description: "",
        template: "commerce",
        logo: organization?.logo ?? "",
        favicon: "",
      };
      setForm(empty);
      setInitialForm(empty);
      setTheme(defaultTheme);
      setPages([]);
      setSections([]);
      router.refresh();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Erreur");
    } finally {
      setDeleting(false);
    }
  }

  function copyUrl() {
    if (!previewUrl) return;
    void navigator.clipboard.writeText(previewUrl).then(() => {
      showToast("success", "URL copiée");
    });
  }

  function resetForm() {
    setForm(initialForm);
    setTheme({ ...defaultTheme, ...(website?.theme ?? {}) } as Theme);
    setSlugTouched(Boolean(initialForm.slug));
    showToast("info", "Modifications annulées");
  }

  /* ============================================================ */
  /* Rendu d'une section — miroir de l'éditeur                     */
  /* ============================================================ */
  function renderSection(section: Section, index: number) {
    const c = section.content ?? {};
    const key = section.id ?? `${section.type}-${index}`;

    if (section.type === "hero") {
      const imageUrl = String(c.image ?? "");
      return (
        <section key={key} className={previewStyles.previewSiteBlock}>
          <div className={previewStyles.heroPreviewContent}>
            <div>
              <p className={previewStyles.previewEyebrow}>{form.name || orgName}</p>
              <h3
                style={{
                  fontSize: sizeToCss(String(c.titleSize ?? ""), ""),
                  fontWeight: weightToCss(String(c.titleWeight ?? ""), "") as React.CSSProperties["fontWeight"],
                }}
              >
                {String(c.title ?? "Bienvenue")}
              </h3>
              <p
                style={{
                  fontSize: sizeToCss(String(c.textSize ?? ""), ""),
                  fontWeight: weightToCss(String(c.textWeight ?? ""), "") as React.CSSProperties["fontWeight"],
                }}
              >
                {String(c.subtitle ?? "Votre site public")}
              </p>
              <a
                href={String(c.buttonLink ?? "#contact")}
                className={previewStyles.editableButton}
                onClick={(e) => e.preventDefault()}
              >
                {String(c.buttonText ?? "Découvrir")}
              </a>
            </div>

            {imageUrl ? (
              <div className={previewStyles.previewHeroImage}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={String(c.title ?? "")} />
              </div>
            ) : (
              <div className={previewStyles.heroPreviewVisual}>Image</div>
            )}
          </div>
        </section>
      );
    }

    if (section.type === "banner") {
      const imageUrl = String(c.image ?? "");
      return (
        <section key={key} className={previewStyles.previewSiteBlock}>
          {imageUrl ? (
            <div className={previewStyles.previewBannerImage}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={String(c.title ?? "")} />
            </div>
          ) : null}
          <h3
            style={{
              fontSize: sizeToCss(String(c.titleSize ?? ""), ""),
              fontWeight: weightToCss(String(c.titleWeight ?? ""), "") as React.CSSProperties["fontWeight"],
            }}
          >
            {String(c.title ?? "Bannière")}
          </h3>
          <p
            style={{
              fontSize: sizeToCss(String(c.textSize ?? ""), ""),
              fontWeight: weightToCss(String(c.textWeight ?? ""), "") as React.CSSProperties["fontWeight"],
            }}
          >
            {String(c.subtitle ?? "Une bannière personnalisée")}
          </p>
        </section>
      );
    }

    if (section.type === "products") {
      const list = products.slice(0, 3);
      const fallback: Product[] = [
        { id: -1, name: "Produit 1" },
        { id: -2, name: "Produit 2" },
        { id: -3, name: "Produit 3" },
      ];
      const items = list.length > 0 ? list : fallback;
      return (
        <section key={key} className={previewStyles.previewSiteBlock}>
          <h3
            style={{
              fontSize: sizeToCss(String(c.titleSize ?? ""), ""),
              fontWeight: weightToCss(String(c.titleWeight ?? ""), "") as React.CSSProperties["fontWeight"],
            }}
          >
            {String(c.title ?? "Nos produits")}
          </h3>
          <div className={previewStyles.productGrid}>
            {items.map((product, i) => (
              <article key={product.id || i} className={previewStyles.productCard}>
                <div className={previewStyles.productImage}>
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    `Produit ${i + 1}`
                  )}
                </div>
                <div className={previewStyles.productMeta}>
                  <span>{product.category ?? "Catégorie"}</span>
                  <strong>{product.name}</strong>
                  <em>{Number(product.unit_price ?? 0).toFixed(2)} FCFA</em>
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    }

    if (section.type === "gallery") {
      const list = products.slice(0, 4);
      const fallback: Product[] = [
        { id: -1, name: "Image 1" },
        { id: -2, name: "Image 2" },
        { id: -3, name: "Image 3" },
        { id: -4, name: "Image 4" },
      ];
      const items = list.length > 0 ? list : fallback;
      return (
        <section key={key} className={previewStyles.previewSiteBlock}>
          <h3
            style={{
              fontSize: sizeToCss(String(c.titleSize ?? ""), ""),
              fontWeight: weightToCss(String(c.titleWeight ?? ""), "") as React.CSSProperties["fontWeight"],
            }}
          >
            {String(c.title ?? "Images de nos produits")}
          </h3>
          <div className={previewStyles.productGrid}>
            {items.map((product, i) => (
              <article key={product.id || i} className={previewStyles.productCard}>
                <div className={previewStyles.productImage}>
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    `Image ${i + 1}`
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    }

    const imageUrl = String(c.image ?? "");
    return (
      <section key={key} className={previewStyles.previewSiteBlock}>
        {imageUrl ? (
          <div className={previewStyles.previewSectionImage}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={String(c.title ?? "")} />
          </div>
        ) : null}
        <h3
          style={{
            fontSize: sizeToCss(String(c.titleSize ?? ""), ""),
            fontWeight: weightToCss(String(c.titleWeight ?? ""), "") as React.CSSProperties["fontWeight"],
          }}
        >
          {String(c.title ?? section.type)}
        </h3>
        <p
          style={{
            fontSize: sizeToCss(String(c.textSize ?? ""), ""),
            fontWeight: weightToCss(String(c.textWeight ?? ""), "") as React.CSSProperties["fontWeight"],
          }}
        >
          {String(c.text ?? c.subtitle ?? "Contenu par défaut. Modifiez-le dans l'éditeur.")}
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <div className={styles.shell}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <div className={styles.skeleton} style={{ height: 42 }} />
            </div>
            <div className={styles.sidebarActionsTop}>
              <div className={styles.skeleton} style={{ height: 32 }} />
              <div className={styles.skeleton} style={{ height: 32 }} />
            </div>
            <div className={styles.sidebarBody} style={{ padding: "16px 22px" }}>
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className={styles.skeleton} style={{ height: 48, marginBottom: 10 }} />
              ))}
            </div>
          </aside>
          <main className={styles.previewPanel}>
            <div className={styles.previewWrapper}>
              <div className={styles.skeletonLight} style={{ height: 42 }} />
              <div className={styles.skeletonLight} style={{ height: 480 }} />
            </div>
          </main>
        </div>
      </AppShell>
    );
  }

  const orgName = organization?.name?.trim() || form.name || "Votre entreprise";
  const visibleSections = sections.slice(0, MAX_VISIBLE_SECTIONS);

  return (
    <AppShell>
      <div className={styles.shell}>
        <button
          type="button"
          className={styles.mobileToggle}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Ouvrir la configuration"
        >
          <Menu size={20} />
        </button>

        {mobileOpen && (
          <div
            className={styles.mobileBackdrop}
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        )}

        <aside className={styles.sidebar} data-mobile-open={mobileOpen || undefined}>
          <div className={styles.sidebarHeader}>
            <div className={styles.brandRow}>
              <div className={styles.brandIcon}>
                <Globe size={16} />
              </div>
              <div className={styles.brandText}>
                <strong>Mon site web</strong>
                <span>{form.name || "Configuration"}</span>
              </div>
              {website ? (
                <span
                  className={`${styles.statusBadge} ${
                    website.published ? styles.statusPublished : styles.statusDraft
                  }`}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: website.published ? "#10b981" : "#fbbf24",
                    }}
                  />
                  {website.published ? "Publié" : "Brouillon"}
                </span>
              ) : (
                <span className={`${styles.statusBadge} ${styles.statusNone}`}>
                  Non créé
                </span>
              )}
              <button
                type="button"
                className={styles.mobileClose}
                onClick={() => setMobileOpen(false)}
                aria-label="Fermer"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className={styles.sidebarActionsTop}>
            {isDirty && (
              <div className={styles.dirtyHint}>
                <span className={styles.dirtyDot} />
                Non enregistré
              </div>
            )}

            <div className={styles.actionRowCompact}>
              <button
                type="button"
                className={styles.btnPrimaryCompact}
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? <Loader2 size={13} className={styles.spin} /> : <Save size={13} />}
                <span>{saving ? "Enregistrement…" : website ? "Enregistrer" : "Créer"}</span>
              </button>
              <button
                type="button"
                className={styles.btnGhostCompact}
                onClick={resetForm}
                disabled={!isDirty || saving}
                title="Annuler les modifications"
              >
                <X size={13} />
              </button>
              {website && (
                <button
                  type="button"
                  className={styles.btnDangerCompact}
                  onClick={() => void deleteWebsite()}
                  disabled={deleting}
                  title="Supprimer le site"
                >
                  {deleting ? <Loader2 size={13} className={styles.spin} /> : <Trash2 size={13} />}
                </button>
              )}
            </div>

            {website && (
              <div className={styles.actionRowCompact}>
                <button
                  type="button"
                  className={styles.btnGhostCompact}
                  onClick={() => void togglePublished()}
                  disabled={publishing}
                  style={{ flex: 1 }}
                >
                  {publishing ? <Loader2 size={12} className={styles.spin} /> : null}
                  <span>{website.published ? "Dépublier" : "Publier"}</span>
                </button>
                <Link
                  href="/website/editor"
                  className={styles.btnGhostCompact}
                  style={{ flex: 1, textDecoration: "none" }}
                >
                  <span>Éditeur</span>
                  <ArrowUpRight size={12} />
                </Link>
              </div>
            )}
          </div>

          <div className={styles.sidebarBody}>
            <Section
              id="identity"
              title="Identité"
              icon={<Building2 size={14} />}
              meta={form.name || undefined}
              open={openSection === "identity"}
              onToggle={() => setOpenSection((c) => (c === "identity" ? null : "identity"))}
            >
              {organization && (organization.name || organization.email || organization.phone || organization.address) && (
                <div className={styles.orgCard}>
                  <div className={styles.orgCardHeader}>
                    <span className={styles.orgCardTitle}>
                      <Building2 size={11} /> Mon entreprise
                    </span>
                    <button
                      type="button"
                      className={styles.orgCardApply}
                      onClick={applyOrganization}
                      title="Utiliser ces informations"
                    >
                      <Wand2 size={10} /> Utiliser
                    </button>
                  </div>
                  <ul className={styles.orgCardList}>
                    {organization.name && (
                      <li><Building2 size={11} /><span>{organization.name}</span></li>
                    )}
                    {organization.email && (
                      <li><Mail size={11} /><span>{organization.email}</span></li>
                    )}
                    {organization.phone && (
                      <li><Phone size={11} /><span>{organization.phone}</span></li>
                    )}
                    {organization.address && (
                      <li><MapPin size={11} /><span>{organization.address}</span></li>
                    )}
                  </ul>
                </div>
              )}

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Nom du site</span>
                <input
                  className={styles.input}
                  value={form.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder={orgName}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Adresse (slug)</span>
                <div className={styles.inputRow}>
                  <input
                    className={styles.input}
                    value={form.slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      setForm((c) => ({ ...c, slug: slugify(event.target.value) }));
                    }}
                    placeholder="mon-site"
                  />
                  {!slugTouched && form.name && (
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => setForm((c) => ({ ...c, slug: slugify(c.name) }))}
                      title="Régénérer depuis le nom"
                    >
                      <Wand2 size={13} />
                    </button>
                  )}
                </div>
                <span className={styles.fieldHint}>
                  <code>
                    {form.slug || "mon-site"}.{process.env.NEXT_PUBLIC_PUBLIC_HOST ?? "localhost:3000"}
                  </code>
                </span>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Description</span>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))}
                  placeholder="Présentez votre activité en une phrase..."
                />
              </label>

              <FilePicker
                label="Logo de l'entreprise"
                value={form.logo}
                onUploaded={(url) => setForm((c) => ({ ...c, logo: url }))}
                onClear={() => setForm((c) => ({ ...c, logo: "" }))}
                hint="PNG, JPG ou SVG — carré recommandé"
              />

              <FilePicker
                label="Favicon"
                value={form.favicon}
                onUploaded={(url) => setForm((c) => ({ ...c, favicon: url }))}
                onClear={() => setForm((c) => ({ ...c, favicon: "" }))}
                accept="image/x-icon,image/png,image/svg+xml"
                hint="ICO, PNG ou SVG — 32×32 recommandé"
              />
            </Section>

            <Section
              id="template"
              title="Template"
              icon={<LayoutGrid size={14} />}
              meta={form.template}
              open={openSection === "template"}
              onToggle={() => setOpenSection((c) => (c === "template" ? null : "template"))}
            >
              <div className={styles.templateList}>
                {templates.map((tpl) => {
                  const active = form.template === tpl.key;
                  return (
                    <button
                      key={tpl.key}
                      type="button"
                      className={`${styles.templateRow} ${active ? styles.templateRowActive : ""}`}
                      onClick={() => setForm((c) => ({ ...c, template: tpl.key }))}
                    >
                      <span className={styles.templateDot} style={{ background: tpl.accent }}>
                        {tpl.label.slice(0, 1)}
                      </span>
                      <span className={styles.templateText}>
                        <strong>{tpl.label}</strong>
                        <span>{tpl.description}</span>
                      </span>
                      {active && <Check size={14} className={styles.templateCheck} />}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section
              id="theme"
              title="Thème"
              icon={<Palette size={14} />}
              open={openSection === "theme"}
              onToggle={() => setOpenSection((c) => (c === "theme" ? null : "theme"))}
            >
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Palettes rapides</span>
                <div className={styles.presetsGrid}>
                  {presets.map((preset) => {
                    const active =
                      theme.primary === preset.primary &&
                      theme.secondary === preset.secondary &&
                      theme.background === preset.background;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        className={`${styles.presetChip} ${active ? styles.presetChipActive : ""}`}
                        onClick={() => applyPreset(preset)}
                        title={preset.label}
                      >
                        <span
                          className={styles.presetChipPreview}
                          style={{ background: preset.background, color: preset.text }}
                        >
                          <span
                            style={{
                              width: "100%",
                              height: 4,
                              borderRadius: 3,
                              background: preset.secondary,
                            }}
                          />
                        </span>
                        <span className={styles.presetChipName}>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <ColorInput
                label="Couleur principale"
                value={theme.primary}
                onCommit={(v) => setTheme((c) => ({ ...c, primary: v }))}
              />
              <ColorInput
                label="Couleur secondaire"
                value={theme.secondary}
                onCommit={(v) => setTheme((c) => ({ ...c, secondary: v }))}
              />
              <ColorInput
                label="Arrière-plan"
                value={theme.background}
                onCommit={(v) => setTheme((c) => ({ ...c, background: v }))}
              />
              <ColorInput
                label="Couleur du texte"
                value={theme.text}
                onCommit={(v) => setTheme((c) => ({ ...c, text: v }))}
              />

              {/* --- Couleurs granulaires --- */}
              <div className={styles.themeSubHeader}>Couleurs granulaires</div>

              <ColorInput
                label="Texte de l'en-tête"
                value={theme.headerText ?? theme.primary ?? "#111827"}
                onCommit={(v) => setTheme((c) => ({ ...c, headerText: v }))}
              />
              <ColorInput
                label="Catégorie produit"
                value={theme.categoryText ?? theme.primary ?? "#111827"}
                onCommit={(v) => setTheme((c) => ({ ...c, categoryText: v }))}
              />
              <ColorInput
                label="Prix produit"
                value={theme.priceText ?? theme.primary ?? "#111827"}
                onCommit={(v) => setTheme((c) => ({ ...c, priceText: v }))}
              />

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Police</span>
                <select
                  className={styles.select}
                  value={theme.font}
                  onChange={(e) => setTheme((c) => ({ ...c, font: e.target.value }))}
                >
                  <option value="Inter, sans-serif">Inter</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="system-ui, -apple-system, sans-serif">Système</option>
                  <option value="'Courier New', monospace">Courier New</option>
                </select>
              </label>

              <div className={styles.twoCols}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Rayon</span>
                  <select
                    className={styles.select}
                    value={theme.radius}
                    onChange={(e) => setTheme((c) => ({ ...c, radius: e.target.value }))}
                  >
                    <option value="none">Aucun</option>
                    <option value="small">Petit</option>
                    <option value="medium">Moyen</option>
                    <option value="large">Grand</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Boutons</span>
                  <select
                    className={styles.select}
                    value={theme.buttonStyle}
                    onChange={(e) => setTheme((c) => ({ ...c, buttonStyle: e.target.value }))}
                  >
                    <option value="square">Carré</option>
                    <option value="rounded">Arrondi</option>
                    <option value="pill">Pilule</option>
                  </select>
                </label>
              </div>

              <div className={styles.twoCols}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Cartes</span>
                  <select
                    className={styles.select}
                    value={theme.cardStyle}
                    onChange={(e) => setTheme((c) => ({ ...c, cardStyle: e.target.value }))}
                  >
                    <option value="flat">Plat</option>
                    <option value="soft">Doux</option>
                    <option value="elevated">Élevé</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>En-tête</span>
                  <select
                    className={styles.select}
                    value={theme.headerStyle}
                    onChange={(e) => setTheme((c) => ({ ...c, headerStyle: e.target.value }))}
                  >
                    <option value="minimal">Minimal</option>
                    <option value="centered">Centré</option>
                    <option value="bold">Audacieux</option>
                  </select>
                </label>
              </div>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Pied de page</span>
                <select
                  className={styles.select}
                  value={theme.footerStyle}
                  onChange={(e) => setTheme((c) => ({ ...c, footerStyle: e.target.value }))}
                >
                  <option value="simple">Simple</option>
                  <option value="columns">Colonnes</option>
                  <option value="minimal">Minimal</option>
                </select>
              </label>
            </Section>
          </div>
        </aside>

        <main className={styles.previewPanel}>
          <div className={styles.previewWrapper}>
            <div className={styles.urlBar}>
              <div className={styles.urlLeft}>
                <div className={styles.urlDots}>
                  <span />
                  <span />
                  <span />
                </div>
                <div className={styles.urlField}>
                  <Globe size={12} />
                  <span>{previewUrl || "Sous-domaine non défini"}</span>
                </div>
              </div>
              <div className={styles.urlActions}>
                <button
                  type="button"
                  className={styles.urlBtn}
                  onClick={copyUrl}
                  disabled={!previewUrl}
                  title="Copier l'URL"
                >
                  <Copy size={13} />
                </button>
                <a
                  href={previewUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.urlBtn}
                  style={{
                    opacity: previewUrl ? 1 : 0.4,
                    pointerEvents: previewUrl ? "auto" : "none",
                  }}
                  title="Ouvrir dans un nouvel onglet"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>

            <div
              className={`${previewStyles.themeRoot} ${styles.previewThemeRoot}`}
              data-radius={theme.radius}
              data-btn={theme.buttonStyle}
              data-card={theme.cardStyle}
              data-header={theme.headerStyle}
              data-footer={theme.footerStyle}
              style={{
                "--editor-bg": theme.background,
                "--editor-text": theme.text,
                "--editor-primary": theme.primary,
                "--editor-secondary": theme.secondary,
                "--editor-font": theme.font,
                ...(theme.headerText ? { "--editor-header-text": theme.headerText } : {}),
                ...(theme.categoryText ? { "--editor-category-text": theme.categoryText } : {}),
                ...(theme.priceText ? { "--editor-price-text": theme.priceText } : {}),
                fontFamily: theme.font,
              } as React.CSSProperties}
            >
              <div className={previewStyles.sitePreviewShell}>
                <header className={previewStyles.siteHeader}>
                  <div className={previewStyles.companyBrand}>
                    {form.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.logo} alt={form.name || orgName} className={previewStyles.companyLogo} />
                    ) : (
                      <div className={previewStyles.companyLogoFallback}>
                        {(form.name || orgName).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span>{form.name || orgName}</span>
                  </div>
                  <nav className={previewStyles.siteNav}>
                    <a href="#">Accueil</a>
                    <a href="#">À propos</a>
                    <a href="#">Produits</a>
                    <a href="#contact">Contact</a>
                  </nav>
                  <button type="button" className={previewStyles.siteHeaderButton}>
                    Contactez-nous
                  </button>
                </header>

                <main className={previewStyles.siteBody}>
                  <div className={previewStyles.siteMainContent}>
                    {visibleSections.length === 0 ? (
                      <div
                        className={previewStyles.previewSiteBlock}
                        style={{ textAlign: "center", opacity: 0.7 }}
                      >
                        <p>Aucune section visible. Ouvrez l'éditeur pour ajouter du contenu.</p>
                      </div>
                    ) : (
                      visibleSections.map((s, i) => renderSection(s, i))
                    )}
                  </div>
                </main>

                <footer className={previewStyles.siteFooter}>
                  <span>{form.name || orgName}</span>
                  <span>© 2026 — Tous droits réservés</span>
                </footer>
              </div>
            </div>
          </div>
        </main>

        {toast && (
          <div
            className={`${styles.toast} ${
              toast.kind === "success"
                ? styles.toastSuccess
                : toast.kind === "error"
                ? styles.toastError
                : styles.toastInfo
            }`}
          >
            {toast.kind === "success" ? (
              <Check size={16} />
            ) : toast.kind === "error" ? (
              <X size={16} />
            ) : null}
            {toast.message}
          </div>
        )}
      </div>
    </AppShell>
  );
}