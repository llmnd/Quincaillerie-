"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FileText,
  FolderPlus,
  Globe,
  ImageIcon,
  LayoutGrid,
  Menu,
  Monitor,
  Palette,
  Phone,
  Plus,
  Save,
  Settings2,
  Smartphone,
  Trash2,
  Type,
  Undo2,
  Redo2,
  X,
} from "lucide-react";
import AppShell from "../../../components/AppShell";
import { authHeaders } from "../../../lib/auth";
import styles from "./page.module.css";
import previewStyles from "../_shared/preview.module.css";
import { sanitizeInlineHtml } from "../_shared/SiteSections";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/* ---------- Types ---------- */
type Section = {
  id?: number;
  type: string;
  position: number;
  visible: boolean;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
};

type EditorSnapshot = {
  sections: Section[];
};

type PageItem = {
  id?: number;
  name: string;
  slug: string;
  title?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  published?: boolean;
  position?: number;
};

type WebsiteTheme = {
  primary?: string;
  secondary?: string;
  background?: string;
  text?: string;
  font?: string;
  radius?: string;
  buttonStyle?: string;
  cardStyle?: string;
  headerStyle?: string;
  footerStyle?: string;
  secondaryText?: string;
  headerBrand?: string;
  headerHome?: string;
  headerAbout?: string;
  headerProducts?: string;
  headerServices?: string;
  headerContact?: string;
  headerCta?: string;
};

type OrganizationProfile = {
  name?: string | null;
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type SocialLinks = {
  facebook: string;
  instagram: string;
  linkedin: string;
  twitter: string;
};

type MediaItem = {
  id?: number;
  name?: string;
  url: string;
};

type AccordionKey = "pages" | "blocks" | "style" | "contact" | "theme" | null;

const defaultTheme: WebsiteTheme = {
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
  secondaryText: "#475569",
};

const MAX_VISIBLE_SECTIONS_IN_PREVIEW = 6;

const library = [
  { type: "hero", label: "Intro", icon: <Monitor size={20} /> },
  { type: "products", label: "Catalogue", icon: <LayoutGrid size={20} /> },
  { type: "text", label: "Texte", icon: <Type size={20} /> },
  { type: "banner", label: "Bannière", icon: <ImageIcon size={20} /> },
  { type: "about", label: "À propos", icon: <FolderPlus size={20} /> },
  { type: "contact", label: "Contact", icon: <Phone size={20} /> },
  { type: "gallery", label: "Images", icon: <ImageIcon size={20} /> },
  { type: "testimonials", label: "Avis", icon: <Type size={20} /> },
  { type: "features", label: "Services", icon: <LayoutGrid size={20} /> },
  { type: "faq", label: "FAQ", icon: <FileText size={20} /> },
  { type: "map", label: "Carte", icon: <Globe size={20} /> },
  { type: "footer", label: "Pied de page", icon: <Settings2 size={20} /> },
];

const themePresets = [
  { name: "Slate",    primary: "#0f172a", secondary: "#0ea5a4", background: "#ffffff", text: "#0f172a" },
  { name: "Plum",     primary: "#1e1b4b", secondary: "#714b67", background: "#faf5ff", text: "#1e1b4b" },
  { name: "Ember",    primary: "#7c2d12", secondary: "#ea580c", background: "#fffbeb", text: "#7c2d12" },
  { name: "Forest",   primary: "#14532d", secondary: "#16a34a", background: "#f0fdf4", text: "#14532d" },
  { name: "Ocean",    primary: "#0c4a6e", secondary: "#0ea5e9", background: "#f0f9ff", text: "#0c4a6e" },
  { name: "Midnight", primary: "#f8fafc", secondary: "#0ea5a4", background: "#0f172a", text: "#f8fafc" },
];

const siteTemplates = [
  { key: "commerce", name: "Boutique", description: "Catalogue et demandes de panier", theme: themePresets[0] },
  { key: "services", name: "Services", description: "Présentation d'une activité", theme: themePresets[3] },
  { key: "portfolio", name: "Portfolio", description: "Images et réalisations", theme: themePresets[4] },
  { key: "restaurant", name: "Restaurant", description: "Menu et contact rapide", theme: themePresets[2] },
];

/* ============================================================
   Helpers tailles / graisses
   ============================================================ */
const SIZE_OPTIONS = [
  { key: "sm",  label: "S",   css: "0.875rem", cls: "size-s" },
  { key: "md",  label: "M",   css: "1rem",     cls: "size-m" },
  { key: "lg",  label: "L",   css: "1.25rem",  cls: "size-l" },
  { key: "xl",  label: "XL",  css: "1.75rem",  cls: "size-xl" },
  { key: "2xl", label: "2XL", css: "2.5rem",   cls: "size-2xl" },
] as const;

const WEIGHT_OPTIONS = [
  { key: "light",    label: "Léger",  css: 300, cls: "weight-light" },
  { key: "normal",   label: "Normal", css: 400, cls: "weight-normal" },
  { key: "medium",   label: "Médium", css: 500, cls: "weight-medium" },
  { key: "semibold", label: "Semi",   css: 600, cls: "weight-semibold" },
  { key: "bold",     label: "Gras",   css: 700, cls: "weight-bold" },
] as const;

function sizeToCss(key: string | undefined, fallback: string | number = ""): string | number {
  const found = SIZE_OPTIONS.find((s) => s.key === key);
  return found?.css ?? fallback;
}
function weightToCss(key: string | undefined, fallback: string | number = ""): string | number {
  const found = WEIGHT_OPTIONS.find((w) => w.key === key);
  return found?.css ?? fallback;
}

function sectionSpacingStyle(content: Record<string, unknown>): React.CSSProperties {
  const value = (key: string, fallback: number) => {
    const parsed = Number(content[key]);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(96, parsed)) : fallback;
  };
  return {
    "--section-padding-desktop": `${value("spacingDesktop", 20)}px ${value("spacingHorizontal", 22)}px`,
    "--section-padding-tablet": `${value("spacingTablet", 16)}px ${value("spacingHorizontalTablet", 18)}px`,
    "--section-padding-mobile": `${value("spacingMobile", 14)}px ${value("spacingHorizontalMobile", 14)}px`,
    "--section-gap": `${value("elementGap", 12)}px`,
  } as React.CSSProperties;
}

/* ============================================================
   Upload média
   ============================================================ */
