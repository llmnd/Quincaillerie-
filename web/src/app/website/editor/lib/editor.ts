import type { CSSProperties } from "react";
import type { WebsiteTheme } from "../types";

export const HEADER_THEME_KEYS = [
  "headerBrand",
  "headerHome",
  "headerAbout",
  "headerProducts",
  "headerServices",
  "headerContact",
  "headerCta",
] as const;

export const defaultTheme: WebsiteTheme = {
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

export const themePresets = [
  { name: "Slate", primary: "#0f172a", secondary: "#0ea5a4", background: "#ffffff", text: "#0f172a" },
  { name: "Plum", primary: "#1e1b4b", secondary: "#714b67", background: "#faf5ff", text: "#1e1b4b" },
  { name: "Ember", primary: "#7c2d12", secondary: "#ea580c", background: "#fffbeb", text: "#7c2d12" },
  { name: "Forest", primary: "#14532d", secondary: "#16a34a", background: "#f0fdf4", text: "#14532d" },
  { name: "Ocean", primary: "#0c4a6e", secondary: "#0ea5e9", background: "#f0f9ff", text: "#0c4a6e" },
  { name: "Midnight", primary: "#f8fafc", secondary: "#0ea5a4", background: "#0f172a", text: "#f8fafc" },
];

export const siteTemplates = [
  { key: "commerce", name: "Boutique", description: "Catalogue et demandes de panier", theme: themePresets[0] },
  { key: "services", name: "Services", description: "Présentation d'une activité", theme: themePresets[3] },
  { key: "portfolio", name: "Portfolio", description: "Images et réalisations", theme: themePresets[4] },
  { key: "restaurant", name: "Restaurant", description: "Menu et contact rapide", theme: themePresets[2] },
];

export const SIZE_OPTIONS = [
  { key: "sm", label: "S", css: "0.875rem", cls: "size-s" },
  { key: "md", label: "M", css: "1rem", cls: "size-m" },
  { key: "lg", label: "L", css: "1.25rem", cls: "size-l" },
  { key: "xl", label: "XL", css: "1.75rem", cls: "size-xl" },
  { key: "2xl", label: "2XL", css: "2.5rem", cls: "size-2xl" },
] as const;

export const WEIGHT_OPTIONS = [
  { key: "light", label: "Léger", css: 300, cls: "weight-light" },
  { key: "normal", label: "Normal", css: 400, cls: "weight-normal" },
  { key: "medium", label: "Médium", css: 500, cls: "weight-medium" },
  { key: "semibold", label: "Semi", css: 600, cls: "weight-semibold" },
  { key: "bold", label: "Gras", css: 700, cls: "weight-bold" },
] as const;

export function sizeToCss(key: string | undefined, fallback: string | number = ""): string | number {
  return SIZE_OPTIONS.find((size) => size.key === key)?.css ?? fallback;
}

export function weightToCss(key: string | undefined, fallback: string | number = ""): string | number {
  return WEIGHT_OPTIONS.find((weight) => weight.key === key)?.css ?? fallback;
}

export function sectionSpacingStyle(content: Record<string, unknown>): CSSProperties {
  const value = (key: string, fallback: number) => {
    const parsed = Number(content[key]);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(96, parsed)) : fallback;
  };
  return {
    "--section-padding-desktop": `${value("spacingDesktop", 20)}px ${value("spacingHorizontal", 22)}px`,
    "--section-padding-tablet": `${value("spacingTablet", 16)}px ${value("spacingHorizontalTablet", 18)}px`,
    "--section-padding-mobile": `${value("spacingMobile", 14)}px ${value("spacingHorizontalMobile", 14)}px`,
    "--section-gap": `${value("elementGap", 12)}px`,
  } as CSSProperties;
}

export function validateUrlValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(?:https?:\/\/|mailto:|tel:|#|\/)/i.test(trimmed)) return null;
  return "URL invalide — utilisez http://, https://, mailto:, tel:, # ou /";
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 5) return "à l'instant";
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  return new Date(timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
