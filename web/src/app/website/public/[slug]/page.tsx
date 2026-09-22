import { notFound } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type WebsiteTheme = {
  primary?: string;
  background?: string;
  text?: string;
  accent?: string;
  font?: string;
};

type PublicWebsitePayload = {
  website?: {
    id?: number;
    name?: string;
    slug?: string;
    logo?: string | null;
    theme?: WebsiteTheme;
  };
  organization?: {
    id?: number;
    name?: string;
  };
  page?: {
    title?: string;
    name?: string;
  };
  sections?: Array<{
    id?: number;
    type?: string;
    visible?: boolean;
    content?: Record<string, unknown>;
  }>;
  products?: Array<{
    id?: number;
    name?: string;
    description?: string | null;
    price?: number | string | null;
    image?: string | null;
    category?: string | null;
  }>;
};

function asText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "E";
}

export default async function PublicWebsitePage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams.slug;

  const response = await fetch(`${API_URL}/api/v1/websites/public/${encodeURIComponent(slug)}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    notFound();
  }

  const payload = (await response.json()) as PublicWebsitePayload;
  const website = payload.website ?? {};
  const organization = payload.organization ?? {};
  const sections = payload.sections ?? [];
  const theme = website.theme ?? {};
  const siteName = website.name || organization.name || "Entreprise";
  const siteLogo = website.logo || "";
  const primaryColor = theme.primary || "#111827";
  const backgroundColor = theme.background || "#ffffff";
  const textColor = theme.text || "#111827";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: backgroundColor,
        color: textColor,
        fontFamily: theme.font || "Inter, Arial, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          padding: "20px 32px",
          borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
          background: "#ffffff",
          color: "#111827",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 0,
            color: "#111827",
          }}
        >
          {siteLogo ? (
            <img
              src={siteLogo}
              alt={siteName}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                objectFit: "cover",
                display: "block",
                flexShrink: 0,
                background: "#f8fafc",
              }}
            />
          ) : (
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: primaryColor,
                color: "#ffffff",
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {getInitials(siteName)}
            </div>
          )}

          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#111827",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {siteName}
          </span>
        </div>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 18,
            color: "#111827",
          }}
        >
          {[
            { label: "Accueil", href: "#accueil" },
            { label: "À propos", href: "#apropos" },
            { label: "Produits", href: "#produits" },
            { label: "Services", href: "#services" },
            { label: "Contact", href: "#contact" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              style={{
                color: "#111827",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          style={{
            border: "none",
            borderRadius: 999,
            background: primaryColor,
            color: "#ffffff",
            padding: "11px 18px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 10px 24px rgba(17, 24, 39, 0.12)",
          }}
        >
          Contactez-nous
        </button>
      </header>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 20px 80px" }}>
        {sections.filter((section) => section.visible !== false).map((section, index) => {
          const content = section.content ?? {};
          const type = section.type ?? "text";

          if (type === "hero") {
            return (
              <section
                key={section.id ?? `${section.type}-${index}`}
                id="accueil"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.25fr 0.75fr",
                  gap: 28,
                  alignItems: "center",
                  padding: "32px 0",
                  color: textColor,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      color: "#475569",
                      fontWeight: 800,
                    }}
                  >
                    {siteName}
                  </p>
                  <h1
                    style={{
                      margin: "12px 0 16px",
                      fontSize: "clamp(2.2rem, 4vw, 4rem)",
                      lineHeight: 1.05,
                      color: "#111827",
                    }}
                  >
                    {asText(content.title, "Bienvenue chez nous")}
                  </h1>
                  <p
                    style={{
                      margin: 0,
                      color: "#374151",
                      fontSize: 18,
                      lineHeight: 1.7,
                    }}
                  >
                    {asText(content.subtitle, "Des produits et services pensés pour faire grandir votre activité.")}
                  </p>
                  <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <a
                      href={asText(content.buttonLink, "#contact")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: primaryColor,
                        color: "#ffffff",
                        textDecoration: "none",
                        borderRadius: 999,
                        padding: "13px 22px",
                        fontWeight: 700,
                      }}
                    >
                      {asText(content.buttonText, "Découvrir")}
                    </a>
                  </div>
                </div>

                <div
                  style={{
                    minHeight: 260,
                    borderRadius: 24,
                    background: "linear-gradient(135deg, #ecfeff, #e2e8f0)",
                    display: "grid",
                    placeItems: "center",
                    color: "#0f172a",
                    fontWeight: 800,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                  }}
                >
                  Image
                </div>
              </section>
            );
          }

          if (type === "products") {
            const productCards = payload.products && payload.products.length > 0 ? payload.products.slice(0, 3) : [];

            return (
              <section
                key={section.id ?? `${section.type}-${index}`}
                id="produits"
                style={{ padding: "18px 0 12px", color: textColor }}
              >
                <h2 style={{ margin: "0 0 18px", color: "#111827", fontSize: 30 }}>{asText(content.title, "Nos produits")}</h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 18,
                  }}
                >
                  {productCards.map((product) => (
                    <article
                      key={product.id}
                      style={{
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        borderRadius: 18,
                        background: "#ffffff",
                        overflow: "hidden",
                        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
                      }}
                    >
                      <div
                        style={{
                          height: 180,
                          background: "linear-gradient(135deg, #f8fafc, #e2e8f0)",
                          display: "grid",
                          placeItems: "center",
                          color: "#475569",
                          fontWeight: 800,
                        }}
                      >
                        {product.image ? <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Produit"}
                      </div>
                      <div style={{ padding: 16 }}>
                        <div style={{ color: "#64748b", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 800 }}>
                          {product.category || "Catégorie"}
                        </div>
                        <h3 style={{ margin: "10px 0 8px", fontSize: 20, color: "#111827" }}>{product.name}</h3>
                        <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>{product.description || "Produit disponible pour votre entreprise."}</p>
                        <strong style={{ display: "block", marginTop: 12, color: "#111827", fontSize: 18 }}>
                          {typeof product.price === "number" ? `${product.price.toFixed(2)} €` : product.price || "Prix sur demande"}
                        </strong>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          }

          return (
            <section
              key={section.id ?? `${section.type}-${index}`}
              style={{ padding: "18px 0", color: textColor }}
            >
              <h2 style={{ margin: "0 0 12px", color: "#111827", fontSize: 30 }}>{asText(content.title, "Section")}</h2>
              <p style={{ margin: 0, color: "#374151", fontSize: 18, lineHeight: 1.8 }}>
                {asText(content.text, asText(content.subtitle, "Contenu de cette section."))}
              </p>
            </section>
          );
        })}
      </div>

      <footer
        id="contact"
        style={{
          borderTop: "1px solid rgba(15, 23, 42, 0.08)",
          background: "#f8fafc",
          color: "#111827",
          padding: "18px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 700, color: "#111827" }}>{siteName}</span>
        <span style={{ color: "#334155" }}>© 2026 — Tous droits réservés</span>
      </footer>
    </main>
  );
}
