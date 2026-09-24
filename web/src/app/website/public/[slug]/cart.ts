export type CartProduct = {
  id?: number;
  name?: string;
  description?: string | null;
  price?: number | string | null;
  image?: string | null;
  image_url?: string | null;
  category?: string | null;
};

export type CartLine = {
  product: CartProduct;
  quantity: number;
};

const STORAGE_KEY = (slug: string) => `website-cart:${slug}`;

/* =========================================================================
   LECTURE
   ========================================================================= */
export function readCart(slug: string): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (line): line is CartLine =>
        !!line &&
        typeof line === "object" &&
        !!line.product &&
        typeof line.quantity === "number"
    );
  } catch {
    return [];
  }
}

/* =========================================================================
   ÉCRITURE — PURE (pas d'événement, pas de side-effect cross-component)
   ========================================================================= */
export function writeCart(slug: string, lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY(slug), JSON.stringify(lines));
  } catch {
    /* quota exceeded ou storage désactivé — on ignore silencieusement */
  }
}

/* =========================================================================
   NOTIFICATION — à appeler explicitement depuis les event handlers
   ========================================================================= */
export function notifyCartUpdated(
  slug: string,
  kind: "added" | "updated" = "updated"
): void {
  if (typeof window === "undefined") return;
  const eventName =
    kind === "added" ? "website-cart-added" : "website-cart-updated";
  window.dispatchEvent(new CustomEvent(eventName, { detail: { slug } }));
}

/* =========================================================================
   VIDER
   ========================================================================= */
export function clearCart(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY(slug));
  } catch {
    /* ignore */
  }
}