"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardPaste,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FolderPlus,
  Globe,
  History,
  ImageIcon,
  LayoutGrid,
  Menu,
  Monitor,
  Moon,
  Paintbrush,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Smartphone,
  Sun,
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
import SiteSections, { getDefaultSectionsForTemplate, sanitizeInlineHtml } from "../_shared/SiteSections";
import { Accordion, editorLibrary, EditableText, ImagePicker, Segmented, ThemeColorInput } from "./components";
import type {
  AccordionKey,
  CompanyProduct,
  EditorSnapshot,
  HealthIssue,
  MediaItem,
  OrganizationProfile,
  PageItem,
  Section,
  SocialLinks,
  WebsiteTheme,
} from "./types";
import {
  API_URL,
  loadMedia,
  loadPages,
  loadProducts,
  loadSections,
  loadWebsiteTheme,
} from "./lib/api";
import {
  defaultTheme,
  formatRelativeTime,
  HEADER_THEME_KEYS,
  sectionSpacingStyle,
  siteTemplates,
  SIZE_OPTIONS,
  sizeToCss,
  themePresets,
  validateUrlValue,
  WEIGHT_OPTIONS,
  weightToCss,
} from "./lib/editor";

/* ============================================================
   Page principale
   ============================================================ */
export default function WebsiteEditorPage() {
  const router = useRouter();

  /* ---------- États ---------- */
  const [pages, setPages] = useState<PageItem[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | number | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [companyProducts, setCompanyProducts] = useState<CompanyProduct[]>([]);
  const [draggedPageId, setDraggedPageId] = useState<number | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | number | null>(null);
  const [dragOverPageId, setDragOverPageId] = useState<number | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | number | null>(null);
  const [websiteTheme, setWebsiteTheme] = useState<WebsiteTheme>(defaultTheme);
  const [siteTemplate, setSiteTemplate] = useState<string>("commerce");
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
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 24, y: 18 });
  const [headerInlineStyles, setHeaderInlineStyles] = useState<Record<string, React.CSSProperties>>({});
  const [, setHistoryTick] = useState(0);

  /* ---------- Nouveaux états UX ---------- */
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [styleClipboard, setStyleClipboard] = useState<Record<string, string> | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [undoDropdownOpen, setUndoDropdownOpen] = useState(false);
  const [healthPanelOpen, setHealthPanelOpen] = useState(false);
  const [blockSearch, setBlockSearch] = useState("");
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});

  /* ---------- Refs ---------- */
  const textPatchTimers = useRef<Map<string, number>>(new Map());
  const toolbarDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const undoStack = useRef<EditorSnapshot[]>([]);
  const redoStack = useRef<EditorSnapshot[]>([]);
  const lastHistoryAt = useRef(0);
  const inlineSelection = useRef<Range | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const autoSaveArmedAt = useRef<number>(0);
  const saveWebsiteRef = useRef<(opts?: { silent?: boolean }) => void>(() => {});
  const undoRef = useRef<() => void>(() => {});
  const redoRef = useRef<() => void>(() => {});

  /* ============================================================
     Utilitaires
     ============================================================ */
  function alignToolbarToSelection(targetId: string | null, sectionId?: string | number | null) {
    if (!targetId || typeof document === "undefined") return;
    const selectors: string[] = [];
    if (sectionId != null) {
      selectors.push(`[data-section-id="${String(sectionId)}"][data-element-id="${targetId}"]`);
    }
    selectors.push(`[data-element-id="${targetId}"]`);
    const target = selectors
      .map((selector) => document.querySelector(selector) as HTMLElement | null)
      .find(Boolean) ?? null;
    if (!target) return;
    const shell = target.closest("[data-preview-shell]") as HTMLElement | null;
    if (!shell) return;
    const shellRect = shell.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const nextX = Math.min(Math.max(targetRect.left - shellRect.left + 18, 12), Math.max(12, shellRect.width - 260));
    const nextY = Math.min(Math.max(targetRect.top - shellRect.top - 52, 12), Math.max(12, shellRect.height - 80));
    setToolbarPosition({ x: nextX, y: nextY });
    setToolbarVisible(true);
    target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }

  function getActiveHeaderThemeKey(): keyof WebsiteTheme | null {
    if (typeof document === "undefined") return null;
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement)) return null;
    const activeId = activeElement.getAttribute("data-element-id");
    if (!activeId || !HEADER_THEME_KEYS.includes(activeId as (typeof HEADER_THEME_KEYS)[number])) return null;
    return activeId as keyof WebsiteTheme;
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  function clearSelection() {
    setSelectedSectionId(null);
    setSelectedElementId(null);
    setToolbarVisible(false);
  }

  function selectSectionElement(section: Section | null, elementId: string | null = null) {
    if (!section) {
      clearSelection();
      return;
    }
    const finalElementId = elementId ?? "title";
    setEditorMode("edit");
    setSelectedSectionId(section.id ?? null);
    setSelectedElementId(finalElementId);
    setToolbarVisible(true);
    alignToolbarToSelection(finalElementId, section.id ?? null);
  }

  function cloneSections(value: Section[]): Section[] {
    return value.map((section) => ({ ...section, content: { ...section.content }, settings: { ...section.settings } }));
  }

  function pushHistory(label = "Modification") {
    const now = Date.now();
    if (now - lastHistoryAt.current > 700) {
      undoStack.current = [
        ...undoStack.current.slice(-49),
        { sections: cloneSections(sections), label },
      ];
      redoStack.current = [];
      lastHistoryAt.current = now;
      setHistoryTick((tick) => tick + 1);
    }
  }

  async function persistSectionsSnapshot(snapshot: Section[]) {
    await Promise.all(
      snapshot.filter((section) => section.id).map((section) =>
        fetch(`${API_URL}/api/v1/websites/sections/${section.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            content: section.content,
            settings: section.settings,
            visible: section.visible,
            position: section.position,
          }),
        }),
      ),
    );
  }

  function undo() {
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current.push({ sections: cloneSections(sections), label: previous.label });
    setSections(cloneSections(previous.sections));
    void persistSectionsSnapshot(previous.sections);
    setHasUnsavedChanges(true);
    setHistoryTick((tick) => tick + 1);
    showToast(`Annulé : ${previous.label}`);
  }

  function redo() {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({ sections: cloneSections(sections), label: next.label });
    setSections(cloneSections(next.sections));
    void persistSectionsSnapshot(next.sections);
    setHasUnsavedChanges(true);
    setHistoryTick((tick) => tick + 1);
    showToast(`Rétabli : ${next.label}`);
  }

  function jumpToHistory(target: EditorSnapshot) {
    const idx = undoStack.current.findIndex((s) => s === target);
    if (idx === -1) return;
    redoStack.current.push(...undoStack.current.slice(idx + 1).reverse());
    undoStack.current = undoStack.current.slice(0, idx);
    setSections(cloneSections(target.sections));
    void persistSectionsSnapshot(target.sections);
    setHasUnsavedChanges(true);
    setUndoDropdownOpen(false);
    setHistoryTick((tick) => tick + 1);
    showToast(`Retour : ${target.label}`);
  }

  /* ============================================================
     Effets
     ============================================================ */
  useEffect(() => {
    const timers = textPatchTimers.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };
  }, []);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSections(selectedPageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPageId]);

  useEffect(() => {
    if (editorMode !== "edit") return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const insideEditableTarget = target.closest("[data-section-id]") || target.closest("[role='toolbar']");
      const insideContentToolbar = target.closest("[aria-label='Mise en forme du texte']");
      if (insideEditableTarget || insideContentToolbar) return;
      clearSelection();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [editorMode]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  /* Auto-save silencieux */
  useEffect(() => {
    if (!hasUnsavedChanges) {
      if (autoSaveTimerRef.current) {
        window.clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      return;
    }
    autoSaveArmedAt.current = Date.now();
    autoSaveTimerRef.current = window.setInterval(() => {
      if (Date.now() - autoSaveArmedAt.current < 25000) return;
      void saveWebsiteRef.current({ silent: true });
    }, 30000);
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [hasUnsavedChanges]);

  /* Fermer dropdown undo au clic extérieur */
  useEffect(() => {
    if (!undoDropdownOpen) return;
    const close = () => setUndoDropdownOpen(false);
    window.addEventListener("pointerdown", close, { once: true });
    return () => window.removeEventListener("pointerdown", close);
  }, [undoDropdownOpen]);

  /* Raccourcis clavier */
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveWebsiteRef.current();
        return;
      }
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redoRef.current();
        else undoRef.current();
        return;
      }
      if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redoRef.current();
        return;
      }
      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setEditorMode((m) => (m === "edit" ? "preview" : "edit"));
        return;
      }
      if (modifier && event.key.toLowerCase() === "b") {
        event.preventDefault();
        if (event.shiftKey) setSidebarCollapsed((v) => !v);
        else formatInline("bold");
        return;
      }
      if (modifier && !event.shiftKey && ["1", "2", "3"].includes(event.key)) {
        event.preventDefault();
        setDeviceMode(event.key === "1" ? "desktop" : event.key === "2" ? "tablet" : "mobile");
        return;
      }
      if (event.key === "Escape") {
        if (inlineLinkDraft !== null) { setInlineLinkDraft(null); return; }
        if (toolbarVisible) { setToolbarVisible(false); return; }
        if (mobileSidebarOpen) { setMobileSidebarOpen(false); return; }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [inlineLinkDraft, toolbarVisible, mobileSidebarOpen]);

  /* ============================================================
     useMemo dérivés
     ============================================================ */
  const previewSections = useMemo(
    () => (sections.length > 0 ? sections : getDefaultSectionsForTemplate(siteTemplate)),
    [sections, siteTemplate],
  );
  const displaySections = useMemo(
    () => previewSections.filter((s) => s.visible !== false),
    [previewSections],
  );

  /* ============================================================
     Fetch
     ============================================================ */
  async function fetchWebsiteTheme() {
    const data = await loadWebsiteTheme();
    if (!data) return;
    setWebsiteTheme({ ...defaultTheme, ...(data.theme ?? {}) });
    setSiteTemplate(data.template || "commerce");
    setSocialLinks({
      facebook: data.settings?.social_links?.facebook ?? "",
      instagram: data.settings?.social_links?.instagram ?? "",
      linkedin: data.settings?.social_links?.linkedin ?? "",
      twitter: data.settings?.social_links?.twitter ?? "",
    });
  }

  async function fetchPages() {
    const data = await loadPages();
    if (!data) return;
    setPages(data);
    if (data.length > 0 && (!selectedPageId || !data.some((page) => page.id === selectedPageId))) {
      setSelectedPageId(data[0].id ?? null);
    }
  }

  async function fetchSections(pageId: number | null) {
    if (!pageId) {
      setSections([]);
      setSelectedSectionId(null);
      setSelectedElementId(null);
      return;
    }
    const data = await loadSections(pageId);
    if (!data) return;
    setSections(data);
    if (data.length > 0) {
      const hasSelected = selectedSectionId != null && data.some((section) => section.id === selectedSectionId);
      if (!hasSelected) {
        setSelectedSectionId(data[0].id ?? null);
        setSelectedElementId("title");
      }
    } else {
      setSelectedSectionId(null);
      setSelectedElementId(null);
    }
  }

  async function fetchProducts() {
    const data = await loadProducts();
    if (!data) return;
    setCompanyProducts(data.filter((product) => product && typeof product.name === "string"));
  }

  async function fetchMedia() {
    const data = await loadMedia();
    if (!data) return;
    setMediaItems(Array.isArray(data.media) ? data.media.filter((item) => item?.url) : []);
  }

  /* ============================================================
     Valeurs dérivées
     ============================================================ */
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null;
  const selectedSection = previewSections.find((section) => section.id === selectedSectionId) ?? null;

  const selectedThemeField: keyof WebsiteTheme | null =
    (selectedElementId && HEADER_THEME_KEYS.includes(selectedElementId as (typeof HEADER_THEME_KEYS)[number])
      ? (selectedElementId as keyof WebsiteTheme)
      : null)
    ?? getActiveHeaderThemeKey();

  function selectedTextKey(suffix: string) {
    if (!selectedElementId) return suffix;
    if (selectedThemeField) return selectedThemeField;
    if (selectedElementId === "title") return `title${suffix}`;
    if (selectedElementId === "button") return suffix === "Link" ? "buttonLink" : `button${suffix}`;
    return `text${suffix}`;
  }

  /* ============================================================
     Santé du site
     ============================================================ */
  const healthIssues = useMemo<HealthIssue[]>(() => {
    const issues: HealthIssue[] = [];
    const page = pages.find((p) => p.id === selectedPageId);
    sections.forEach((s) => {
      if (!s.content?.title && s.type !== "gallery" && s.type !== "products") {
        issues.push({ level: "warn", message: `Section « ${s.type} » sans titre`, sectionId: s.id });
      }
      if (s.type === "hero" && !s.content?.image) {
        issues.push({ level: "warn", message: "Le hero n'a pas d'image de fond", sectionId: s.id });
      }
    });
    if (!page?.meta_description) {
      issues.push({ level: "warn", message: "Meta description manquante sur cette page" });
    }
    if (!websiteTheme.primary || !websiteTheme.secondary) {
      issues.push({ level: "error", message: "Couleurs principales du thème incomplètes" });
    }
    if (urlErrors.headerCta) {
      issues.push({ level: "error", message: "Lien du bouton du header invalide" });
    }
    if (sections.length === 0) {
      issues.push({ level: "warn", message: "Cette page ne contient aucune section" });
    }
    return issues;
  }, [sections, pages, selectedPageId, websiteTheme, urlErrors]);

  /* ============================================================
     Mutations de sections
     ============================================================ */
  function commitSectionElementValue(sectionId: string | number | null, elementId: string | null, nextValue: string) {
    if (sectionId == null || !elementId) return;
    pushHistory("Édition du texte");
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? { ...section, content: { ...section.content, [elementId]: nextValue } }
          : section,
      ),
    );
    setHasUnsavedChanges(true);

    const key = `${sectionId}:${elementId}`;
    const timers = textPatchTimers.current;
    const existing = timers.get(key);
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      const targetSection = sections.find((s) => s.id === sectionId);
      const content = { ...(targetSection?.content ?? {}), [elementId]: nextValue };
      void fetch(`${API_URL}/api/v1/websites/sections/${sectionId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ content }),
      }).catch((error) => console.error("Failed to persist section value", error));
      timers.delete(key);
    }, 500);
    timers.set(key, timer);
  }

  function updateSelectedSectionField(key: string, value: string) {
    if (!selectedSection || !selectedSection.id) return;
    pushHistory(`Réglage : ${key}`);
    setSections((current) =>
      current.map((item) =>
        item.id === selectedSection.id
          ? { ...item, content: { ...item.content, [key]: value } }
          : item,
      ),
    );
    setHasUnsavedChanges(true);
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

  /* ============================================================
     Toolbar drag
     ============================================================ */
  function startToolbarDrag(event: React.PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (target && target.closest("button, select, input, label")) return;
    event.preventDefault();

    const shell = event.currentTarget.closest("[data-preview-shell]") as HTMLElement | null;
    const shellRect = shell?.getBoundingClientRect();
    toolbarDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: toolbarPosition.x,
      originY: toolbarPosition.y,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!toolbarDragRef.current) return;
      const maxX = shellRect ? Math.max(12, shellRect.width - 260) : 360;
      const maxY = shellRect ? Math.max(12, shellRect.height - 80) : 360;
      const nextX = Math.min(
        Math.max(toolbarDragRef.current.originX + (moveEvent.clientX - toolbarDragRef.current.startX), 12),
        maxX,
      );
      const nextY = Math.min(
        Math.max(toolbarDragRef.current.originY + (moveEvent.clientY - toolbarDragRef.current.startY), 12),
        maxY,
      );
      setToolbarPosition({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      toolbarDragRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  /* ============================================================
     Styles inline
     ============================================================ */
  function updateInlineTextStyle(suffix: string, value: string) {
    const selectedHeaderKey =
      (selectedElementId && HEADER_THEME_KEYS.includes(selectedElementId as (typeof HEADER_THEME_KEYS)[number])
        ? (selectedElementId as keyof WebsiteTheme)
        : null)
      ?? selectedThemeField;
    const activeThemeKey = selectedHeaderKey ?? getActiveHeaderThemeKey();

    const activeEditableTarget =
      document.activeElement instanceof HTMLElement && document.activeElement.hasAttribute("data-element-id")
        ? document.activeElement
        : null;
    const matchingTargets = selectedElementId
      ? Array.from(document.querySelectorAll(`[data-element-id="${selectedElementId}"]`)) as HTMLElement[]
      : [];
    const heroFallbackTarget =
      selectedElementId === "title" && selectedSectionId != null && String(selectedSectionId) === "default-hero"
        ? (document.querySelector('.siteHeroBlock [data-element-id="title"]') as HTMLElement | null)
        : null;
    const sectionScopedTarget = selectedSectionId != null
      ? matchingTargets.find((element) => element.getAttribute("data-section-id") === String(selectedSectionId)) ?? null
      : null;
    const fallbackTarget = heroFallbackTarget ?? matchingTargets[0] ?? null;
    const currentTarget =
      (activeEditableTarget && (!selectedElementId || activeEditableTarget.getAttribute("data-element-id") === selectedElementId || activeEditableTarget.getAttribute("data-element-id") === String(activeThemeKey)))
        ? activeEditableTarget
        : sectionScopedTarget ?? fallbackTarget ?? (activeThemeKey ? (document.querySelector(`[data-element-id="${activeThemeKey}"]`) as HTMLElement | null) : null) ?? activeEditableTarget;

    const styleKey = activeThemeKey ?? (selectedElementId ?? selectedTextKey(suffix));
    const previous = activeThemeKey ? (headerInlineStyles[styleKey] ?? {}) : (currentTarget ? (currentTarget.style as unknown as Record<string, string>) : {});
    const nextStyle: React.CSSProperties = { ...(activeThemeKey ? headerInlineStyles[styleKey] ?? {} : {}) };

    if (suffix === "Color") nextStyle.color = value;
    if (suffix === "Size") nextStyle.fontSize = sizeToCss(value, previous.fontSize ?? "1rem");
    if (suffix === "Weight") nextStyle.fontWeight = weightToCss(value, previous.fontWeight ?? 400) as React.CSSProperties["fontWeight"];
    if (suffix === "Align") nextStyle.textAlign = value as React.CSSProperties["textAlign"];
    if (suffix === "Bold") nextStyle.fontWeight = value === "true" ? 700 : previous.fontWeight ?? 400;
    if (suffix === "Italic") nextStyle.fontStyle = value === "true" ? "italic" : previous.fontStyle ?? "normal";
    if (suffix === "Underline") nextStyle.textDecoration = value === "true" ? "underline" : previous.textDecoration ?? "none";

    if (currentTarget) {
      Object.entries(nextStyle).forEach(([property, value]) => {
        if (typeof value === "string" || typeof value === "number") {
          currentTarget.style.setProperty(property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`), String(value), "important");
        }
      });
    }
    if (activeThemeKey) {
      setHeaderInlineStyles((current) => ({ ...current, [styleKey]: nextStyle }));
      if (suffix === "Color") {
        const colorKey = `${activeThemeKey}Color` as keyof WebsiteTheme;
        void updateThemeValue(colorKey, value);
      }
      return;
    }

    if (selectedSection && selectedElementId) {
      const propKey = selectedTextKey(suffix);
      if (propKey) {
        updateSelectedSectionField(propKey, value);
      }
      return;
    }

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

  /* ============================================================
     Nouveaux helpers
     ============================================================ */
  function checkUrlField(id: string, value: string) {
    const err = validateUrlValue(value);
    setUrlErrors((cur) => {
      const next = { ...cur };
      if (err) next[id] = err;
      else delete next[id];
      return next;
    });
  }

  function copySelectedStyle() {
    if (!selectedSection || !selectedElementId) return;
    const prefix =
      selectedElementId === "title" ? "title" :
      selectedElementId === "button" ? "button" : "text";
    const clip: Record<string, string> = {};
    for (const suffix of ["Size", "Weight", "Color", "Align", "Italic", "Underline"]) {
      const key = `${prefix}${suffix}`;
      const val = selectedSection.content?.[key];
      if (typeof val === "string") clip[key] = val;
    }
    if (Object.keys(clip).length === 0) {
      showToast("Aucun style à copier");
      return;
    }
    setStyleClipboard(clip);
    showToast("Style copié — sélectionnez un autre élément");
  }

  function pasteStyleToSelected() {
    if (!styleClipboard || !selectedSection?.id || !selectedElementId) return;
    pushHistory("Collage de style");
    setSections((cur) =>
      cur.map((s) =>
        s.id === selectedSection.id
          ? { ...s, content: { ...s.content, ...styleClipboard } }
          : s,
      ),
    );
    setHasUnsavedChanges(true);
    showToast("Style appliqué");
  }

  async function resetSection(sectionId: string | number | null) {
    if (sectionId == null) return;
    if (!confirm("Réinitialiser cette section à la dernière version enregistrée sur le serveur ?")) return;
    const response = await fetch(`${API_URL}/api/v1/websites/sections/${sectionId}`, {
      credentials: "include",
      headers: { Accept: "application/json", ...authHeaders() },
      cache: "no-store",
    });
    if (!response.ok) { showToast("Impossible de recharger la section"); return; }
    const fresh = (await response.json()) as Section;
    pushHistory("Réinitialisation de section");
    setSections((cur) => cur.map((s) => (s.id === sectionId ? fresh : s)));
    setHasUnsavedChanges(true);
    showToast("Section réinitialisée");
  }

  async function copySectionToPage(section: Section) {
    if (!section.id || pages.length < 2) {
      showToast("Aucune autre page disponible");
      return;
    }
    const choice = window.prompt(
      `Copier « ${String(section.content?.title ?? section.type)} » vers quelle page ?\n\n` +
        pages
          .map((p, i) => `${i + 1}. ${p.name}${p.id === selectedPageId ? " (page actuelle)" : ""}`)
          .join("\n") +
        "\n\nEntrez le numéro :",
    );
    if (!choice) return;
    const idx = parseInt(choice, 10) - 1;
    const targetPage = pages[idx];
    if (!targetPage?.id) { showToast("Page invalide"); return; }

    const response = await fetch(`${API_URL}/api/v1/websites/pages/${targetPage.id}/sections`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        type: section.type,
        visible: section.visible,
        content: section.content,
        settings: section.settings,
      }),
    });
    if (!response.ok) { showToast("Copie impossible"); return; }
    showToast(`Copié vers « ${targetPage.name} »`);
  }

  async function insertSectionAt(type: string, index: number) {
    if (!selectedPageId) { showToast("Sélectionnez une page"); return; }
    const sectionDefaults: Record<string, Record<string, unknown>> = {
      products: { title: "Nos produits", subtitle: "Choisissez vos produits…", show_price: true, show_search: true },
      testimonials: { title: "Ils nous font confiance" },
      features: { title: "Nos services" },
      faq: { title: "Questions fréquentes" },
      map: { title: "Nous trouver" },
    };
    const response = await fetch(`${API_URL}/api/v1/websites/pages/${selectedPageId}/sections`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        type,
        position: index,
        content: sectionDefaults[type] ?? { title: `Nouvelle section ${sections.length + 1}` },
        settings: {},
        visible: true,
      }),
    });
    if (!response.ok) { showToast("Insertion impossible"); return; }
    const created = (await response.json()) as Section;
    const nextSections = [...sections];
    nextSections.splice(index, 0, created);
    setSections(nextSections);
    void persistSectionOrder(nextSections);
    setSelectedSectionId(created.id ?? null);
    setSelectedElementId(null);
    setHasUnsavedChanges(true);
    showToast("Section insérée");
  }

  /* ============================================================
     Theme
     ============================================================ */
  async function updateThemeValue(key: keyof WebsiteTheme, value: string) {
    const nextTheme = { ...websiteTheme, [key]: value };
    setWebsiteTheme(nextTheme);
    setHasUnsavedChanges(true);
    const response = await fetch(`${API_URL}/api/v1/websites/current`, {
      method: "PATCH",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
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
    setHasUnsavedChanges(true);
    await fetch(`${API_URL}/api/v1/websites/current`, {
      method: "PATCH",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ theme: nextTheme }),
    }).catch((error) => console.error("Theme preset failed", error));
  }

  async function applySiteTemplate(template: (typeof siteTemplates)[number]) {
    await applyThemePreset(template.theme);
    setSiteTemplate(template.key);
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
    setHasUnsavedChanges(true);
    showToast(`Modèle « ${template.name} » appliqué`);
  }

  /* ============================================================
     Erreurs
     ============================================================ */
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

  /* ============================================================
     CRUD Pages
     ============================================================ */
  async function addPage() {
    if (!pageDraft.name.trim()) return;
    setSavingPage(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/websites/current/pages`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
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
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
    void persistPageOrder(nextPages);
  }

  function moveSection(sourceId: string | number | null, targetId: string | number | null) {
    if (sourceId == null || targetId == null || sourceId === targetId) return;
    const nextSections = [...sections];
    const sourceIndex = nextSections.findIndex((section) => section.id === sourceId);
    const targetIndex = nextSections.findIndex((section) => section.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;
    const [moved] = nextSections.splice(sourceIndex, 1);
    nextSections.splice(targetIndex, 0, moved);
    setSections(nextSections);
    setHasUnsavedChanges(true);
    void persistSectionOrder(nextSections);
  }

  async function toggleSectionVisibility(section: Section) {
    if (!section.id) return;
    const nextVisible = !section.visible;
    setSections((current) =>
      current.map((item) => (item.id === section.id ? { ...item, visible: nextVisible } : item)),
    );
    setHasUnsavedChanges(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/websites/sections/${section.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ visible: nextVisible }),
      });
      if (!response.ok) throw new Error("PATCH failed");
    } catch (error) {
      console.error(error);
      setSections((current) =>
        current.map((item) => (item.id === section.id ? { ...item, visible: !nextVisible } : item)),
      );
      showToast("Échec, rollback effectué");
    }
  }

  async function deleteSection(sectionId: string | number | null) {
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
    setHasUnsavedChanges(true);
    showToast("Section supprimée");
  }

  async function updatePageMetadata(next: Partial<PageItem>) {
    if (!selectedPageId) return;
    setPages((current) => current.map((page) => (page.id === selectedPageId ? { ...page, ...next } : page)));
    setHasUnsavedChanges(true);
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

  /* ============================================================
     Save / Discard
     ============================================================ */
  async function saveWebsite(opts: { silent?: boolean } = {}) {
    const silent = opts.silent === true;
    if (silent) setAutoSaveStatus("saving");
    else {
      setSavingSite(true);
      setSaveMessage(null);
    }
    try {
      const currentWebsiteResponse = await fetch(`${API_URL}/api/v1/websites/current`, {
        method: "PATCH",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
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
          headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
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
            headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
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
            headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
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

      setHasUnsavedChanges(false);
      setLastSavedAt(Date.now());
      setAutoSaveStatus("saved");
      if (!silent) {
        setSaveMessage("Site enregistré ✓");
        showToast("Site enregistré");
        window.setTimeout(() => setSaveMessage(null), 2500);
        window.setTimeout(() => {
          router.push("/website");
          router.refresh();
        }, 700);
      }
    } catch (error) {
      console.error(error);
      setAutoSaveStatus("error");
      if (!silent) {
        setSaveMessage(error instanceof Error ? error.message : "Échec");
        showToast("Échec de la sauvegarde");
      }
    } finally {
      if (!silent) setSavingSite(false);
    }
  }

  saveWebsiteRef.current = saveWebsite;
  undoRef.current = undo;
  redoRef.current = redo;

  async function discardChanges() {
    if (!confirm("Annuler toutes les modifications non sauvegardées ?")) return;
    setSaveMessage(null);
    await fetchWebsiteTheme();
    await fetchPages();
    if (selectedPageId) await fetchSections(selectedPageId);
    setHasUnsavedChanges(false);
    showToast("Modifications annulées");
  }

  /* ============================================================
     Valeurs dérivées header
     ============================================================ */
  const currentSiteSlug = pageDraft.slug || pages.find((page) => page.id === selectedPageId)?.slug || "preview";
  const organizationName = organizationProfile?.name?.trim() || "Votre entreprise";
  const organizationLogo = organizationProfile?.logo || "";
  const headerBrandText = websiteTheme.headerBrand?.trim() || organizationName;
  const headerHomeText = websiteTheme.headerHome?.trim() || "Accueil";
  const headerAboutText = websiteTheme.headerAbout?.trim() || "À propos";
  const headerProductsText = websiteTheme.headerProducts?.trim() || "Produits";
  const headerServicesText = websiteTheme.headerServices?.trim() || "Services";
  const headerContactText = websiteTheme.headerContact?.trim() || "Contact";
  const headerCtaText = (() => {
    const value = websiteTheme.headerCta?.trim() ?? "";
    if (!value) return "Contactez-nous";
    if (/^(?:https?:|mailto:|tel:|#|\/)/i.test(value)) return "Contactez-nous";
    if (value.includes("/") && !value.includes(" ")) return "Contactez-nous";
    if (value.includes("/") && value.split("/")[0]?.trim()) return value.split("/")[0].trim();
    return value;
  })();
  const headerStyleFor = (key: keyof WebsiteTheme): React.CSSProperties | undefined => {
    const savedColor = websiteTheme[`${String(key)}Color` as keyof WebsiteTheme];
    const localStyle = headerInlineStyles[String(key)];
    if (!savedColor && !localStyle) return undefined;
    return { ...localStyle, ...(savedColor ? { color: savedColor } : {}) };
  };

  /* ============================================================
     Loading
     ============================================================ */
  if (!isReady) {
    return (
      <AppShell>
        <div style={{ padding: 24, color: "#111827" }}>Chargement de l&apos;éditeur…</div>
      </AppShell>
    );
  }

  const previewMaxWidth =
    deviceMode === "mobile" ? "430px" : deviceMode === "tablet" ? "900px" : "100%";

  const filteredLibrary = editorLibrary.filter(
    (item) =>
      !blockSearch ||
      item.label.toLowerCase().includes(blockSearch.toLowerCase()) ||
      item.type.toLowerCase().includes(blockSearch.toLowerCase()),
  );

  /* ============================================================
     JSX
     ============================================================ */
  return (
    <AppShell>
      <div
        className={`${styles.editorShell} ${previewStyles.themeRoot}`}
        data-ui-theme={darkMode ? "dark" : "light"}
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

        <div className={styles.editorLayout} data-collapsed={sidebarCollapsed || undefined}>
          <aside
            className={`${styles.panel} ${styles.sidebar}`}
            data-mobile-open={mobileSidebarOpen || undefined}
          >
            {/* Brand */}
            <div className={styles.sidebarBrand}>
              <div className={styles.sidebarBrandIcon}>
                <LayoutGrid size={16} />
              </div>
              <div className={styles.sidebarBrandText}>
                <strong>Éditeur</strong>
                <span>{selectedPage?.name ?? "Aucune page"}</span>
              </div>
              {hasUnsavedChanges && (
                <span className={styles.unsavedBadge} title="Modifications non sauvegardées" aria-label="Modifications non sauvegardées">●</span>
              )}
              <button
                type="button"
                className={styles.sidebarCloseMobile}
                onClick={() => setSidebarCollapsed((v) => !v)}
                aria-label={sidebarCollapsed ? "Afficher le panneau" : "Masquer le panneau"}
                title={sidebarCollapsed ? "Afficher (⇧⌘B)" : "Masquer (⇧⌘B)"}
              >
                {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
              <button
                type="button"
                className={styles.sidebarCloseMobile}
                onClick={() => setDarkMode((v) => !v)}
                aria-label={darkMode ? "Thème clair" : "Thème sombre"}
                title={darkMode ? "Thème clair" : "Thème sombre"}
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                type="button"
                className={styles.sidebarCloseMobile}
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Actions */}
            <div className={styles.sidebarActions}>
              <div className={styles.deviceRow}>
                {(["desktop", "tablet", "mobile"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`${styles.deviceIconButton} ${deviceMode === mode ? styles.deviceIconButtonActive : ""}`}
                    onClick={() => setDeviceMode(mode)}
                    title={mode === "desktop" ? "Ordinateur (⌘1)" : mode === "tablet" ? "Tablette (⌘2)" : "Mobile (⌘3)"}
                  >
                    {mode === "desktop" ? <Monitor size={14} /> : mode === "tablet" ? <LayoutGrid size={14} /> : <Smartphone size={14} />}
                  </button>
                ))}
                <div className={styles.deviceSpacer} />
                <button
                  type="button"
                  className={`${styles.modeToggle} ${editorMode === "edit" ? styles.modeToggleActive : ""}`}
                  onClick={() => setEditorMode((m) => (m === "edit" ? "preview" : "edit"))}
                  title={editorMode === "edit" ? "Passer en preview (⌘K)" : "Revenir à l'édition (⌘K)"}
                >
                  {editorMode === "edit" ? <Eye size={13} /> : <Type size={13} />}
                  {editorMode === "edit" ? "Édition" : "Preview"}
                </button>
              </div>

              <div className={styles.saveRow}>
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    className={styles.deviceIconButton}
                    onClick={() => setUndoDropdownOpen((v) => !v)}
                    disabled={undoStack.current.length === 0}
                    title="Historique (⌘Z)"
                    aria-label="Historique"
                  >
                    <History size={14} />
                  </button>
                  {undoDropdownOpen && (
                    <div className={styles.undoDropdown} onPointerDown={(e) => e.stopPropagation()}>
                      <div className={styles.undoDropdownHeader}>Historique récent</div>
                      {undoStack.current.length === 0 ? (
                        <div className={styles.undoDropdownEmpty}>Aucune action</div>
                      ) : (
                        undoStack.current
                          .slice(-10)
                          .reverse()
                          .map((snap, i) => (
                            <button
                              key={`${snap.label}-${i}`}
                              type="button"
                              className={styles.undoDropdownItem}
                              onClick={() => jumpToHistory(snap)}
                            >
                              <Undo2 size={12} /> {snap.label}
                            </button>
                          ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.deviceIconButton}
                  onClick={undo}
                  disabled={undoStack.current.length === 0}
                  title="Annuler (⌘Z)"
                  aria-label="Annuler"
                >
                  <Undo2 size={14} />
                </button>
                <button
                  type="button"
                  className={styles.deviceIconButton}
                  onClick={redo}
                  disabled={redoStack.current.length === 0}
                  title="Rétablir (⌘⇧Z)"
                  aria-label="Rétablir"
                >
                  <Redo2 size={14} />
                </button>
                <a
                  className={styles.deviceIconButton}
                  href={`/site/${currentSiteSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Voir le site public"
                  aria-label="Voir le site public"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => void discardChanges()}
                  title="Annuler toutes les modifications"
                >
                  <X size={13} />
                </button>
                <button
                  type="button"
                  className={styles.saveButtonPrimary}
                  onClick={() => void saveWebsite()}
                  disabled={savingSite}
                  title="Sauvegarder (⌘S)"
                >
                  <Save size={14} /> {savingSite ? "…" : "Sauver"}
                </button>
              </div>
              {saveMessage ? <div className={styles.saveToast}>{saveMessage}</div> : null}
              {autoSaveStatus === "saving" && (
                <div className={styles.autoSaveHint}>Sauvegarde auto…</div>
              )}
              {autoSaveStatus === "saved" && lastSavedAt && (
                <div className={styles.autoSaveHint}>
                  Sauvegardé {formatRelativeTime(lastSavedAt)}
                </div>
              )}
              <div className={styles.shortcutsHint} aria-hidden>
                <span>⌘S sauver</span>
                <span>⌘Z annuler</span>
                <span>⌘K preview</span>
              </div>
            </div>

            {/* Santé du site */}
            <button
              type="button"
              className={styles.healthToggle}
              onClick={() => setHealthPanelOpen((v) => !v)}
              data-has-issues={healthIssues.length > 0 || undefined}
            >
              {healthIssues.length === 0 ? (
                <CheckCircle2 size={13} />
              ) : (
                <AlertTriangle size={13} />
              )}
              <span>Santé du site</span>
              <span className={styles.healthCount}>{healthIssues.length}</span>
            </button>
            {healthPanelOpen && (
              <div className={styles.healthPanel}>
                {healthIssues.length === 0 ? (
                  <div className={styles.healthOk}>
                    <CheckCircle2 size={16} />
                    <span>Tout est bon !</span>
                  </div>
                ) : (
                  healthIssues.map((issue, i) => (
                    <button
                      key={i}
                      type="button"
                      className={styles.healthIssue}
                      data-level={issue.level}
                      onClick={() => {
                        if (issue.sectionId != null) {
                          const s = sections.find((x) => x.id === issue.sectionId);
                          if (s) selectSectionElement(s, "title");
                        }
                      }}
                    >
                      <AlertTriangle size={12} />
                      <span>{issue.message}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Accordéons */}
            <div className={styles.accordionStack}>
              {/* -------- Pages -------- */}
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
                    <div className={styles.emptyHint}>Aucune page pour l&apos;instant.</div>
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

              {/* -------- Blocs -------- */}
              <Accordion
                id="blocks"
                title="Blocs"
                icon={<LayoutGrid size={14} />}
                badge={sections.length}
                open={openAccordion === "blocks"}
                onToggle={() => setOpenAccordion((c) => (c === "blocks" ? null : "blocks"))}
              >
                <div className={styles.sectionLibrary}>
                  <div className={styles.blockSearchWrap}>
                    <Search size={13} className={styles.blockSearchIcon} />
                    <input
                      className={styles.blockSearchInput}
                      placeholder="Rechercher un bloc…"
                      value={blockSearch}
                      onChange={(e) => setBlockSearch(e.target.value)}
                    />
                  </div>
                  <div className={styles.sectionGrid}>
                    {filteredLibrary.length === 0 ? (
                      <div className={styles.emptyHint} style={{ gridColumn: "1 / -1" }}>
                        Aucun bloc correspondant.
                      </div>
                    ) : (
                      filteredLibrary.map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => void addSection(item.type)}
                          className={styles.sectionButton}
                        >
                          <span className={styles.sectionIcon}>{item.icon}</span>
                          {item.label}
                        </button>
                      ))
                    )}
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
                        <div key={section.id ?? `s-${index}`}>
                          <div
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
                                void copySectionToPage(section);
                              }}
                              className={styles.sectionItemIcon}
                              title="Copier vers une autre page"
                            >
                              <ExternalLink size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void resetSection(section.id ?? null);
                              }}
                              className={styles.sectionItemIcon}
                              title="Réinitialiser depuis le serveur"
                            >
                              <RotateCcw size={13} />
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
                          <div
                            className={styles.insertionPoint}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => void insertSectionAt("text", index + 1)}
                            title="Insérer un bloc ici"
                          >
                            <Plus size={10} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Accordion>

              {/* -------- Style -------- */}
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
                            onChange={(e) => {
                              updateSelectedSectionField("buttonLink", e.target.value);
                              checkUrlField(`buttonLink:${selectedSection.id}`, e.target.value);
                            }}
                            onBlur={(e) => checkUrlField(`buttonLink:${selectedSection.id}`, e.target.value)}
                            data-invalid={urlErrors[`buttonLink:${selectedSection.id}`] ? true : undefined}
                          />
                          {urlErrors[`buttonLink:${selectedSection.id}`] && (
                            <span className={styles.urlFieldError}>
                              {urlErrors[`buttonLink:${selectedSection.id}`]}
                            </span>
                          )}
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
                    Sélectionnez une section dans l&apos;aperçu pour modifier son contenu.
                  </div>
                )}
              </Accordion>

              {/* -------- Contact -------- */}
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

              {/* -------- Thème -------- */}
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
                          onChange={(event) => {
                            void updateThemeValue(key, event.target.value);
                            if (key === "headerCta") checkUrlField("headerCta", event.target.value);
                          }}
                          onBlur={(event) => key === "headerCta" && checkUrlField("headerCta", event.target.value)}
                          data-invalid={urlErrors[key] ? true : undefined}
                        />
                        {urlErrors[key] && (
                          <span className={styles.urlFieldError}>{urlErrors[key]}</span>
                        )}
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

          {/* -------- Preview -------- */}
          <main className={`${styles.panel} ${styles.previewPanel}`}>
            <div className={styles.previewContent}>
              <div
                className={previewStyles.sitePreviewShell}
                data-preview-shell
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
                {editorMode === "edit" && toolbarVisible && ((selectedSectionId && selectedElementId) || selectedThemeField) && (
                  <div
                    className={styles.inlineTextToolbar}
                    role="toolbar"
                    aria-label="Mise en forme du texte"
                    style={{ left: toolbarPosition.x, top: toolbarPosition.y }}
                    onPointerDown={startToolbarDrag}
                  >
                    <button type="button" className={styles.inlineToolbarDragHandle} aria-label="Déplacer la barre d’édition" title="Déplacer la barre d’édition">
                      ⋮⋮
                    </button>
                    <button type="button" className={styles.inlineToolbarClose} onClick={() => setToolbarVisible(false)} aria-label="Fermer la barre d’édition" title="Fermer la barre d’édition (Esc)">×</button>
                    <span className={styles.inlineToolbarLabel}>Texte</span>
                    {selectedThemeField && (
                      <input
                        type="text"
                        className={styles.inlineTextInput}
                        value={String(websiteTheme[selectedThemeField] ?? "")}
                        placeholder="Texte"
                        aria-label="Texte de l'élément sélectionné"
                        onPointerDown={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          void updateThemeValue(selectedThemeField, event.target.value);
                        }}
                      />
                    )}
                    <button
                      type="button"
                      className={styles.inlineToolbarButton}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={copySelectedStyle}
                      title="Copier le style"
                      aria-label="Copier le style"
                    >
                      <Paintbrush size={13} />
                    </button>
                    {styleClipboard && (
                      <button
                        type="button"
                        className={styles.inlineToolbarButton}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={pasteStyleToSelected}
                        title="Coller le style"
                        aria-label="Coller le style"
                      >
                        <ClipboardPaste size={13} />
                      </button>
                    )}
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
                          const nextColor = event.target.value;
                          setInlineTextColor(nextColor);
                          const directTarget =
                            (selectedElementId
                              ? Array.from(document.querySelectorAll(`[data-element-id="${selectedElementId}"]`)) as HTMLElement[]
                              : [])
                              .find((element) => selectedSectionId == null || element.getAttribute("data-section-id") === String(selectedSectionId))
                            ?? (document.activeElement instanceof HTMLElement && document.activeElement.hasAttribute("data-element-id") ? document.activeElement : null)
                            ?? (selectedElementId ? document.querySelector(`[data-element-id="${selectedElementId}"]`) as HTMLElement | null : null);
                          if (directTarget) {
                            directTarget.style.setProperty("color", nextColor, "important");
                          }
                          updateInlineTextStyle("Color", nextColor);
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
                    {editorMode === "edit" ? (
                      <EditableText
                        as="span"
                        value={headerBrandText}
                        editable
                        data-section-id="header-brand"
                        data-element-id="headerBrand"
                        data-editor-type="text"
                        onCommit={(next) => void updateThemeValue("headerBrand", next || organizationName)}
                        onSelect={() => {
                          setEditorMode("edit");
                          setSelectedSectionId(null);
                          setSelectedElementId("headerBrand");
                          setToolbarVisible(true);
                          alignToolbarToSelection("headerBrand");
                        }}
                        className={previewStyles.editableText}
                        style={headerStyleFor("headerBrand")}
                      />
                    ) : (
                      <span>{headerBrandText}</span>
                    )}
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
                    {[
                      ["headerHome", headerHomeText, "#"],
                      ["headerAbout", headerAboutText, "#"],
                      ["headerProducts", headerProductsText, "#"],
                      ["headerServices", headerServicesText, "#"],
                      ["headerContact", headerContactText, "#contact"],
                    ].map(([key, label, href]) => (
                      <a key={key} href={href}>
                        {editorMode === "edit" ? (
                          <EditableText
                            as="span"
                            value={String(label)}
                            editable
                            data-section-id={`header-${String(key)}`}
                            data-element-id={String(key)}
                            data-editor-type="text"
                            onCommit={(next) => void updateThemeValue(key as keyof WebsiteTheme, next || String(label))}
                            onSelect={() => {
                              setEditorMode("edit");
                              setSelectedSectionId(null);
                              setSelectedElementId(key as keyof WebsiteTheme);
                              setToolbarVisible(true);
                              alignToolbarToSelection(String(key));
                            }}
                            className={previewStyles.editableText}
                            style={headerStyleFor(key as keyof WebsiteTheme)}
                          />
                        ) : (
                          <span>{label}</span>
                        )}
                      </a>
                    ))}
                  </nav>
                  <button type="button" className={previewStyles.siteHeaderButton} onClick={() => setPreviewMenuOpen(false)}>
                    {editorMode === "edit" ? (
                      <EditableText
                        as="span"
                        value={headerCtaText}
                        editable
                        data-section-id="header-cta"
                        data-element-id="headerCta"
                        data-editor-type="text"
                        onCommit={(next) => void updateThemeValue("headerCta", next || "Contactez-nous")}
                        onSelect={() => {
                          setEditorMode("edit");
                          setSelectedSectionId(null);
                          setSelectedElementId("headerCta");
                          setToolbarVisible(true);
                          alignToolbarToSelection("headerCta");
                        }}
                        className={previewStyles.editableText}
                        style={headerStyleFor("headerCta")}
                      />
                    ) : (
                      <span>{headerCtaText}</span>
                    )}
                  </button>
                </header>

                <main className={previewStyles.siteBody}>
                  <div className={previewStyles.siteMainContent}>
                    <SiteSections
                      sections={displaySections}
                      products={companyProducts}
                      siteName={organizationProfile?.name || "Votre entreprise"}
                      textColor={websiteTheme.text ?? "#111827"}
                      secondaryTextColor={websiteTheme.secondaryText ?? "#475569"}
                      primaryColor={websiteTheme.primary ?? "#111827"}
                      secondaryColor={websiteTheme.secondary ?? "#714B67"}
                      slug={currentSiteSlug}
                      fontFamily={websiteTheme.font ?? "Inter, sans-serif"}
                      editable={editorMode === "edit"}
                      selectedSectionId={selectedSectionId}
                      onSelectSection={selectSectionElement}
                      onTextChange={(section, elementId, nextValue) => {
                        setHasUnsavedChanges(true);
                        commitSectionElementValue(section.id ?? null, elementId, nextValue);
                      }}
                    />
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