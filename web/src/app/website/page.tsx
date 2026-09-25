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
  Loader2,
  Mail,
  MapPin,
  Menu,
  Phone,
  Save,
  Trash2,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import AppShell from "../../components/AppShell";
import SiteHeader from "../../components/SiteHeader";
import { authHeaders } from "../../lib/auth";
import styles from "./page.module.css";
import previewStyles from "./_shared/preview.module.css";
import SiteSections, { getDefaultSectionsForTemplate } from "./_shared/SiteSections";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ?? "";
const API_URL =
  process.env.NODE_ENV === "production"
    ? "https://quincaillerie-858p.onrender.com"
    : configuredApiUrl || "http://localhost:8000";
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
  public_url?: string;
  primary_domain?: string;
  domains?: Array<{ id: number; domain: string; type: string; verified: boolean; active: boolean }>;
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
  secondaryText?: string;
  /* Couleurs granulaires */
  headerText?: string;
  categoryText?: string;
  priceText?: string;
  headerHome?: string;
  headerAbout?: string;
  headerProducts?: string;
  headerServices?: string;
  headerContact?: string;
  headerCta?: string;
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

type SectionKey = "identity" | null;

const defaultTheme: Theme = {
  primary: "#111827",
  secondary: "#dfb053",
  background: "#FFFFFF",
  text: "#111827",
  font: "Inter, sans-serif",
  radius: "medium",
  buttonStyle: "rounded",
  cardStyle: "soft",
  headerStyle: "minimal",
  footerStyle: "simple",
  headerText: "#111827",
  categoryText: "#475569",
  priceText: "#111827",
};


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
    const host = process.env.NEXT_PUBLIC_PUBLIC_HOST ?? "monerp.vercel.app";
    const mode = process.env.NEXT_PUBLIC_PUBLIC_SITE_MODE ?? "path";
    if (mode === "path") return `https://${host}/site/${form.slug}`;
    if (website?.public_url) return website.public_url;
    return `https://${form.slug}.${host}`;
  }, [form.slug, website?.public_url]);

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

  async function configureCustomDomain() {
    if (!website) return;
    const domain = window.prompt("Domaine personnalisé (ex: www.exemple.com)");
    if (!domain?.trim()) return;
    const response = await fetch(`${API_URL}/api/v1/websites/current/domains`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ domain: domain.trim() }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      showToast("error", (payload as { detail?: string }).detail ?? "Domaine invalide");
      return;
    }
    const domainRecord = (await response.json()) as { id: number; domain: string; type: string; verified: boolean; active: boolean };
    setWebsite((current) => current ? {
      ...current,
      primary_domain: domainRecord.domain,
      public_url: `https://${domainRecord.domain}`,
      domains: [...(current.domains ?? []), domainRecord],
    } : current);
    showToast("success", "Domaine ajouté. Configurez son CNAME vers votre domaine public.");
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
      <AppShell minimalSidebar>
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
  const resolvedSections = (sections.length > 0 ? sections : getDefaultSectionsForTemplate(form.template || website?.template || "commerce"))
    .filter((section) => section.visible !== false)
    .slice(0, MAX_VISIBLE_SECTIONS);
  const previewSlug = form.slug || website?.slug || "preview";

  return (
    <AppShell minimalSidebar>
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
                  <code>{previewUrl || "https://monerp.vercel.app/site/mon-site"}</code>
                </span>
                {website && (
                  <button
                    type="button"
                    className={styles.btnGhostCompact}
                    onClick={() => void configureCustomDomain()}
                    style={{ marginTop: 8, width: "100%" }}
                  >
                    <Globe size={12} /> Configurer un domaine personnalisé
                  </button>
                )}
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
                <SiteHeader
                  slug="preview"
                  siteName={form.name || orgName}
                  logo={form.logo || undefined}
                  primaryColor={theme.primary}
                  secondaryColor={theme.secondary}
                  textColor={theme.text}
                  headerStyle={theme.headerStyle}
                  labels={{
                    home: theme.headerHome,
                    about: theme.headerAbout,
                    products: theme.headerProducts,
                    services: theme.headerServices,
                    contact: theme.headerContact,
                    cta: theme.headerCta,
                  }}
                  preview
                  showCart={false}
                />

                <main className={previewStyles.siteBody}>
                  <div className={previewStyles.siteMainContent}>
                    <SiteSections
                      sections={resolvedSections}
                      products={products}
                      siteName={form.name || orgName}
                      textColor={theme.text}
                      secondaryTextColor={theme.secondaryText ?? "#475569"}
                      primaryColor={theme.primary}
                      secondaryColor={theme.secondary}
                      slug={previewSlug}
                    />
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