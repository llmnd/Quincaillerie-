import { safeLocal } from "../../../../lib/safeStorage";

export type Product = {
  id?: number;
  name?: string;
  description?: string | null;
  price?: number | string | null;
  image?: string | null;
  image_url?: string | null;
  category?: string | null;
};

export type CartLine = {
  product: Product;
  quantity: number;
};

export const cartStorageKey = (slug: string) => `website-cart:${slug}`;

export function readCart(slug: string): CartLine[] {
  try {
    const raw = safeLocal.get(cartStorageKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCart(slug: string, cart: CartLine[]) {
  try {
    safeLocal.set(cartStorageKey(slug), JSON.stringify(cart));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("website-cart-updated", { detail: { slug } }));
    }
  } catch {
    // Storage can be blocked by browser tracking prevention.
  }
}