async function uploadWebsiteMedia(file: File): Promise<string> {
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET) {
    const cloudinaryForm = new FormData();
    cloudinaryForm.append("file", file);
    cloudinaryForm.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: cloudinaryForm },
    );

    if (cloudinaryResponse.ok) {
      const payload = (await cloudinaryResponse.json()) as {
        secure_url?: string;
        url?: string;
      };
      const url = payload.secure_url ?? payload.url ?? "";
      if (url) return url;
    }
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/v1/websites/current/media/upload`, {
    method: "POST",
    credentials: "include",
    headers: { ...authHeaders() },
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof (payload as { detail?: string }).detail === "string"
        ? (payload as { detail: string }).detail
        : "Impossible d'importer l'image";
    throw new Error(message);
  }

  const payload = (await response.json()) as
    | { url?: string; data?: { url?: string }; file_url?: string }
    | string;

  if (typeof payload === "string") return payload;
  return payload.url ?? payload.data?.url ?? payload.file_url ?? "";
}

/* ============================================================
   EditableText
   ============================================================ */
function EditableText({
  as = "span",
  value,
  htmlValue,
  editable = false,
  active = false,
  focused = false,
  hovered = false,
  className,
  style,
  onSelect,
  onDoubleClick,
  onCommit,
  onHoverChange,
  link,
  ...props
}: {
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "strong" | "em";
  value: string;
  htmlValue?: string;
  editable?: boolean;
  active?: boolean;
  focused?: boolean;
  hovered?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onSelect?: () => void;
  onDoubleClick?: () => void;
  link?: string;
  onCommit?: (nextValue: string) => void;
  onHoverChange?: (hovering: boolean) => void;
} & React.HTMLAttributes<HTMLElement>) {
  const Tag = as as React.ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (isFocusedRef.current) return;
    const nextHtml = htmlValue ? sanitizeInlineHtml(htmlValue) : "";
    if (nextHtml) {
      if (node.innerHTML !== nextHtml) node.innerHTML = nextHtml;
    } else if (node.textContent !== value) {
      node.textContent = value;
    }
  }, [htmlValue, value]);

  return (
    <Tag
      {...props}
      ref={ref}
      className={className}
      style={style}
      contentEditable={editable && active}
      suppressContentEditableWarning
      spellCheck={false}
      onFocus={() => {
        isFocusedRef.current = true;
        onSelect?.();
      }}
      onDoubleClick={() => {
        onSelect?.();
        onDoubleClick?.();
      }}
      onClick={(event: React.MouseEvent<HTMLElement>) => {
        if (editable) {
          event.preventDefault();
          onSelect?.();
          return;
        }
        if (!link) return;
        event.preventDefault();
        window.open(link, "_blank", "noopener,noreferrer");
      }}
      onBlur={(event: React.FocusEvent<HTMLElement>) => {
        isFocusedRef.current = false;
        const raw = event.currentTarget.innerHTML;
        const next = raw.trim() ? sanitizeInlineHtml(raw) : value;
        if (next !== value) onCommit?.(next);
        if (event.currentTarget.innerHTML !== next) event.currentTarget.innerHTML = next;
      }}
      onInput={(event: React.FormEvent<HTMLElement>) => {
        const next = sanitizeInlineHtml(event.currentTarget.innerHTML);
        onCommit?.(next);
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === "Escape") {
          event.currentTarget.innerHTML = htmlValue ? sanitizeInlineHtml(htmlValue) : sanitizeInlineHtml(value);
          event.currentTarget.blur();
        }
      }}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    />
  );
}

/* ============================================================
   Accordion
   ============================================================ */
function Accordion({
  id,
  title,
  icon,
  badge,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge?: string | number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.accordion} data-open={open || undefined} data-id={id}>
      <button
        type="button"
        className={styles.accordionTrigger}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className={styles.accordionChevron} data-open={open || undefined}>
          <ChevronRight size={14} />
        </span>
        <span className={styles.accordionIcon}>{icon}</span>
        <span className={styles.accordionTitle}>{title}</span>
        {badge !== undefined && badge !== null && badge !== "" && (
          <span className={styles.accordionBadge}>{badge}</span>
        )}
      </button>
      <div className={styles.accordionBody} data-open={open || undefined}>
        <div className={styles.accordionInner}>{children}</div>
      </div>
    </div>
  );
}

/* ============================================================
   ThemeColorInput
   ============================================================ */
function ThemeColorInput({
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
      <div className={styles.colorFieldRow}>
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
   Segmented
   ============================================================ */
function Segmented<T extends { key: string; label: string; cls?: string }>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: string | undefined;
  onChange: (next: string) => void;
}) {
  return (
    <div className={styles.segmented}>
      {options.map((opt) => {
        const cls = opt.cls ? (styles as unknown as Record<string, string>)[opt.cls] ?? "" : "";
        return (
          <button
            key={opt.key}
            type="button"
            className={`${styles.segmentedBtn} ${cls} ${value === opt.key ? styles.segmentedBtnActive : ""}`}
            onClick={() => onChange(opt.key)}
            title={opt.label}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   ImagePicker
   ============================================================ */
function ImagePicker({
  value,
  onChange,
  label = "Image de la section",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDrag, setIsDrag] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Seules les images sont acceptées");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const url = await uploadWebsiteMedia(file);
      if (!url) throw new Error("URL manquante dans la réponse");
      onChange(url);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erreur d'import");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.imagePicker}>
      <div
        className={styles.imageDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDrag(true);
        }}
        onDragLeave={() => setIsDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDrag(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        role="button"
        tabIndex={0}
        style={isDrag ? { borderColor: "#14b8a6", background: "rgba(14,165,164,0.15)" } : undefined}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className={styles.imageDropImg} />
            <div className={styles.imageDropOverlay}>
              <span className={styles.imageBadge}>Image</span>
              <div className={styles.imageDropActions}>
                <button
                  type="button"
                  className={styles.imageDropAction}
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                  title="Remplacer"
                >
                  <ImageIcon size={12} />
                </button>
                <button
                  type="button"
                  className={styles.imageDropAction}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange("");
                  }}
                  title="Retirer"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.imageDropEmpty}>
            <ImageIcon size={22} />
            <span>Glissez une image ici</span>
            <span className={styles.imageDropHint}>ou cliquez pour choisir</span>
          </div>
        )}

        {uploading && (
          <div className={styles.imageUploadProgress}>
            <span style={{ display: "inline-flex", animation: "spin 0.9s linear infinite" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </span>
            Import…
          </div>
        )}
      </div>

      {error && <span className={styles.imageFieldError}>{error}</span>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ============================================================
   Page principale
   ============================================================ */
export default function WebsiteEditorPage() {
  const router = useRouter();

  const [pages, setPages] = useState<PageItem[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [companyProducts, setCompanyProducts] = useState<
    Array<{
      id: number;
      name: string;
      image_url?: string | null;
      description?: string | null;
      unit_price?: number | string | null;
      category?: string | null;
    }>
  >([]);
  const [draggedPageId, setDraggedPageId] = useState<number | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<number | null>(null);
  const [dragOverPageId, setDragOverPageId] = useState<number | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<number | null>(null);
  const [websiteTheme, setWebsiteTheme] = useState<WebsiteTheme>(defaultTheme);
  const [pageDraft, setPageDraft] = useState({ name: "", slug: "" });
  const [organizationProfile, setOrganizationProfile] = useState<OrganizationProfile | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    facebook: "",
    instagram: "",
    linkedin: "",
    twitter: "",
  });
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [inlineTextColor, setInlineTextColor] = useState("#111827");
  const [inlineLinkDraft, setInlineLinkDraft] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [savingPage, setSavingPage] = useState(false);
  const [savingSite, setSavingSite] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPageFormOpen, setIsPageFormOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<AccordionKey>("blocks");
  const [toast, setToast] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const [, setHistoryTick] = useState(0);

  const textPatchTimers = useRef<Map<string, number>>(new Map());
  const undoStack = useRef<EditorSnapshot[]>([]);
  const redoStack = useRef<EditorSnapshot[]>([]);
  const lastHistoryAt = useRef(0);
  const inlineSelection = useRef<Range | null>(null);

  /* ---------- Data fetching ---------- */
  async function fetchWebsiteTheme() {
    const response = await fetch(`${API_URL}/api/v1/websites/current`, {
      credentials: "include",
      headers: { Accept: "application/json", ...authHeaders() },
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = (await response.json()) as {
      theme?: WebsiteTheme;
      settings?: { social_links?: Partial<SocialLinks> };
    };
    setWebsiteTheme({ ...defaultTheme, ...(data.theme ?? {}) });
    setSocialLinks({
      facebook: data.settings?.social_links?.facebook ?? "",
      instagram: data.settings?.social_links?.instagram ?? "",
      linkedin: data.settings?.social_links?.linkedin ?? "",
      twitter: data.settings?.social_links?.twitter ?? "",
    });
  }

  async function fetchPages() {
    const response = await fetch(`${API_URL}/api/v1/websites/current/pages`, {
      credentials: "include",
      headers: { Accept: "application/json", ...authHeaders() },
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = (await response.json()) as PageItem[];
    setPages(data);
    if (data.length > 0 && (!selectedPageId || !data.some((page) => page.id === selectedPageId))) {
      setSelectedPageId(data[0].id ?? null);
    }
  }

  async function fetchSections(pageId: number | null) {
    if (!pageId) {
      setSections([]);
      return;
    }
    const response = await fetch(`${API_URL}/api/v1/websites/pages/${pageId}/sections`, {
      credentials: "include",
      headers: { Accept: "application/json", ...authHeaders() },
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = (await response.json()) as Section[];
    setSections(data);
  }

  async function fetchProducts() {
    const response = await fetch(`${API_URL}/api/v1/products`, {
      credentials: "include",
      headers: { Accept: "application/json", ...authHeaders() },
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = (await response.json()) as Array<{
      id: number;
      name: string;
      image_url?: string | null;
      description?: string | null;
      unit_price?: number | string | null;
      category?: string | null;
    }>;
    setCompanyProducts(data.filter((product) => product && typeof product.name === "string"));
  }

  async function fetchMedia() {
    const response = await fetch(`${API_URL}/api/v1/websites/current/media`, {
      credentials: "include",
      headers: { Accept: "application/json", ...authHeaders() },
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = (await response.json()) as { media?: MediaItem[] };
    setMediaItems(Array.isArray(data.media) ? data.media.filter((item) => item?.url) : []);
  }

  useEffect(() => {
    void (async () => {
      await fetchWebsiteTheme();
      await fetchPages();
      await fetchProducts();
      await fetchMedia();
      try {
        const response = await fetch(`${API_URL}/api/v1/organization/profile`, {
          credentials: "include",
          headers: { Accept: "application/json", ...authHeaders() },
          cache: "no-store",
        });
        if (response.ok) {
          const organization = (await response.json()) as OrganizationProfile;
          setOrganizationProfile(organization);
        }
      } catch (error) {
        console.error("Unable to load organization profile", error);
      }
      setIsReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetchSections(selectedPageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPageId]);

  useEffect(() => {
    if (!sections.length) {
      setSelectedSectionId(null);
      setSelectedElementId(null);
      return;
    }
    const hasSelected =
      selectedSectionId != null && sections.some((section) => section.id === selectedSectionId);
    if (!hasSelected) {
      setSelectedSectionId(sections[0].id ?? null);
      setSelectedElementId(null);
    }
  }, [sections, selectedSectionId]);

  /* ---------- Cmd/Ctrl + S ---------- */
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const modifier = isMac ? event.metaKey : event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveWebsite();
      }
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, sections, websiteTheme]);

  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null;
  const selectedSection = sections.find((section) => section.id === selectedSectionId) ?? null;

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  function selectSectionElement(section: Section | null, elementId: string | null = null) {
    if (!section) {
      setSelectedSectionId(null);
      setSelectedElementId(null);
      return;
    }
    setSelectedSectionId(section.id ?? null);
    setSelectedElementId(elementId);
  }

  function cloneSections(value: Section[]): Section[] {
    return value.map((section) => ({ ...section, content: { ...section.content }, settings: { ...section.settings } }));
  }

  function pushHistory() {
    const now = Date.now();
    if (now - lastHistoryAt.current > 700) {
      undoStack.current = [...undoStack.current.slice(-49), { sections: cloneSections(sections) }];
      redoStack.current = [];
      lastHistoryAt.current = now;
      setHistoryTick((tick) => tick + 1);
    }
  }

  async function persistSectionsSnapshot(snapshot: Section[]) {
    await Promise.all(snapshot.filter((section) => section.id).map((section) => fetch(`${API_URL}/api/v1/websites/sections/${section.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ content: section.content, settings: section.settings, visible: section.visible, position: section.position }),
    })));
  }

  function undo() {
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current.push({ sections: cloneSections(sections) });
    setSections(cloneSections(previous.sections));
    void persistSectionsSnapshot(previous.sections);
    setHistoryTick((tick) => tick + 1);
  }

  function redo() {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({ sections: cloneSections(sections) });
    setSections(cloneSections(next.sections));
    void persistSectionsSnapshot(next.sections);
    setHistoryTick((tick) => tick + 1);
  }

  function commitSectionElementValue(sectionId: number | null, elementId: string | null, nextValue: string) {
    if (sectionId == null || !elementId) return;

    pushHistory();

    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? { ...section, content: { ...section.content, [elementId]: nextValue } }
          : section,
      ),
    );

    const key = `${sectionId}:${elementId}`;
    const timers = textPatchTimers.current;
    const existing = timers.get(key);
    if (existing) window.clearTimeout(existing);

    const timer = window.setTimeout(() => {
      const targetSection = sections.find((s) => s.id === sectionId);
      const content = {
        ...(targetSection?.content ?? {}),
        [elementId]: nextValue,
      };
      void fetch(`${API_URL}/api/v1/websites/sections/${sectionId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ content }),
      }).catch((error) => console.error("Failed to persist section value", error));
      timers.delete(key);
    }, 500);

    timers.set(key, timer);
  }

  function updateSelectedSectionField(key: string, value: string) {
    if (!selectedSection || !selectedSection.id) return;
    pushHistory();
    setSections((current) =>
      current.map((item) =>
        item.id === selectedSection.id
          ? { ...item, content: { ...item.content, [key]: value } }
          : item,
      ),
    );
    const keyId = `${selectedSection.id}:${key}`;
    const timers = textPatchTimers.current;
    const existing = timers.get(keyId);
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      const currentSection = sections.find((item) => item.id === selectedSection.id);
      void fetch(`${API_URL}/api/v1/websites/sections/${selectedSection.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ content: { ...(currentSection?.content ?? selectedSection.content), [key]: value } }),
      }).catch((error) => console.error("Failed to persist section content", error));
      timers.delete(keyId);
    }, 400);
    timers.set(keyId, timer);
  }

  function selectedTextKey(suffix: string) {
    if (!selectedElementId) return suffix;
    if (selectedElementId === "title") return `title${suffix}`;
    if (selectedElementId === "button") return suffix === "Link" ? "buttonLink" : `button${suffix}`;
    return `text${suffix}`;
  }

  function updateInlineTextStyle(suffix: string, value: string) {
    updateSelectedSectionField(selectedTextKey(suffix), value);
  }

  function insertInlineLink() {
    if (!selectedElementId) return;
    const current = String(selectedSection?.content?.[selectedTextKey("Link")] ?? "");
    const selection = window.getSelection();
    inlineSelection.current = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    setInlineLinkDraft(current || "https://");
  }

  function applyInlineLink() {
    if (inlineLinkDraft === null) return;
    const selection = window.getSelection();
    if (inlineSelection.current && selection) {
      selection.removeAllRanges();
      selection.addRange(inlineSelection.current);
    }
    formatInline("createLink", inlineLinkDraft.trim());
    updateInlineTextStyle("Link", inlineLinkDraft.trim());
    setInlineLinkDraft(null);
  }

  function formatInline(command: "bold" | "italic" | "underline" | "createLink", value?: string) {
    document.execCommand(command, false, value);
    const active = document.activeElement as HTMLElement | null;
    active?.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "formatInline" }));
  }

  /* ---------- Preview ---------- */
  const defaultPreviewSections: Section[] = [
    {
      id: 1000,
      type: "hero",
      position: 0,
      visible: true,
      content: {
        title: "À propos de nous",
        subtitle:
          "Nous sommes une équipe de passionnés dont le but est d'améliorer la vie de chacun grâce à des produits durables.",
        buttonText: "Contactez-nous",
        buttonLink: "#contact",
      },
      settings: {},
    },
    {
      id: 1001,
      type: "text",
      position: 1,
      visible: true,
      content: {
        title: "Nos produits",
        text: "Nos produits sont conçus pour les petites et moyennes entreprises désireuses d'optimiser leur quotidien.",
      },
      settings: {},
    },
  ];

  const displaySections = (sections.length > 0 ? sections : defaultPreviewSections)
    .filter((section) => section.visible !== false)
    .slice(0, MAX_VISIBLE_SECTIONS_IN_PREVIEW);
  const organizationName = organizationProfile?.name?.trim() || "Votre entreprise";
  const organizationLogo = organizationProfile?.logo || "";

  function renderPreviewSection(section: Section, index: number) {
    const isSectionSelected = selectedSectionId === section.id;
    const content = section.content ?? {};
    const sectionKey = section.id ?? `${section.type}-${index}`;
    const previewSectionId = String(section.id ?? sectionKey);
    const isEditable = editorMode === "edit";
    const sectionProducts = companyProducts.slice(0, 3);
    const galleryImages = companyProducts.slice(0, 4);

    const sectionWrapperProps = {
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        if (!isEditable) return;
        event.preventDefault();
        event.stopPropagation();
        selectSectionElement(section, null);
      },
      role: isEditable ? ("button" as const) : undefined,
      tabIndex: isEditable ? 0 : undefined,
      "data-section-id": previewSectionId,
      "data-editor-type": "section" as const,
      style: sectionSpacingStyle(content),
    };

    const isTitleActive = selectedSectionId === section.id;
    const isTitleFocused = isTitleActive && selectedElementId === "title";
    const isSubtitleFocused = isTitleActive && selectedElementId === "subtitle";
    const isTextFocused = isTitleActive && selectedElementId === "text";
    const isButtonFocused = isTitleActive && selectedElementId === "button";

    const titleClass = `${previewStyles.editableText} ${isTitleFocused ? previewStyles.editableTextFocused : ""} ${isTitleActive ? previewStyles.editableTextActive : ""} ${hoveredElementId === "title" && isTitleActive ? previewStyles.editableTextHover : ""}`;
    const subtitleClass = `${previewStyles.editableText} ${previewStyles.editableSecondaryText} ${isSubtitleFocused ? previewStyles.editableTextFocused : ""} ${isTitleActive ? previewStyles.editableTextActive : ""} ${hoveredElementId === "subtitle" && isTitleActive ? previewStyles.editableTextHover : ""}`;
    const textClass = `${previewStyles.editableText} ${previewStyles.editableSecondaryText} ${isTextFocused ? previewStyles.editableTextFocused : ""} ${isTitleActive ? previewStyles.editableTextActive : ""} ${hoveredElementId === "text" && isTitleActive ? previewStyles.editableTextHover : ""}`;
    const buttonClass = `${previewStyles.editableButton} ${isButtonFocused ? previewStyles.editableTextFocused : ""} ${isTitleActive ? previewStyles.editableTextActive : ""} ${hoveredElementId === "button" && isTitleActive ? previewStyles.editableTextHover : ""}`;

    const inlineStyle = (element: "title" | "subtitle" | "text" | "button"): React.CSSProperties => {
      const prefix = element === "title" ? "title" : element === "button" ? "button" : "text";
      const size = content[`${prefix}Size`];
      const weight = content[`${prefix}Weight`];
      const color = content[`${prefix}Color`];
      const textAlign = content[`${prefix}Align`];
      const italic = content[`${prefix}Italic`] === "true";
      const underline = content[`${prefix}Underline`] === "true";
      return {
        fontSize: sizeToCss(String(size ?? ""), ""),
        fontWeight: weightToCss(String(weight ?? ""), "") as React.CSSProperties["fontWeight"],
        color: typeof color === "string" && color ? color : undefined,
        textAlign: textAlign === "left" || textAlign === "center" || textAlign === "right" ? textAlign : undefined,
        fontStyle: italic ? "italic" : undefined,
        textDecoration: underline ? "underline" : undefined,
      };
    };

    const commitTitle = (next: string) => commitSectionElementValue(section.id ?? null, "title", next);
    const commitSubtitle = (next: string) => commitSectionElementValue(section.id ?? null, "subtitle", next);
    const commitText = (next: string) => commitSectionElementValue(section.id ?? null, "text", next);

    if (section.type === "hero") {
      const imageUrl = String(content.image ?? "");
      return (
        <section
          key={sectionKey}
          className={`${previewStyles.previewSiteBlock} ${previewStyles.heroBlock} ${isSectionSelected ? previewStyles.previewSiteBlockSelected : ""}`}
          {...sectionWrapperProps}
        >
          <div className={previewStyles.heroPreviewContent}>
            <div>
              <p className={previewStyles.previewEyebrow}>{organizationName}</p>
              <EditableText
                as="h3"
                value={String(content.title ?? "Bienvenue")}
                htmlValue={String(content.titleHtml ?? "")}
                editable={isEditable}
                link={String(content.titleLink ?? "")}
                active={isTitleActive}
                focused={isTitleFocused}
                hovered={hoveredElementId === "title" && isTitleActive}
                className={titleClass}
                style={{
                  ...inlineStyle("title"),
                  fontSize: sizeToCss(String(content.titleSize ?? ""), ""),
                  fontWeight: weightToCss(String(content.titleWeight ?? ""), "") as React.CSSProperties["fontWeight"],
                }}
                data-section-id={previewSectionId}
                data-element-id="title"
                onSelect={() => selectSectionElement(section, "title")}
                onCommit={(next) => commitSectionElementValue(section.id ?? null, "titleHtml", next)}
                onHoverChange={(hovering) =>
                  setHoveredElementId((c) => (hovering ? "title" : c === "title" ? null : c))
                }
              />
              <EditableText
                as="p"
                value={String(content.subtitle ?? "Votre site public")}
                htmlValue={String(content.textHtml ?? "")}
                editable={isEditable}
                link={String(content.textLink ?? "")}
                active={isTitleActive}
                focused={isSubtitleFocused}
                hovered={hoveredElementId === "subtitle" && isTitleActive}
                className={subtitleClass}
                style={{
                  ...inlineStyle("subtitle"),
                  fontSize: sizeToCss(String(content.textSize ?? ""), ""),
                  fontWeight: weightToCss(String(content.textWeight ?? ""), "") as React.CSSProperties["fontWeight"],
                }}
                data-section-id={previewSectionId}
                data-element-id="subtitle"
                onSelect={() => selectSectionElement(section, "subtitle")}
                onCommit={(next) => commitSectionElementValue(section.id ?? null, "textHtml", next)}
                onHoverChange={(hovering) =>
                  setHoveredElementId((c) => (hovering ? "subtitle" : c === "subtitle" ? null : c))
                }
              />
              <a
                href={String(content.buttonLink ?? "#contact")}
                className={buttonClass}
                data-section-id={previewSectionId}
                data-element-id="button"
                onClick={(event) => {
                  if (!isEditable) return;
                  event.preventDefault();
                  event.stopPropagation();
                  selectSectionElement(section, "button");
                }}
                onMouseEnter={() => setHoveredElementId("button")}
                onMouseLeave={() => setHoveredElementId((c) => (c === "button" ? null : c))}
              >
                <EditableText
                  value={String(content.buttonText ?? "Découvrir")}
                  htmlValue={
                    String(content.buttonTextHtml ?? "").includes(String(content.buttonText ?? "Découvrir"))
                      ? String(content.buttonTextHtml ?? "")
                      : ""
                  }
                  editable={isEditable}
                  active={isTitleActive}
                  focused={isButtonFocused}
                  hovered={hoveredElementId === "button" && isTitleActive}
                  className={previewStyles.editableButtonText}
                  style={inlineStyle("button")}
                  onSelect={() => selectSectionElement(section, "button")}
                  onCommit={(next) => commitSectionElementValue(section.id ?? null, "buttonTextHtml", next)}
                  onHoverChange={(hovering) =>
                    setHoveredElementId((c) => (hovering ? "button" : c === "button" ? null : c))
                  }
                />
              </a>
            </div>

            {imageUrl ? (
              <div className={previewStyles.previewHeroImage}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={String(content.title ?? "")} />
              </div>
            ) : (
              <div className={previewStyles.heroPreviewVisual}>Image</div>
            )}
          </div>
        </section>
      );
    }

    if (section.type === "banner") {
      const imageUrl = String(content.image ?? "");
      return (
        <section
          key={sectionKey}
          className={`${previewStyles.previewSiteBlock} ${previewStyles.heroBlock} ${isSectionSelected ? previewStyles.previewSiteBlockSelected : ""}`}
          {...sectionWrapperProps}
        >
          {imageUrl ? (
            <div className={previewStyles.previewBannerImage}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={String(content.title ?? "")} />
            </div>
          ) : null}
          <EditableText
            as="h3"
            value={String(content.title ?? "Bannière")}
            htmlValue={String(content.titleHtml ?? "")}
            editable={isEditable}
            link={String(content.titleLink ?? "")}
            active={isTitleActive}
            focused={isTitleFocused}
            hovered={hoveredElementId === "title" && isTitleActive}
            className={titleClass}
            style={{
              ...inlineStyle("title"),
              fontSize: sizeToCss(String(content.titleSize ?? ""), ""),
              fontWeight: weightToCss(String(content.titleWeight ?? ""), "") as React.CSSProperties["fontWeight"],
            }}
            data-section-id={previewSectionId}
            data-element-id="title"
            onSelect={() => selectSectionElement(section, "title")}
            onCommit={(next) => commitSectionElementValue(section.id ?? null, "titleHtml", next)}
            onHoverChange={(hovering) =>
              setHoveredElementId((c) => (hovering ? "title" : c === "title" ? null : c))
            }
          />
          <EditableText
            as="p"
            value={String(content.subtitle ?? "Une bannière personnalisée")}
            htmlValue={String(content.textHtml ?? "")}
            editable={isEditable}
            link={String(content.textLink ?? "")}
            active={isTitleActive}
            focused={isSubtitleFocused}
            hovered={hoveredElementId === "subtitle" && isTitleActive}
            className={subtitleClass}
            style={{
              ...inlineStyle("subtitle"),
              fontSize: sizeToCss(String(content.textSize ?? ""), ""),
              fontWeight: weightToCss(String(content.textWeight ?? ""), "") as React.CSSProperties["fontWeight"],
            }}
            data-section-id={previewSectionId}
            data-element-id="subtitle"
            onSelect={() => selectSectionElement(section, "subtitle")}
            onCommit={(next) => commitSectionElementValue(section.id ?? null, "textHtml", next)}
            onHoverChange={(hovering) =>
              setHoveredElementId((c) => (hovering ? "subtitle" : c === "subtitle" ? null : c))
            }
          />
        </section>
      );
    }

    if (section.type === "products") {
      return (
        <section
          key={sectionKey}
          className={`${previewStyles.previewSiteBlock} ${isSectionSelected ? previewStyles.previewSiteBlockSelected : ""}`}
          {...sectionWrapperProps}
        >
          <EditableText
            as="h3"
            value={String(content.title ?? "Nos produits")}
            editable={isEditable}
            link={String(content.titleLink ?? "")}
            active={isTitleActive}
            focused={isTitleFocused}
            hovered={hoveredElementId === "title" && isTitleActive}
            className={titleClass}
            style={{
              ...inlineStyle("title"),
              fontSize: sizeToCss(String(content.titleSize ?? ""), ""),
              fontWeight: weightToCss(String(content.titleWeight ?? ""), "") as React.CSSProperties["fontWeight"],
            }}
            data-section-id={previewSectionId}
            data-element-id="title"
            onSelect={() => selectSectionElement(section, "title")}
            onCommit={commitTitle}
            onHoverChange={(hovering) =>
              setHoveredElementId((c) => (hovering ? "title" : c === "title" ? null : c))
            }
          />
          <EditableText
            as="p"
            value={String(content.subtitle ?? "Choisissez vos produits et envoyez votre demande directement à l'entreprise.")}
            htmlValue={String(content.textHtml ?? "")}
            editable={isEditable}
            link={String(content.textLink ?? "")}
            active={isTitleActive}
            focused={isSubtitleFocused}
            hovered={hoveredElementId === "subtitle" && isTitleActive}
            className={subtitleClass}
            style={{
              ...inlineStyle("subtitle"),
              fontSize: sizeToCss(String(content.textSize ?? ""), ""),
              fontWeight: weightToCss(String(content.textWeight ?? ""), "") as React.CSSProperties["fontWeight"],
            }}
            data-section-id={previewSectionId}
            data-element-id="subtitle"
            onSelect={() => selectSectionElement(section, "subtitle")}
            onCommit={(next) => commitSectionElementValue(section.id ?? null, "subtitle", next)}
            onHoverChange={(hovering) =>
              setHoveredElementId((c) => (hovering ? "subtitle" : c === "subtitle" ? null : c))
            }
          />
          <div className={previewStyles.productGrid}>
            {(sectionProducts.length > 0
              ? sectionProducts
              : [
                  { id: 0, name: "Produit 1", image_url: null },
                  { id: 1, name: "Produit 2", image_url: null },
                  { id: 2, name: "Produit 3", image_url: null },
                ]
            ).map((product, productIndex) => (
              <article
                key={product.id || productIndex}
                className={`${previewStyles.productCard} ${product.id > 0 ? previewStyles.productCardEditable : ""}`}
                onClick={() => {
                  if (isEditable && product.id > 0) router.push(`/products?edit=${product.id}`);
                }}
                role={isEditable && product.id > 0 ? "link" : undefined}
                tabIndex={isEditable && product.id > 0 ? 0 : undefined}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && isEditable && product.id > 0) router.push(`/products?edit=${product.id}`);
                }}
              >
                <div className={previewStyles.productImage}>
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    `Produit ${productIndex + 1}`
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
      return (
        <section
          key={sectionKey}
          className={`${previewStyles.previewSiteBlock} ${isSectionSelected ? previewStyles.previewSiteBlockSelected : ""}`}
          {...sectionWrapperProps}
        >
          <EditableText
            as="h3"
            value={String(content.title ?? "Images de nos produits")}
            editable={isEditable}
            link={String(content.titleLink ?? "")}
            active={isTitleActive}
            focused={isTitleFocused}
            hovered={hoveredElementId === "title" && isTitleActive}
            className={titleClass}
            style={{
              ...inlineStyle("title"),
              fontSize: sizeToCss(String(content.titleSize ?? ""), ""),
              fontWeight: weightToCss(String(content.titleWeight ?? ""), "") as React.CSSProperties["fontWeight"],
            }}
            data-section-id={previewSectionId}
            data-element-id="title"
            onSelect={() => selectSectionElement(section, "title")}
            onCommit={commitTitle}
            onHoverChange={(hovering) =>
              setHoveredElementId((c) => (hovering ? "title" : c === "title" ? null : c))
            }
          />
          <div className={previewStyles.productGrid}>
            {(galleryImages.length > 0
              ? galleryImages
              : [
                  { id: 0, name: "Produit 1", image_url: null },
                  { id: 1, name: "Produit 2", image_url: null },
                  { id: 2, name: "Produit 3", image_url: null },
                  { id: 3, name: "Produit 4", image_url: null },
                ]
            ).map((product, productIndex) => (
              <article
                key={product.id || productIndex}
                className={`${previewStyles.productCard} ${product.id > 0 ? previewStyles.productCardEditable : ""}`}
                onClick={() => {
                  if (isEditable && product.id > 0) router.push(`/products?edit=${product.id}`);
                }}
                role={isEditable && product.id > 0 ? "link" : undefined}
                tabIndex={isEditable && product.id > 0 ? 0 : undefined}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && isEditable && product.id > 0) router.push(`/products?edit=${product.id}`);
                }}
              >
                <div className={previewStyles.productImage}>
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    `Image ${productIndex + 1}`
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    }

    /* default : text / about / contact / footer */
    const imageUrl = String(content.image ?? "");
    return (
      <section
        key={sectionKey}
        className={`${previewStyles.previewSiteBlock} ${isSectionSelected ? previewStyles.previewSiteBlockSelected : ""}`}
        {...sectionWrapperProps}
      >
        {imageUrl ? (
          <div className={previewStyles.previewSectionImage}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={String(content.title ?? "")} />
          </div>
        ) : null}
        <EditableText
          as="h3"
          value={String(content.title ?? section.type)}
          htmlValue={String(content.titleHtml ?? "")}
          editable={isEditable}
          link={String(content.titleLink ?? "")}
          active={isTitleActive}
          focused={isTitleFocused}
          hovered={hoveredElementId === "title" && isTitleActive}
          className={titleClass}
          style={{
            ...inlineStyle("title"),
            fontSize: sizeToCss(String(content.titleSize ?? ""), ""),
            fontWeight: weightToCss(String(content.titleWeight ?? ""), "") as React.CSSProperties["fontWeight"],
          }}
          data-section-id={previewSectionId}
          data-element-id="title"
          onSelect={() => selectSectionElement(section, "title")}
          onCommit={(next) => commitSectionElementValue(section.id ?? null, "titleHtml", next)}
          onHoverChange={(hovering) =>
            setHoveredElementId((c) => (hovering ? "title" : c === "title" ? null : c))
          }
        />
        <EditableText
          as="p"
          value={String(content.text ?? content.subtitle ?? "Contenu par défaut. Cliquez pour modifier.")}
          htmlValue={String(content.textHtml ?? "")}
          editable={isEditable}
          link={String(content.textLink ?? "")}
          active={isTitleActive}
          focused={isTextFocused}
          hovered={hoveredElementId === "text" && isTitleActive}
          className={textClass}
          style={{
            ...inlineStyle("text"),
            fontSize: sizeToCss(String(content.textSize ?? ""), ""),
            fontWeight: weightToCss(String(content.textWeight ?? ""), "") as React.CSSProperties["fontWeight"],
          }}
          data-section-id={previewSectionId}
          data-element-id="text"
          onSelect={() => selectSectionElement(section, "text")}
          onCommit={(next) => commitSectionElementValue(section.id ?? null, "textHtml", next)}
          onHoverChange={(hovering) =>
            setHoveredElementId((c) => (hovering ? "text" : c === "text" ? null : c))
          }
        />
      </section>
    );
  }

  /* ---------- Theme update ---------- */
  async function updateThemeValue(key: keyof WebsiteTheme, value: string) {
    const nextTheme = { ...websiteTheme, [key]: value };
    setWebsiteTheme(nextTheme);
    const response = await fetch(`${API_URL}/api/v1/websites/current`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ theme: nextTheme }),
    });
    if (!response.ok) console.error("Theme update failed");
  }

  async function applyThemePreset(preset: (typeof themePresets)[number]) {
    const nextTheme: WebsiteTheme = {
      ...websiteTheme,
      primary: preset.primary,
      secondary: preset.secondary,
      background: preset.background,
      text: preset.text,
    };
    setWebsiteTheme(nextTheme);
    await fetch(`${API_URL}/api/v1/websites/current`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ theme: nextTheme }),
    }).catch((error) => console.error("Theme preset failed", error));
  }

  async function applySiteTemplate(template: (typeof siteTemplates)[number]) {
    await applyThemePreset(template.theme);
    const response = await fetch(`${API_URL}/api/v1/websites/current`, {
      method: "PATCH",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ template: template.key }),
    });
    if (!response.ok) {
      showToast("Le modèle n'a pas pu être appliqué");
      return;
    }
    showToast(`Modèle « ${template.name} » appliqué`);
  }

  function extractErrorMessage(value: unknown): string {
    if (typeof value === "string") return value.trim();
    if (Array.isArray(value)) return value.map((item) => extractErrorMessage(item)).filter(Boolean).join(" ");
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      for (const candidate of [record.msg, record.message, record.error, record.detail]) {
        const message = extractErrorMessage(candidate);
        if (message) return message;
      }
      for (const candidate of Object.values(record)) {
        const message = extractErrorMessage(candidate);
        if (message) return message;
      }
    }
    return "";
  }

  /* ---------- CRUD ---------- */
  async function addPage() {
    if (!pageDraft.name.trim()) return;
    setSavingPage(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/websites/current/pages`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          name: pageDraft.name,
          slug: pageDraft.slug || pageDraft.name,
          title: pageDraft.name,
          meta_title: pageDraft.name,
          published: true,
          position: pages.length,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(extractErrorMessage(payload) || "Impossible de créer la page");
      }
      const createdPage = (await response.json()) as PageItem;
      setPageDraft({ name: "", slug: "" });
      setSelectedPageId(createdPage.id ?? null);
      setIsPageFormOpen(false);
      await fetchPages();
      showToast("Page créée");
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Erreur");
    } finally {
      setSavingPage(false);
    }
  }

  async function persistPageOrder(nextPages: PageItem[]) {
    await Promise.all(
      nextPages.map((page, index) =>
        page.id
          ? fetch(`${API_URL}/api/v1/websites/pages/${page.id}`, {
              method: "PATCH",
              credentials: "include",
              headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
              body: JSON.stringify({ position: index }),
            })
          : Promise.resolve(),
      ),
    );
  }

  async function persistSectionOrder(nextSections: Section[]) {
    await Promise.all(
      nextSections.map((section, index) =>
        section.id
          ? fetch(`${API_URL}/api/v1/websites/sections/${section.id}`, {
              method: "PATCH",
              credentials: "include",
              headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
              body: JSON.stringify({ position: index }),
            })
          : Promise.resolve(),
      ),
    );
  }

  async function addSection(type: string) {
    if (!selectedPageId) {
      showToast("Sélectionnez d'abord une page");
      return;
    }
    const sectionDefaults: Record<string, Record<string, unknown>> = {
      products: { title: "Nos produits", subtitle: "Choisissez vos produits et envoyez votre demande directement à l'entreprise.", show_price: true, show_description: true, show_category: true, show_search: true, show_filters: true, columns: 3, columns_tablet: 2, columns_mobile: 1 },
      testimonials: { title: "Ils nous font confiance", subtitle: "Découvrez les retours de nos clients." },
      features: { title: "Nos services", subtitle: "Des solutions pensées pour votre activité." },
      faq: { title: "Questions fréquentes", subtitle: "Les réponses aux questions les plus courantes." },
      map: { title: "Nous trouver", subtitle: "Retrouvez-nous facilement." },
    };
    const response = await fetch(`${API_URL}/api/v1/websites/pages/${selectedPageId}/sections`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        type,
        position: sections.length,
        content: sectionDefaults[type] ?? { title: `Nouvelle section ${sections.length + 1}` },
        settings: {},
        visible: true,
      }),
    });
    if (!response.ok) {
      showToast("Impossible d'ajouter la section");
      return;
    }
    const section = (await response.json()) as Section;
    setSections((current) => [...current, section]);
    setSelectedSectionId(section.id ?? null);
    setSelectedElementId(null);
    showToast("Section ajoutée");
  }

  async function duplicatePage(pageId: number | null) {
    if (pageId == null) return;
    const sourcePage = pages.find((page) => page.id === pageId);
    if (!sourcePage) return;
    const pageResponse = await fetch(`${API_URL}/api/v1/websites/current/pages`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        name: `${sourcePage.name} copie`,
        slug: `${sourcePage.slug}-copie`,
        title: `${sourcePage.title ?? sourcePage.name} copie`,
        meta_title: `${sourcePage.meta_title ?? sourcePage.name} copie`,
        published: true,
        position: pages.length,
      }),
    });
    if (!pageResponse.ok) return;
    const createdPage = (await pageResponse.json()) as PageItem;
    const sectionResponse = await fetch(`${API_URL}/api/v1/websites/pages/${pageId}/sections`, {
      credentials: "include",
      headers: { Accept: "application/json", ...authHeaders() },
      cache: "no-store",
    });
    if (sectionResponse.ok) {
      const sourceSections = (await sectionResponse.json()) as Section[];
      for (const sourceSection of sourceSections) {
        await fetch(`${API_URL}/api/v1/websites/pages/${createdPage.id}/sections`, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            type: sourceSection.type,
            position: sourceSection.position,
            visible: sourceSection.visible,
            content: sourceSection.content,
            settings: sourceSection.settings,
          }),
        });
      }
    }
    await fetchPages();
    setSelectedPageId(createdPage.id ?? null);
    showToast("Page dupliquée");
  }

  async function duplicateSection(section: Section) {
    if (!selectedPageId || !section.id) return;
    const response = await fetch(`${API_URL}/api/v1/websites/pages/${selectedPageId}/sections`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        type: section.type,
        position: sections.length,
        visible: section.visible,
        content: section.content,
        settings: section.settings,
      }),
    });
    if (!response.ok) {
      showToast("Impossible de dupliquer la section");
      return;
    }
    const created = (await response.json()) as Section;
    setSections((current) => [...current, created]);
    setSelectedSectionId(created.id ?? null);
    showToast("Section dupliquée");
  }

  async function deletePage(pageId: number | null) {
    if (pageId == null) return;
    if (!confirm("Supprimer cette page et toutes ses sections ?")) return;
    const response = await fetch(`${API_URL}/api/v1/websites/pages/${pageId}`, {
      method: "DELETE",
      credentials: "include",
      headers: { ...authHeaders() },
    });
    if (!response.ok) {
      showToast("Impossible de supprimer la page");
      return;
    }
    const nextPages = pages.filter((page) => page.id !== pageId);
    setPages(nextPages);
    setSelectedPageId(nextPages[0]?.id ?? null);
    await fetchPages();
    showToast("Page supprimée");
  }

  function movePage(sourceId: number | null, targetId: number | null) {
    if (sourceId == null || targetId == null || sourceId === targetId) return;
    const nextPages = [...pages];
    const sourceIndex = nextPages.findIndex((page) => page.id === sourceId);
    const targetIndex = nextPages.findIndex((page) => page.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;
    const [moved] = nextPages.splice(sourceIndex, 1);
    nextPages.splice(targetIndex, 0, moved);
    setPages(nextPages);
    void persistPageOrder(nextPages);
  }

  function moveSection(sourceId: number | null, targetId: number | null) {
    if (sourceId == null || targetId == null || sourceId === targetId) return;
    const nextSections = [...sections];
    const sourceIndex = nextSections.findIndex((section) => section.id === sourceId);
    const targetIndex = nextSections.findIndex((section) => section.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;
    const [moved] = nextSections.splice(sourceIndex, 1);
    nextSections.splice(targetIndex, 0, moved);
    setSections(nextSections);
    void persistSectionOrder(nextSections);
  }

  async function toggleSectionVisibility(section: Section) {
    if (!section.id) return;
    const nextVisible = !section.visible;
    setSections((current) =>
      current.map((item) => (item.id === section.id ? { ...item, visible: nextVisible } : item)),
    );
    const response = await fetch(`${API_URL}/api/v1/websites/sections/${section.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ visible: nextVisible }),
    });
    if (!response.ok) {
      setSections((current) =>
        current.map((item) => (item.id === section.id ? { ...item, visible: !nextVisible } : item)),
      );
    }
  }

  async function deleteSection(sectionId: number | null) {
    if (sectionId == null) return;
    if (!confirm("Supprimer cette section ?")) return;
    const response = await fetch(`${API_URL}/api/v1/websites/sections/${sectionId}`, {
      method: "DELETE",
      credentials: "include",
      headers: { ...authHeaders() },
    });
    if (!response.ok) {
      showToast("Impossible de supprimer la section");
      return;
    }
    setSections((current) => {
      const nextSections = current.filter((section) => section.id !== sectionId);
      if (selectedSectionId === sectionId) {
        setSelectedSectionId(nextSections[0]?.id ?? null);
        setSelectedElementId(null);
      }
      return nextSections;
    });
    showToast("Section supprimée");
  }

  async function updatePageMetadata(next: Partial<PageItem>) {
    if (!selectedPageId) return;
    setPages((current) => current.map((page) => (page.id === selectedPageId ? { ...page, ...next } : page)));
    const response = await fetch(`${API_URL}/api/v1/websites/pages/${selectedPageId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(next),
    });
    if (!response.ok) {
      showToast("Impossible de sauvegarder la page");
      return;
    }
    const updatedPage = (await response.json()) as PageItem;
    setPages((current) => current.map((page) => (page.id === updatedPage.id ? { ...page, ...updatedPage } : page)));
  }

  async function saveWebsite() {
    setSavingSite(true);
    setSaveMessage(null);
    try {
      const currentWebsiteResponse = await fetch(`${API_URL}/api/v1/websites/current`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          theme: websiteTheme,
          settings: {
            social_links: Object.fromEntries(
              Object.entries(socialLinks).map(([key, value]) => [key, value.trim() || null]),
            ),
          },
        }),
      });
      if (!currentWebsiteResponse.ok) {
        const payload = await currentWebsiteResponse.json().catch(() => null);
        throw new Error(extractErrorMessage(payload) || "Impossible de sauvegarder le thème");
      }

      if (organizationProfile) {
        const organizationResponse = await fetch(`${API_URL}/api/v1/organization/profile`, {
          method: "PUT",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            name: organizationProfile.name?.trim() || "Votre entreprise",
            logo: organizationProfile.logo ?? null,
            email: organizationProfile.email?.trim() || null,
            phone: organizationProfile.phone?.trim() || null,
            address: organizationProfile.address?.trim() || null,
          }),
        });
        if (!organizationResponse.ok) {
          const payload = await organizationResponse.json().catch(() => null);
          throw new Error(extractErrorMessage(payload) || "Impossible de sauvegarder les coordonnées");
        }
      }

      const pagePromises = pages
        .filter((page) => typeof page.id === "number")
        .map((page) =>
          fetch(`${API_URL}/api/v1/websites/pages/${page.id}`, {
            method: "PATCH",
            credentials: "include",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              ...authHeaders(),
            },
            body: JSON.stringify({
              name: page.name,
              slug: page.slug,
              title: page.title ?? page.name,
              meta_title: page.meta_title ?? page.title ?? page.name,
              meta_description: page.meta_description ?? null,
              published: page.published ?? true,
              position: page.position ?? 0,
            }),
          }),
        );

      const sectionPromises = sections
        .filter((section) => typeof section.id === "number")
        .map((section) =>
          fetch(`${API_URL}/api/v1/websites/sections/${section.id}`, {
            method: "PATCH",
            credentials: "include",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              ...authHeaders(),
            },
            body: JSON.stringify({
              type: section.type,
              position: section.position,
              content: section.content ?? {},
              settings: section.settings ?? {},
              visible: section.visible,
            }),
          }),
        );

      const results = await Promise.allSettled([...pagePromises, ...sectionPromises]);
      const failures = results.filter((result) => result.status === "rejected");
      if (failures.length > 0) throw new Error(`Sauvegarde incomplète (${failures.length} échecs)`);

      setSaveMessage("Site enregistré ✓");
      showToast("Site enregistré");
      window.setTimeout(() => setSaveMessage(null), 2500);

      window.setTimeout(() => {
        router.push("/website");
        router.refresh();
      }, 700);
    } catch (error) {
      console.error(error);
      setSaveMessage(error instanceof Error ? error.message : "Échec");
      showToast("Échec de la sauvegarde");
    } finally {
      setSavingSite(false);
    }
  }

  async function discardChanges() {
    if (!confirm("Annuler toutes les modifications non sauvegardées ?")) return;
    setSaveMessage(null);
    await fetchWebsiteTheme();
    await fetchPages();
    if (selectedPageId) await fetchSections(selectedPageId);
    showToast("Modifications annulées");
  }

  if (!isReady) {
    return (
      <AppShell>
        <div style={{ padding: 24, color: "#111827" }}>Chargement de l'éditeur…</div>
      </AppShell>
    );
  }

  const previewMaxWidth =
    deviceMode === "mobile" ? "430px" : deviceMode === "tablet" ? "900px" : "100%";

  return (
    <AppShell>
      <div
        className={`${styles.editorShell} ${previewStyles.themeRoot}`}
        data-radius={websiteTheme.radius ?? "medium"}
        data-btn={websiteTheme.buttonStyle ?? "rounded"}
        data-card={websiteTheme.cardStyle ?? "soft"}
        data-header={websiteTheme.headerStyle ?? "minimal"}
        data-footer={websiteTheme.footerStyle ?? "simple"}
      >
        <button
          type="button"
          className={styles.mobileToggle}
          onClick={() => setMobileSidebarOpen((v) => !v)}
          aria-label="Ouvrir le panneau"
        >
          <Menu size={20} />
        </button>

        {mobileSidebarOpen && (
          <div
            className={styles.mobileBackdrop}
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden
          />
        )}

        <div className={styles.editorLayout}>
          <aside
            className={`${styles.panel} ${styles.sidebar}`}
            data-mobile-open={mobileSidebarOpen || undefined}
          >
            <div className={styles.sidebarBrand}>
              <div className={styles.sidebarBrandIcon}>
                <LayoutGrid size={16} />
              </div>
              <div className={styles.sidebarBrandText}>
                <strong>Éditeur</strong>
                <span>{selectedPage?.name ?? "Aucune page"}</span>
              </div>
              <button
                type="button"
                className={styles.sidebarCloseMobile}
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.sidebarActions}>
              <div className={styles.deviceRow}>
                {(["desktop", "tablet", "mobile"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`${styles.deviceIconButton} ${deviceMode === mode ? styles.deviceIconButtonActive : ""}`}
                    onClick={() => setDeviceMode(mode)}
                    title={mode}
                  >
                    {mode === "desktop" ? <Monitor size={14} /> : mode === "tablet" ? <LayoutGrid size={14} /> : <Smartphone size={14} />}
                  </button>
                ))}
                <div className={styles.deviceSpacer} />
                <button
                  type="button"
                  className={`${styles.modeToggle} ${editorMode === "edit" ? styles.modeToggleActive : ""}`}
                  onClick={() => setEditorMode((m) => (m === "edit" ? "preview" : "edit"))}
                  title={editorMode === "edit" ? "Passer en preview" : "Revenir à l'édition"}
                >
                  {editorMode === "edit" ? <Eye size={13} /> : <Type size={13} />}
                  {editorMode === "edit" ? "Édition" : "Preview"}
                </button>
              </div>
              <div className={styles.saveRow}>
                <button
                  type="button"
                  className={styles.deviceIconButton}
                  onClick={undo}
                  disabled={undoStack.current.length === 0}
                  title="Annuler (Ctrl+Z)"
                  aria-label="Annuler"
                >
                  <Undo2 size={14} />
                </button>
                <button
                  type="button"
                  className={styles.deviceIconButton}
                  onClick={redo}
                  disabled={redoStack.current.length === 0}
                  title="Rétablir (Ctrl+Y)"
                  aria-label="Rétablir"
                >
                  <Redo2 size={14} />
                </button>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => void discardChanges()}
                  title="Annuler les modifications"
                >
                  <X size={13} />
                </button>
                <button
                  type="button"
                  className={styles.saveButtonPrimary}
                  onClick={() => void saveWebsite()}
                  disabled={savingSite}
                >
                  <Save size={14} /> {savingSite ? "…" : "Sauver"}
                </button>
              </div>
              {saveMessage ? <div className={styles.saveToast}>{saveMessage}</div> : null}
            </div>

            <div className={styles.accordionStack}>
              <Accordion
                id="pages"
                title="Pages"
                icon={<FileText size={14} />}
                badge={pages.length}
                open={openAccordion === "pages"}
                onToggle={() => setOpenAccordion((c) => (c === "pages" ? null : "pages"))}
              >
                <div className={styles.pageList}>
                  {pages.length === 0 ? (
                    <div className={styles.emptyHint}>Aucune page pour l'instant.</div>
                  ) : (
                    pages.map((page) => {
                      const isSelected = selectedPageId === page.id;
                      const isDragOver = dragOverPageId === (page.id ?? null);
                      return (
                        <div
                          key={page.id ?? page.slug}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOverPageId(page.id ?? null);
                          }}
                          onDragLeave={() =>
                            setDragOverPageId((c) => (c === (page.id ?? null) ? null : c))
                          }
                          onDrop={() => {
                            movePage(draggedPageId, page.id ?? null);
                            setDraggedPageId(null);
                            setDragOverPageId(null);
                          }}
                          className={`${styles.pageCard} ${isSelected ? styles.pageCardActive : ""} ${isDragOver ? styles.pageCardDrop : ""}`}
                        >
                          <div className={styles.pageRow}>
                            <span
                              draggable={Boolean(page.id)}
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = "move";
                                setDraggedPageId(page.id ?? null);
                              }}
                              onDragEnd={() => {
                                setDraggedPageId(null);
                                setDragOverPageId(null);
                              }}
                              className={styles.pageDragHandle}
                              title="Déplacer"
                            >
                              ⋮⋮
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPageId(page.id ?? null);
                                setMobileSidebarOpen(false);
                              }}
                              className={`${styles.pageButton} ${isSelected ? styles.pageButtonActive : ""}`}
                            >
                              <span className={styles.pageButtonName}>{page.name}</span>
                              {page.published === false && (
                                <span className={styles.pageBadge}>Brouillon</span>
                              )}
                            </button>
                            <div className={styles.pageActions}>
                              <button
                                type="button"
                                onClick={() => void duplicatePage(page.id ?? null)}
                                title="Dupliquer"
                                className={styles.pageActionButton}
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => void deletePage(page.id ?? null)}
                                title="Supprimer"
                                className={styles.pageActionButton}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className={styles.addForm}>
                  {isPageFormOpen ? (
                    <>
                      <input
                        className={styles.input}
                        placeholder="Nom de la page"
                        value={pageDraft.name}
                        onChange={(e) =>
                          setPageDraft((c) => ({
                            ...c,
                            name: e.target.value,
                            slug: c.slug || e.target.value.toLowerCase().replace(/\s+/g, "-"),
                          }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && void addPage()}
                        autoFocus
                      />
                      <input
                        className={styles.input}
                        placeholder="slug-de-la-page"
                        value={pageDraft.slug}
                        onChange={(e) => setPageDraft((c) => ({ ...c, slug: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && void addPage()}
                      />
                      <div className={styles.inlineToolbar}>
                        <button
                          type="button"
                          className={styles.primaryButton}
                          disabled={savingPage}
                          onClick={() => void addPage()}
                        >
                          {savingPage ? "Création…" : "Créer"}
                        </button>
                        <button
                          type="button"
                          className={styles.ghostButton}
                          onClick={() => setIsPageFormOpen(false)}
                        >
                          Annuler
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={() => setIsPageFormOpen(true)}
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      <Plus size={14} /> Ajouter une page
                    </button>
                  )}
                </div>
                {selectedPage && (
                  <div className={styles.styleGroup}>
                    <span className={styles.styleGroupTitle}>SEO de la page</span>
                    <label className={styles.fieldLabel}>
                      <span>Titre SEO</span>
                      <input
                        className={styles.input}
                        maxLength={255}
                        value={selectedPage.meta_title ?? ""}
                        onChange={(event) => void updatePageMetadata({ meta_title: event.target.value })}
                      />
                    </label>
                    <label className={styles.fieldLabel}>
                      <span>Description SEO</span>
                      <textarea
                        className={styles.textarea}
                        maxLength={500}
                        value={selectedPage.meta_description ?? ""}
                        onChange={(event) => void updatePageMetadata({ meta_description: event.target.value })}
                      />
                    </label>
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={selectedPage.published !== false}
                        onChange={(event) => void updatePageMetadata({ published: event.target.checked })}
                      />
                      <span>Page publiée</span>
                    </label>
                  </div>
                )}
              </Accordion>

              <Accordion
                id="blocks"
                title="Blocs"
                icon={<LayoutGrid size={14} />}
                badge={sections.length}
                open={openAccordion === "blocks"}
                onToggle={() => setOpenAccordion((c) => (c === "blocks" ? null : "blocks"))}
              >
                <div className={styles.sectionLibrary}>
                  <div className={styles.sectionGrid}>
                    {library.map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => void addSection(item.type)}
                        className={styles.sectionButton}
                      >
                        <span className={styles.sectionIcon}>{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {sections.length > 0 && (
                  <div className={styles.sectionList}>
                    <div className={styles.sectionListHeader}>
                      <strong>Sur la page</strong>
                    </div>
                    {sections.map((section, index) => {
                      const isSelected = selectedSectionId === section.id;
                      const isDragOver = dragOverSectionId === (section.id ?? null);
                      return (
                        <div
                          key={section.id ?? `s-${index}`}
                          onClick={() => selectSectionElement(section, null)}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOverSectionId(section.id ?? null);
                          }}
                          onDragLeave={() =>
                            setDragOverSectionId((c) => (c === (section.id ?? null) ? null : c))
                          }
                          onDrop={() => {
                            moveSection(draggedSectionId, section.id ?? null);
                            setDraggedSectionId(null);
                            setDragOverSectionId(null);
                          }}
                          className={`${styles.sectionItem} ${isSelected ? styles.sectionItemActive : ""} ${isDragOver ? styles.sectionItemDrop : ""}`}
                        >
                          <span
                            draggable={Boolean(section.id)}
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move";
                              setDraggedSectionId(section.id ?? null);
                            }}
                            onDragEnd={() => {
                              setDraggedSectionId(null);
                              setDragOverSectionId(null);
                            }}
                            className={styles.sectionDragHandle}
                            title="Déplacer"
                          >
                            ⋮⋮
                          </span>
                          <div className={styles.sectionItemBody}>
                            <strong>{section.type}</strong>
                            <span>{String(section.content?.title ?? "Sans titre")}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void duplicateSection(section);
                            }}
                            className={styles.sectionItemIcon}
                            title="Dupliquer"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void toggleSectionVisibility(section);
                            }}
                            className={styles.sectionItemIcon}
                            title={section.visible ? "Masquer" : "Afficher"}
                          >
                            {section.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void deleteSection(section.id ?? null);
                            }}
                            className={styles.sectionItemIcon}
                            title="Supprimer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Accordion>

              <Accordion
                id="style"
                title="Style"
                icon={<Type size={14} />}
                badge={selectedSection ? selectedSection.type : undefined}
                open={openAccordion === "style"}
                onToggle={() => setOpenAccordion((c) => (c === "style" ? null : "style"))}
              >
                {selectedSection ? (
                  <div className={styles.stylePanel}>
                    <div className={styles.panelTitle}>
                      <strong>{selectedSection.type}</strong>
                      {selectedSection.id ? <span>#{selectedSection.id}</span> : null}
                    </div>

                    {selectedSection.type === "products" && (
                      <div className={styles.styleGroup}>
                        <span className={styles.styleGroupTitle}>Options du catalogue</span>
                        {[
                          ["show_price", "Afficher les prix"],
                          ["show_category", "Afficher les catégories"],
                          ["show_description", "Afficher les descriptions"],
                          ["show_search", "Afficher la recherche"],
                          ["show_filters", "Afficher les filtres"],
                        ].map(([key, label]) => {
                          const value = selectedSection.content?.[key];
                          return (
                            <label key={key} className={styles.checkboxRow}>
                              <input
                                type="checkbox"
                                checked={value !== false && value !== "false"}
                                onChange={(event) => updateSelectedSectionField(key, String(event.target.checked))}
                              />
                              <span>{label}</span>
                            </label>
                          );
                        })}
                        <label className={styles.fieldLabel}>
                          <span>Colonnes sur ordinateur</span>
                          <select
                            className={styles.select}
                            value={String(selectedSection.content?.columns ?? "3")}
                            onChange={(event) => updateSelectedSectionField("columns", event.target.value)}
                          >
                            <option value="1">1 colonne</option>
                            <option value="2">2 colonnes</option>
                            <option value="3">3 colonnes</option>
                            <option value="4">4 colonnes</option>
                          </select>
                        </label>
                        <label className={styles.fieldLabel}>
                          <span>Colonnes sur tablette</span>
                          <select
                            className={styles.select}
                            value={String(selectedSection.content?.columns_tablet ?? "2")}
                            onChange={(event) => updateSelectedSectionField("columns_tablet", event.target.value)}
                          >
                            <option value="1">1 colonne</option>
                            <option value="2">2 colonnes</option>
                            <option value="3">3 colonnes</option>
                          </select>
                        </label>
                        <label className={styles.fieldLabel}>
                          <span>Colonnes sur mobile</span>
                          <select
                            className={styles.select}
                            value={String(selectedSection.content?.columns_mobile ?? "1")}
                            onChange={(event) => updateSelectedSectionField("columns_mobile", event.target.value)}
                          >
                            <option value="1">1 colonne</option>
                            <option value="2">2 colonnes</option>
                          </select>
                        </label>
                      </div>
                    )}

                    <div className={styles.styleGroup}>
                      <span className={styles.styleGroupTitle}>Espacement</span>
                      {[
                        ["spacingDesktop", "Intérieur ordinateur", "20"],
                        ["spacingTablet", "Intérieur tablette", "16"],
                        ["spacingMobile", "Intérieur mobile", "14"],
                        ["elementGap", "Entre les éléments", "12"],
                      ].map(([key, label, fallback]) => (
                        <label key={key} className={styles.rangeField}>
                          <span>{label}</span>
                          <div className={styles.rangeRow}>
                            <input
                              type="range"
                              min="0"
                              max="64"
                              step="1"
                              value={String(selectedSection.content?.[key] ?? fallback)}
                              onChange={(event) => updateSelectedSectionField(key, event.target.value)}
                            />
                            <output>{String(selectedSection.content?.[key] ?? fallback)} px</output>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className={styles.styleGroup}>
                      <span className={styles.styleGroupTitle}>Titre</span>
                      <div className={styles.styleGroupRow}>
                        <div>
                          <span className={styles.styleMiniLabel}>Taille</span>
                          <Segmented
                            options={SIZE_OPTIONS}
                            value={String(selectedSection.content?.titleSize ?? "")}
                            onChange={(v) => updateSelectedSectionField("titleSize", v)}
                          />
                        </div>
                        <div>
                          <span className={styles.styleMiniLabel}>Graisse</span>
                          <Segmented
                            options={WEIGHT_OPTIONS}
                            value={String(selectedSection.content?.titleWeight ?? "")}
                            onChange={(v) => updateSelectedSectionField("titleWeight", v)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className={styles.styleGroup}>
                      <span className={styles.styleGroupTitle}>Texte courant</span>
                      <div className={styles.styleGroupRow}>
                        <div>
                          <span className={styles.styleMiniLabel}>Taille</span>
                          <Segmented
                            options={SIZE_OPTIONS}
                            value={String(selectedSection.content?.textSize ?? "")}
                            onChange={(v) => updateSelectedSectionField("textSize", v)}
                          />
                        </div>
                        <div>
                          <span className={styles.styleMiniLabel}>Graisse</span>
                          <Segmented
                            options={WEIGHT_OPTIONS}
                            value={String(selectedSection.content?.textWeight ?? "")}
                            onChange={(v) => updateSelectedSectionField("textWeight", v)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className={styles.styleGroup}>
                      <span className={styles.styleGroupTitle}>Image</span>
                      <ImagePicker
                        label="Image de la section"
                        value={String(selectedSection.content?.image ?? "")}
                        onChange={(url) => {
                          updateSelectedSectionField("image", url);
                          if (url && !mediaItems.some((item) => item.url === url)) {
                            void fetchMedia();
                          }
                        }}
                      />
                      {mediaItems.length > 0 && (
                        <div className={styles.mediaLibrary}>
                          <span className={styles.styleMiniLabel}>Bibliothèque</span>
                          <div className={styles.mediaGrid}>
                            {mediaItems.slice(-12).map((item) => (
                              <button
                                key={`${item.id ?? item.url}-${item.url}`}
                                type="button"
                                className={`${styles.mediaThumb} ${String(selectedSection.content?.image ?? "") === item.url ? styles.mediaThumbActive : ""}`}
                                title={item.name ?? "Image"}
                                onClick={() => updateSelectedSectionField("image", item.url)}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.url} alt={item.name ?? "Image"} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedSection.type === "hero" && (
                      <>
                        <label className={styles.fieldLabel}>
                          <span>Lien du bouton</span>
                          <input
                            className={styles.input}
                            value={String(selectedSection.content?.buttonLink ?? "")}
                            onChange={(e) => updateSelectedSectionField("buttonLink", e.target.value)}
                          />
                        </label>
                      </>
                    )}

                    <div className={styles.sectionStyleActions}>
                      <button
                        type="button"
                        className={styles.switchButton}
                        onClick={() => void toggleSectionVisibility(selectedSection)}
                      >
                        {selectedSection.visible ? "Masquer la section" : "Afficher la section"}
                      </button>
                      <button
                        type="button"
                        className={styles.dangerButton}
                        onClick={() => void deleteSection(selectedSection.id ?? null)}
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyHint}>
                    Sélectionnez une section dans l'aperçu pour modifier son contenu.
                  </div>
                )}
              </Accordion>

              <Accordion
                id="contact"
                title="Coordonnées & réseaux"
                icon={<Globe size={14} />}
                open={openAccordion === "contact"}
                onToggle={() => setOpenAccordion((c) => (c === "contact" ? null : "contact"))}
              >
                <div className={styles.stylePanel}>
                  <p className={styles.emptyHint}>
                    Ces informations seront utilisées dans la section contact et le pied de page de votre site.
                  </p>
                  <label className={styles.fieldLabel}>
                    <span>Adresse</span>
                    <input
                      className={styles.input}
                      value={organizationProfile?.address ?? ""}
                      placeholder="Adresse de l’entreprise"
                      onChange={(event) =>
                        setOrganizationProfile((current) => ({
                          ...(current ?? {}),
                          address: event.target.value,
                        }))
                      }
                    />
                  </label>
                  {([
                    ["facebook", "Facebook", "https://facebook.com/..."],
                    ["instagram", "Instagram", "https://instagram.com/..."],
                    ["linkedin", "LinkedIn", "https://linkedin.com/in/..."],
                    ["twitter", "X / Twitter", "https://x.com/..."],
                  ] as const).map(([key, label, placeholder]) => (
                    <label key={key} className={styles.fieldLabel}>
                      <span>{label}</span>
                      <input
                        className={styles.input}
                        type="url"
                        value={socialLinks[key]}
                        placeholder={placeholder}
                        onChange={(event) =>
                          setSocialLinks((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </Accordion>

              <Accordion
                id="theme"
                title="Thème"
                icon={<Palette size={14} />}
                open={openAccordion === "theme"}
                onToggle={() => setOpenAccordion((c) => (c === "theme" ? null : "theme"))}
              >
                <div className={styles.themePanel}>
                  <div className={styles.themePresetHeader}>Modèles de site</div>
                  <div className={styles.templateGrid}>
                    {siteTemplates.map((template) => (
                      <button
                        key={template.key}
                        type="button"
                        className={styles.templateCard}
                        onClick={() => void applySiteTemplate(template)}
                      >
                        <strong>{template.name}</strong>
                        <span>{template.description}</span>
                      </button>
                    ))}
                  </div>
                  <div className={styles.themePresetHeader}>Palettes rapides</div>
                  <div className={styles.themePresets}>
                    {themePresets.map((preset) => {
                      const isActive =
                        websiteTheme.primary === preset.primary &&
                        websiteTheme.secondary === preset.secondary &&
                        websiteTheme.background === preset.background;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          className={`${styles.presetChip} ${isActive ? styles.presetChipActive : ""}`}
                          onClick={() => void applyThemePreset(preset)}
                          title={preset.name}
                        >
                          <span className={styles.presetChipDots}>
                            <span style={{ background: preset.primary }} />
                            <span style={{ background: preset.secondary }} />
                            <span style={{ background: preset.background, border: "1px solid rgba(0,0,0,0.1)" }} />
                          </span>
                          <span className={styles.presetChipLabel}>{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <ThemeColorInput
                    label="Couleur principale"
                    value={websiteTheme.primary ?? "#111827"}
                    onCommit={(v) => void updateThemeValue("primary", v)}
                  />
                  <ThemeColorInput
                    label="Couleur secondaire"
                    value={websiteTheme.secondary ?? "#714B67"}
                    onCommit={(v) => void updateThemeValue("secondary", v)}
                  />
                  <ThemeColorInput
                    label="Arrière-plan"
                    value={websiteTheme.background ?? "#FFFFFF"}
                    onCommit={(v) => void updateThemeValue("background", v)}
                  />
                  <ThemeColorInput
                    label="Couleur du texte"
                    value={websiteTheme.text ?? "#111827"}
                    onCommit={(v) => void updateThemeValue("text", v)}
                  />

                  <ThemeColorInput
                    label="Texte secondaire"
                    value={websiteTheme.secondaryText ?? "#475569"}
                    onCommit={(v) => void updateThemeValue("secondaryText", v)}
                  />

                  <label className={styles.fieldLabel}>
                    <span>Police</span>
                    <select
                      className={styles.select}
                      value={websiteTheme.font ?? "Inter, sans-serif"}
                      onChange={(e) => void updateThemeValue("font", e.target.value)}
                    >
                      <option value="Inter, sans-serif">Inter</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="'Times New Roman', serif">Times New Roman</option>
                      <option value="system-ui, -apple-system, sans-serif">Système</option>
                      <option value="'Courier New', monospace">Courier New</option>
                    </select>
                  </label>
                  <label className={styles.fieldLabel}>
                    <span>Rayon</span>
                    <select
                      className={styles.select}
                      value={websiteTheme.radius ?? "medium"}
                      onChange={(e) => void updateThemeValue("radius", e.target.value)}
                    >
                      <option value="none">Aucun</option>
                      <option value="small">Petit</option>
                      <option value="medium">Moyen</option>
                      <option value="large">Grand</option>
                    </select>
                  </label>
                  <label className={styles.fieldLabel}>
                    <span>Boutons</span>
                    <select
                      className={styles.select}
                      value={websiteTheme.buttonStyle ?? "rounded"}
                      onChange={(e) => void updateThemeValue("buttonStyle", e.target.value)}
                    >
                      <option value="square">Carré</option>
                      <option value="rounded">Arrondi</option>
                      <option value="pill">Pilule</option>
                    </select>
                  </label>
                  <label className={styles.fieldLabel}>
                    <span>Cartes</span>
                    <select
                      className={styles.select}
                      value={websiteTheme.cardStyle ?? "soft"}
                      onChange={(e) => void updateThemeValue("cardStyle", e.target.value)}
                    >
                      <option value="flat">Plat</option>
                      <option value="soft">Doux</option>
                      <option value="elevated">Élevé</option>
                    </select>
                  </label>
                  <label className={styles.fieldLabel}>
                    <span>En-tête</span>
                    <select
                      className={styles.select}
                      value={websiteTheme.headerStyle ?? "minimal"}
                      onChange={(e) => void updateThemeValue("headerStyle", e.target.value)}
                    >
                      <option value="minimal">Minimal</option>
                      <option value="centered">Centré</option>
                      <option value="bold">Audacieux</option>
                    </select>
                  </label>
                  <div className={styles.styleGroup}>
                    <span className={styles.styleGroupTitle}>Contenu du header</span>
                    {([
                      ["headerBrand", "Nom affiché"],
                      ["headerHome", "Accueil"],
                      ["headerAbout", "À propos"],
                      ["headerProducts", "Produits"],
                      ["headerServices", "Services"],
                      ["headerContact", "Contact"],
                      ["headerCta", "Bouton contact"],
                    ] as const).map(([key, label]) => (
                      <label key={key} className={styles.fieldLabel}>
                        <span>{label}</span>
                        <input
                          className={styles.input}
                          value={websiteTheme[key] ?? ""}
                          placeholder={label}
                          onChange={(event) => void updateThemeValue(key, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                  <label className={styles.fieldLabel}>
                    <span>Pied de page</span>
                    <select
                      className={styles.select}
                      value={websiteTheme.footerStyle ?? "simple"}
                      onChange={(e) => void updateThemeValue("footerStyle", e.target.value)}
                    >
                      <option value="simple">Simple</option>
                      <option value="columns">Colonnes</option>
                      <option value="minimal">Minimal</option>
                    </select>
                  </label>
                </div>
              </Accordion>
            </div>
          </aside>

          <main className={`${styles.panel} ${styles.previewPanel}`}>
            <div className={styles.previewContent}>
              <div
                className={previewStyles.sitePreviewShell}
                style={
                  {
                    "--editor-primary": websiteTheme.primary,
                    "--editor-secondary": websiteTheme.secondary,
                    "--editor-bg": websiteTheme.background,
                    "--editor-text": websiteTheme.text,
                    "--editor-font": websiteTheme.font,
                    "--editor-secondary-text": websiteTheme.secondaryText,
                    fontFamily: websiteTheme.font,
                    maxWidth: previewMaxWidth,
                    width: "100%",
                    margin: "0 auto",
                  } as React.CSSProperties
                }
              >
                {editorMode === "edit" && selectedSectionId && selectedElementId && (
                  <div className={styles.inlineTextToolbar} role="toolbar" aria-label="Mise en forme du texte">
                    <span className={styles.inlineToolbarLabel}>Texte</span>
                    <select
                      className={styles.inlineToolbarSelect}
                      value={String(selectedSection?.content?.[selectedTextKey("Size")] ?? "md")}
                      onChange={(event) => updateInlineTextStyle("Size", event.target.value)}
                      aria-label="Taille du texte"
                    >
                      {SIZE_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                    </select>
                    <select
                      className={styles.inlineToolbarSelect}
                      value={String(selectedSection?.content?.[selectedTextKey("Weight")] ?? "normal")}
                      onChange={(event) => updateInlineTextStyle("Weight", event.target.value)}
                      aria-label="Graisse du texte"
                    >
                      {WEIGHT_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                    </select>
                    <label className={styles.inlineColorButton} title="Couleur du texte">
                      <span>A</span>
                      <input
                        type="color"
                        value={String(selectedSection?.content?.[selectedTextKey("Color")] ?? inlineTextColor)}
                        onChange={(event) => {
                          setInlineTextColor(event.target.value);
                          updateInlineTextStyle("Color", event.target.value);
                        }}
                        aria-label="Couleur du texte"
                      />
                    </label>
                    <button type="button" className={styles.inlineToolbarButton} onMouseDown={(event) => event.preventDefault()} onClick={() => formatInline("bold")} aria-label="Gras"><strong>B</strong></button>
                    <button type="button" className={styles.inlineToolbarButton} onMouseDown={(event) => event.preventDefault()} onClick={() => formatInline("italic")} aria-label="Italique"><em>I</em></button>
                    <button type="button" className={styles.inlineToolbarButton} onMouseDown={(event) => event.preventDefault()} onClick={() => formatInline("underline")} aria-label="Souligné"><u>U</u></button>
                    <button type="button" className={styles.inlineToolbarButton} onClick={() => updateInlineTextStyle("Align", "left")} aria-label="Aligner à gauche"><AlignLeft size={14} /></button>
                    <button type="button" className={styles.inlineToolbarButton} onClick={() => updateInlineTextStyle("Align", "center")} aria-label="Centrer"><AlignCenter size={14} /></button>
                    <button type="button" className={styles.inlineToolbarButton} onClick={() => updateInlineTextStyle("Align", "right")} aria-label="Aligner à droite"><AlignRight size={14} /></button>
                    {inlineLinkDraft === null ? (
                      <button type="button" className={styles.inlineToolbarButton} onMouseDown={(event) => event.preventDefault()} onClick={insertInlineLink} aria-label="Insérer un lien">↗</button>
                    ) : (
                      <form
                        className={styles.inlineLinkForm}
                        onSubmit={(event) => {
                          event.preventDefault();
                          applyInlineLink();
                        }}
                      >
                        <input
                          className={styles.inlineLinkInput}
                          value={inlineLinkDraft}
                          onChange={(event) => setInlineLinkDraft(event.target.value)}
                          aria-label="Adresse du lien"
                          autoFocus
                        />
                        <button type="submit" className={styles.inlineToolbarButton} aria-label="Appliquer le lien">OK</button>
                        <button type="button" className={styles.inlineToolbarButton} onClick={() => setInlineLinkDraft(null)} aria-label="Annuler">×</button>
                      </form>
                    )}
                  </div>
                )}
                <header className={previewStyles.siteHeader}>
                  <div className={previewStyles.companyBrand}>
                    {organizationLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={organizationLogo} alt={organizationName} className={previewStyles.companyLogo} />
                    ) : (
                      <div className={previewStyles.companyLogoFallback}>
                        {organizationName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span>{websiteTheme.headerBrand || organizationName}</span>
                  </div>
                  <button
                    type="button"
                    className={previewStyles.previewMenuButton}
                    aria-label={previewMenuOpen ? "Fermer le menu du site" : "Ouvrir le menu du site"}
                    aria-expanded={previewMenuOpen}
                    onClick={() => setPreviewMenuOpen((open) => !open)}
                  >
                    {previewMenuOpen ? <X size={18} strokeWidth={1.35} /> : (
                      <span className={previewStyles.menuLines} aria-hidden="true"><span /><span /></span>
                    )}
                  </button>
                  <nav className={`${previewStyles.siteNav} ${previewMenuOpen ? previewStyles.siteNavOpen : ""}`}>
                    <a href="#">{websiteTheme.headerHome || "Accueil"}</a>
                    <a href="#">{websiteTheme.headerAbout || "À propos"}</a>
                    <a href="#">{websiteTheme.headerProducts || "Produits"}</a>
                    <a href="#">{websiteTheme.headerServices || "Services"}</a>
                    <a href="#contact">{websiteTheme.headerContact || "Contact"}</a>
                  </nav>
                  <button type="button" className={previewStyles.siteHeaderButton} onClick={() => setPreviewMenuOpen(false)}>
                    {websiteTheme.headerCta || "Contactez-nous"}
                  </button>
                </header>

                <main className={previewStyles.siteBody}>
                  <div className={previewStyles.siteMainContent}>
                    {displaySections.map((section, index) => renderPreviewSection(section, index))}
                  </div>
                </main>

                <footer className={previewStyles.siteFooter}>
                  <span>{organizationName}</span>
                  <span>© 2026 — Tous droits réservés</span>
                </footer>
              </div>
            </div>
          </main>
        </div>

        {toast && <div className={styles.toast}>{toast}</div>}
      </div>
    </AppShell>
  );
}