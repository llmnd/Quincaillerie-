"use client";

import { useMemo, useState } from "react";

type Product = {
  id?: number;
  name?: string;
  description?: string | null;
  price?: number | string | null;
  image?: string | null;
  category?: string | null;
};

type ProductCatalogProps = Readonly<{
  products: Product[];
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  secondaryTextColor: string;
  phone?: string | null;
}>;

function formatPrice(value: Product["price"]): string {
  if (typeof value === "number") return `${value.toLocaleString("fr-FR")} FCFA`;
  return value ? String(value) : "Prix sur demande";
}

export default function ProductCatalog({
  products,
  primaryColor,
  secondaryColor,
  textColor,
  secondaryTextColor,
  phone,
}: ProductCatalogProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [cart, setCart] = useState<Product[]>([]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return products;
    return products.filter((product) =>
      [product.name, product.category, product.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [products, query]);

  function addToRequest(product: Product) {
    setCart((current) => current.some((item) => item.id === product.id) ? current : [...current, product]);
  }

  const phoneHref = phone ? `tel:${phone.replace(/[^+\d]/g, "")}` : "#contact";
  const requestText = cart.length
    ? `Bonjour, je souhaite commander : ${cart.map((item) => item.name).join(", ")}.`
    : "Bonjour, je souhaite obtenir des informations sur vos produits.";

  return (
    <section id="produits" style={{ padding: "52px 0 30px" }}>
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <p style={{ margin: 0, color: secondaryColor, fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>Catalogue</p>
          <h2 style={{ margin: "8px 0 6px", color: textColor, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", lineHeight: 1.05 }}>Nos produits</h2>
          <p style={{ margin: 0, color: secondaryTextColor }}>Choisissez vos produits et envoyez votre demande directement à l&apos;entreprise.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un produit"
            aria-label="Rechercher un produit"
            style={{ width: 230, border: "1px solid rgba(15,23,42,.14)", borderRadius: 12, padding: "11px 13px", color: textColor, background: "#fff" }}
          />
          <a href={phoneHref} style={{ borderRadius: 12, padding: "11px 15px", background: secondaryColor, color: textColor, textDecoration: "none", fontWeight: 800 }}>
            {phone ? `Appeler ${phone}` : "Nous contacter"}
          </a>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div style={{ border: "1px dashed rgba(15,23,42,.2)", borderRadius: 18, padding: 40, textAlign: "center", color: secondaryTextColor }}>Aucun produit ne correspond à votre recherche.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          {filteredProducts.map((product, index) => (
            <article key={product.id ?? `${product.name}-${index}`} style={{ overflow: "hidden", border: "1px solid rgba(15,23,42,.1)", borderRadius: 20, background: "#fff", boxShadow: "0 14px 34px rgba(15,23,42,.06)" }}>
              <button type="button" onClick={() => setSelected(product)} style={{ display: "block", width: "100%", padding: 0, border: 0, background: "transparent", textAlign: "left", cursor: "pointer" }}>
                <div style={{ height: 190, display: "grid", placeItems: "center", background: "linear-gradient(135deg, #f8fafc, #e2e8f0)", color: secondaryTextColor, fontWeight: 800 }}>
                  {product.image ? <img src={product.image} alt={product.name ?? "Produit"} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Produit"}
                </div>
                <div style={{ padding: 18 }}>
                  <span style={{ color: secondaryColor, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>{product.category || "Référence"}</span>
                  <h3 style={{ margin: "9px 0 7px", color: textColor, fontSize: 20 }}>{product.name || "Produit"}</h3>
                  <p style={{ minHeight: 48, margin: 0, color: secondaryTextColor, lineHeight: 1.55 }}>{product.description || "Produit disponible sur demande."}</p>
                  <strong style={{ display: "block", marginTop: 14, color: primaryColor, fontSize: 18 }}>{formatPrice(product.price)}</strong>
                </div>
              </button>
              <div style={{ display: "flex", gap: 8, padding: "0 18px 18px" }}>
                <button type="button" onClick={() => setSelected(product)} style={{ flex: 1, border: `1px solid ${primaryColor}`, borderRadius: 10, padding: "10px 12px", background: "transparent", color: primaryColor, fontWeight: 800, cursor: "pointer" }}>Voir le produit</button>
                <button type="button" onClick={() => addToRequest(product)} style={{ flex: 1, border: 0, borderRadius: 10, padding: "10px 12px", background: primaryColor, color: textColor, fontWeight: 800, cursor: "pointer" }}>Commander</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {cart.length > 0 && (
        <aside style={{ position: "sticky", bottom: 18, zIndex: 2, marginTop: 24, padding: 18, borderRadius: 18, background: textColor, color: "#fff", boxShadow: "0 18px 40px rgba(15,23,42,.2)" }}>
          <strong>{cart.length} produit{cart.length > 1 ? "s" : ""} dans votre demande</strong>
          <span style={{ display: "block", marginTop: 5, opacity: .75 }}>{cart.map((item) => item.name).join(" · ")}</span>
          <a href={`${phoneHref}?text=${encodeURIComponent(requestText)}`} style={{ display: "inline-block", marginTop: 12, borderRadius: 10, padding: "10px 14px", background: secondaryColor, color: textColor, textDecoration: "none", fontWeight: 800 }}>Appeler pour commander</a>
        </aside>
      )}

      {selected && (
        <dialog open aria-label={selected.name} style={{ position: "fixed", inset: 0, zIndex: 50, width: "100%", maxWidth: "none", height: "100%", border: 0, padding: 20, background: "rgba(15,23,42,.48)" }}>
          <div style={{ width: "min(620px, 100%)", maxHeight: "90vh", overflow: "auto", margin: "0 auto", borderRadius: 22, background: "#fff", padding: 24, color: textColor }}>
            <button type="button" onClick={() => setSelected(null)} aria-label="Fermer" style={{ float: "right", border: 0, background: "transparent", color: secondaryTextColor, fontSize: 22, cursor: "pointer" }}>×</button>
            <p style={{ margin: 0, color: secondaryColor, fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>{selected.category || "Référence"}</p>
            <h2 style={{ margin: "8px 0 10px", fontSize: 30 }}>{selected.name}</h2>
            {selected.image ? <img src={selected.image} alt={selected.name} style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 16 }} /> : null}
            <p style={{ color: secondaryTextColor, lineHeight: 1.7 }}>{selected.description || "Produit disponible sur demande."}</p>
            <strong style={{ display: "block", margin: "14px 0", fontSize: 22, color: primaryColor }}>{formatPrice(selected.price)}</strong>
            <button type="button" onClick={() => { addToRequest(selected); setSelected(null); }} style={{ border: 0, borderRadius: 12, padding: "12px 18px", background: primaryColor, color: textColor, fontWeight: 800, cursor: "pointer" }}>Ajouter à ma demande</button>
          </div>
        </dialog>
      )}
    </section>
  );
}
