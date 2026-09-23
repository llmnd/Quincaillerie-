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

type CartLine = {
  product: Product;
  quantity: number;
};

type CustomerDetails = {
  name: string;
  phone: string;
  address: string;
  note: string;
};

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
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerDetails>({ name: "", phone: "", address: "", note: "" });

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
    setCart((current) => {
      if (current.some((line) => line.product.id === product.id)) {
        return current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line);
      }
      return [...current, { product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: Product["id"], delta: number) {
    setCart((current) => current
      .map((line) => line.product.id === productId ? { ...line, quantity: line.quantity + delta } : line)
      .filter((line) => line.quantity > 0));
  }

  const phoneNumber = phone?.replace(/[^+\d]/g, "") ?? "";
  const phoneHref = phoneNumber ? `tel:${phoneNumber}` : "#contact";
  const productSummary = cart.map((line) => `${line.product.name} x${line.quantity}`).join(", ");
  const requestText = [
    "Bonjour, je souhaite passer une commande.",
    `Nom : ${customer.name}`,
    `Téléphone : ${customer.phone}`,
    `Adresse : ${customer.address}`,
    `Produits : ${productSummary}`,
    customer.note ? `Note : ${customer.note}` : "",
  ].filter(Boolean).join("\n");
  const whatsappHref = phoneNumber ? `https://wa.me/${phoneNumber.replace(/^\+/, "")}?text=${encodeURIComponent(requestText)}` : "#contact";

  function submitOrder(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim() || !phoneNumber) return;
    window.location.href = whatsappHref;
  }

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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {filteredProducts.map((product, index) => (
            <article key={product.id ?? `${product.name}-${index}`} style={{ overflow: "hidden", border: "1px solid rgba(15,23,42,.1)", borderRadius: 20, background: "#fff", boxShadow: "0 14px 34px rgba(15,23,42,.06)" }}>
              <button type="button" onClick={() => setSelected(product)} style={{ display: "block", width: "100%", padding: 0, border: 0, background: "transparent", textAlign: "left", cursor: "pointer" }}>
                <div style={{ height: 145, display: "grid", placeItems: "center", background: "linear-gradient(135deg, #f8fafc, #e2e8f0)", color: secondaryTextColor, fontWeight: 800 }}>
                  {product.image ? <img src={product.image} alt={product.name ?? "Produit"} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Produit"}
                </div>
                <div style={{ padding: 14 }}>
                  <span style={{ color: secondaryColor, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>{product.category || "Référence"}</span>
                  <h3 style={{ margin: "7px 0 6px", color: textColor, fontSize: 17 }}>{product.name || "Produit"}</h3>
                  <p style={{ minHeight: 42, margin: 0, color: secondaryTextColor, lineHeight: 1.45, fontSize: 13 }}>{product.description || "Produit disponible sur demande."}</p>
                  <strong style={{ display: "block", marginTop: 10, color: primaryColor, fontSize: 16 }}>{formatPrice(product.price)}</strong>
                </div>
              </button>
              <div style={{ display: "flex", gap: 8, padding: "0 14px 14px" }}>
                <button type="button" onClick={() => setSelected(product)} style={{ flex: 1, border: `1px solid ${primaryColor}`, borderRadius: 10, padding: "10px 12px", background: "transparent", color: primaryColor, fontWeight: 800, cursor: "pointer" }}>Voir le produit</button>
                <button type="button" onClick={() => addToRequest(product)} style={{ flex: 1, border: 0, borderRadius: 10, padding: "10px 12px", background: primaryColor, color: textColor, fontWeight: 800, cursor: "pointer" }}>Commander</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {cart.length > 0 && (
        <aside style={{ position: "sticky", bottom: 18, zIndex: 2, marginTop: 24, padding: 18, borderRadius: 18, background: textColor, color: "#fff", boxShadow: "0 18px 40px rgba(15,23,42,.2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <strong>{cart.reduce((total, line) => total + line.quantity, 0)} article{cart.reduce((total, line) => total + line.quantity, 0) > 1 ? "s" : ""} dans votre panier</strong>
            <button type="button" onClick={() => setCheckoutOpen(true)} style={{ border: 0, borderRadius: 10, padding: "10px 14px", background: secondaryColor, color: textColor, fontWeight: 800, cursor: "pointer" }}>Passer commande</button>
          </div>
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
            {cart.map((line) => (
              <div key={line.product.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.14)" }}>
                <span>{line.product.name} <small style={{ opacity: .7 }}>({formatPrice(line.product.price)})</small></span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button type="button" onClick={() => changeQuantity(line.product.id, -1)} aria-label={`Retirer ${line.product.name}`} style={{ width: 28, height: 28, border: 0, borderRadius: 7, cursor: "pointer" }}>-</button>
                  <strong>{line.quantity}</strong>
                  <button type="button" onClick={() => changeQuantity(line.product.id, 1)} aria-label={`Ajouter ${line.product.name}`} style={{ width: 28, height: 28, border: 0, borderRadius: 7, cursor: "pointer" }}>+</button>
                </span>
              </div>
            ))}
          </div>
        </aside>
      )}

      {checkoutOpen && (
        <dialog open aria-label="Finaliser la commande" style={{ position: "fixed", inset: 0, zIndex: 50, width: "100%", maxWidth: "none", height: "100%", border: 0, padding: 20, background: "rgba(15,23,42,.48)" }}>
          <form onSubmit={submitOrder} style={{ width: "min(560px, 100%)", maxHeight: "90vh", overflow: "auto", margin: "0 auto", borderRadius: 22, background: "#fff", padding: 24, color: textColor }}>
            <button type="button" onClick={() => setCheckoutOpen(false)} aria-label="Fermer" style={{ float: "right", border: 0, background: "transparent", color: secondaryTextColor, fontSize: 22, cursor: "pointer" }}>×</button>
            <p style={{ margin: 0, color: secondaryColor, fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>Votre commande</p>
            <h2 style={{ margin: "8px 0 6px", fontSize: 28 }}>Recevoir par WhatsApp</h2>
            <p style={{ margin: "0 0 18px", color: secondaryTextColor }}>Vos informations seront ajoutées au message envoyé à l&apos;organisation.</p>
            <div style={{ display: "grid", gap: 12 }}>
              {([ ["name", "Nom complet", "Votre nom"], ["phone", "Téléphone", "77 000 00 00"], ["address", "Adresse de livraison", "Ville, quartier, adresse"], ["note", "Note (facultatif)", "Précision sur la commande"] ] as const).map(([key, label, placeholder]) => (
                <label key={key} style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                  {label}
                  {key === "note" || key === "address" ? (
                    <textarea required={key === "address"} value={customer[key]} onChange={(event) => setCustomer((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} rows={key === "note" ? 2 : 3} style={{ resize: "vertical", border: "1px solid rgba(15,23,42,.16)", borderRadius: 10, padding: 11, color: textColor }} />
                  ) : (
                    <input required value={customer[key]} onChange={(event) => setCustomer((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} style={{ border: "1px solid rgba(15,23,42,.16)", borderRadius: 10, padding: 11, color: textColor }} />
                  )}
                </label>
              ))}
            </div>
            <button type="submit" disabled={!phoneNumber} style={{ width: "100%", marginTop: 18, border: 0, borderRadius: 12, padding: 14, background: phoneNumber ? "#25D366" : "#94a3b8", color: "#fff", fontWeight: 800, cursor: phoneNumber ? "pointer" : "not-allowed" }}>
              {phoneNumber ? "Ouvrir WhatsApp avec ma commande" : "Numéro WhatsApp indisponible"}
            </button>
          </form>
        </dialog>
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
