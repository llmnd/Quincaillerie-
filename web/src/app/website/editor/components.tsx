"use client";

import { useEffect, useRef, useState } from "react";
import type { HTMLAttributes, CSSProperties, ElementType, FocusEvent, FormEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import {
  ChevronRight,
  FileText,
  FolderPlus,
  Globe,
  ImageIcon,
  LayoutGrid,
  Monitor,
  Phone,
  Settings2,
  Type,
  X,
} from "lucide-react";
import { sanitizeInlineHtml } from "../_shared/SiteSections";
import styles from "./page.module.css";
import { uploadWebsiteMedia } from "./lib/media";

export const editorLibrary = [
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
/* ============================================================
   EditableText
   ============================================================ */
export function EditableText({
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
  style?: CSSProperties;
  onSelect?: () => void;
  onDoubleClick?: () => void;
  link?: string;
  onCommit?: (nextValue: string) => void;
  onHoverChange?: (hovering: boolean) => void;
} & HTMLAttributes<HTMLElement>) {
  const Tag = as as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const isFocusedRef = useRef(false);
  const [, setLocalHtml] = useState<string | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || isFocusedRef.current) return;
    const nextHtml = htmlValue ? sanitizeInlineHtml(htmlValue) : "";
    if (nextHtml) {
      if (node.innerHTML !== nextHtml) node.innerHTML = nextHtml;
    } else if (node.textContent !== value) {
      node.textContent = value;
    }
    setLocalHtml(null);
  }, [htmlValue, value]);

  return (
    <Tag
      {...props}
      ref={ref}
      className={className}
      style={style}
      contentEditable={editable}
      suppressContentEditableWarning
      spellCheck={false}
      onMouseDown={(event: MouseEvent<HTMLElement>) => {
        if (!editable) return;
        event.stopPropagation();
        onSelect?.();
      }}
      onFocus={() => {
        isFocusedRef.current = true;
        onSelect?.();
      }}
      onDoubleClick={(event: MouseEvent<HTMLElement>) => {
        if (editable) {
          event.stopPropagation();
          onSelect?.();
        }
        onDoubleClick?.();
      }}
      onClick={(event: MouseEvent<HTMLElement>) => {
        if (editable) {
          event.stopPropagation();
          onSelect?.();
          return;
        }
        if (!link) return;
        event.preventDefault();
        window.open(link, "_blank", "noopener,noreferrer");
      }}
      onBlur={(event: FocusEvent<HTMLElement>) => {
        isFocusedRef.current = false;
        const raw = event.currentTarget.innerHTML;
        const next = raw.trim() ? sanitizeInlineHtml(raw) : value;
        if (next !== value) onCommit?.(next);
        if (event.currentTarget.innerHTML !== next) event.currentTarget.innerHTML = next;
        setLocalHtml(null);
      }}
      onInput={(event: FormEvent<HTMLElement>) => {
        const next = sanitizeInlineHtml(event.currentTarget.innerHTML);
        setLocalHtml(next);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
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
export function Accordion({
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
  icon: ReactNode;
  badge?: string | number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
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
export function ThemeColorInput({
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
export function Segmented<T extends { key: string; label: string; cls?: string }>({
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
export function ImagePicker({
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
