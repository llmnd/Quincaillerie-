"use client";

import { ArrowLeft, MessageCircle, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { readCart, type CartLine } from "../../../website/public/[slug]/cart";
import styles from "../../../website/public/[slug]/productCatalog.module.css";
import { fetchPublicWebsite } from "../../../website/public/publicApi";
import SiteHeader from "../../../../components/SiteHeader";

type CustomerDetails = { name: string; phone: string; address: string; note: string };

type CheckoutPageProps = Readonly<{
  slug: string;
  siteName: string;
  phone?: string | null;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  secondaryTextColor: string;
  eyebrowText: string;
  titleText: string;
  leadText: string;
}>;

const emptyCustomer: CustomerDetails = { name: "", phone: "", address: "", note: "" };

function CheckoutPage({ slug, siteName, phone, primaryColor, secondaryColor, textColor, secondaryTextColor, eyebrowText, titleText, leadText }: CheckoutPageProps) {
  const [cart, setCart] = useState<CartLine[]>(() => readCart(slug));
  const [customer, setCustomer] = useState(emptyCustomer);

  useEffect(() => {
    const syncCart = () => setCart(readCart(slug));
    syncCart();

    const onStorage = () => syncCart();
    const onCartUpdated = () => syncCart();

    window.addEventListener("storage", onStorage);
    window.addEventListener("website-cart-updated", onCartUpdated);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("website-cart-updated", onCartUpdated);
    };
  }, [slug]);

  const totalQuantity = useMemo(() => cart.reduce((total, line) => total + line.quantity, 0), [cart]);
  const phoneNumber = phone?.replace(/[^+\d]/g, "") ?? "";
  const productSummary = cart.map((line) => `${line.product.name ?? "Produit"} x${line.quantity}`).join(", ");
  const requestText = [
    "Bonjour, je souhaite passer une commande.",
    `Nom : ${customer.name}`,
    `Téléphone : ${customer.phone}`,
    `Adresse : ${customer.address}`,
    `Produits : ${productSummary}`,
    customer.note ? `Note : ${customer.note}` : "",
  ].filter(Boolean).join("\n");
  const whatsappHref = phoneNumber
    ? `https://wa.me/${phoneNumber.replace(/^\+/, "")}?text=${encodeURIComponent(requestText)}`
    : "#contact";

  return (
    <>
      <SiteHeader
        slug={slug}
        siteName={siteName}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        textColor={textColor}
      />
      <main className={styles.pageShell} style={{ "--primary": primaryColor, "--secondary": secondaryColor, "--text": textColor, "--muted": secondaryTextColor } as React.CSSProperties}>
        <div className={styles.pageContainer}>
          <a href={`/site/${slug}/panier`} className={styles.backLink}><ArrowLeft size={14} /> Retour au panier</a>
          <header className={styles.pageHeader}>
            <p className={styles.eyebrow}>{eyebrowText}</p>
            <h1 className={styles.pageTitle}>{titleText}</h1>
            <p className={styles.pageLead}>{leadText.replace("{siteName}", siteName)}</p>
          </header>
          {cart.length === 0 ? (
            <section className={styles.emptyCart}>
              <ShoppingBag size={32} aria-hidden="true" />
              <h2>Votre panier est vide</h2>
              <a href={`/site/${slug}/produits`} className={styles.btnSolid}>Voir les produits</a>
            </section>
          ) : (
            <form className={styles.checkoutPage} onSubmit={(event) => { event.preventDefault(); if (phoneNumber) window.location.href = whatsappHref; }}>
              <p className={styles.orderSummary}>{totalQuantity} article{totalQuantity > 1 ? "s" : ""} sélectionné{totalQuantity > 1 ? "s" : ""}</p>
              <div className={styles.formGrid}>
                <label className={styles.formLabel}>Nom complet<input required className={styles.formInput} placeholder="Votre nom" value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} /></label>
                <label className={styles.formLabel}>Téléphone<input required className={styles.formInput} placeholder="77 000 00 00" value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} /></label>
                <label className={styles.formLabel}>Adresse de livraison<textarea required className={styles.formTextarea} placeholder="Ville, quartier, adresse" value={customer.address} onChange={(event) => setCustomer((current) => ({ ...current, address: event.target.value }))} /></label>
                <label className={styles.formLabel}>Note <span>(facultatif)</span><textarea className={styles.formTextarea} placeholder="Précision sur la commande" value={customer.note} onChange={(event) => setCustomer((current) => ({ ...current, note: event.target.value }))} /></label>
              </div>
              <button type="submit" className={styles.submitButton} disabled={!phoneNumber}><MessageCircle size={17} />{phoneNumber ? "Ouvrir WhatsApp avec ma commande" : "Numéro WhatsApp indisponible"}</button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}

export default function CheckoutRoute({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const [config, setConfig] = useState<(CheckoutPageProps & { loaded: boolean }) | null>(null);

  useEffect(() => {
    let active = true;
    void params.then(async ({ slug }) => {
      try {
        const payload = await fetchPublicWebsite(slug);
        if (!payload) return;
        const theme = payload.website?.theme ?? {};
        if (active) setConfig({
          loaded: true,
          slug,
          siteName: payload.website?.name || payload.organization?.name || "Entreprise",
          phone: payload.organization?.phone,
          primaryColor: theme.primary ?? "#111827",
          secondaryColor: theme.secondary ?? "#dfb053",
          textColor: theme.text ?? "#111827",
          secondaryTextColor: theme.secondaryText ?? "#475569",
          eyebrowText: theme.checkoutEyebrow ?? "Dernière étape",
          titleText: theme.checkoutTitle ?? "Votre commande",
          leadText: theme.checkoutLead ?? `Transmettez votre demande à ${payload.website?.name || payload.organization?.name || "Entreprise"} directement sur WhatsApp.`,
        });
      } catch {
        if (active) setConfig({ loaded: true, slug, siteName: "Entreprise", phone: null, primaryColor: "#111827", secondaryColor: "#dfb053", textColor: "#111827", secondaryTextColor: "#475569", eyebrowText: "Dernière étape", titleText: "Votre commande", leadText: "Transmettez votre demande directement sur WhatsApp." });
      }
    });
    return () => { active = false; };
  }, [params]);

  if (!config?.loaded) return null;
  return <CheckoutPage {...config} />;
}
