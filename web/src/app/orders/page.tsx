"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, ShoppingCart, WalletCards } from "lucide-react";
import AppShell from "../../components/AppShell";
import { authHeaders } from "../../lib/auth";
import styles from "./page.module.css";

type Sale = { id: number; customer_id: number | null; sale_date: string; total_amount: number; status: string };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const statusLabel = (status: string) => ({ pending: "En attente", paid: "Payée", completed: "Terminée", cancelled: "Annulée" }[status] ?? status);
const formatAmount = (amount: number) => `${amount.toLocaleString("fr-FR")} FCFA`;

export default function OrdersPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [message, setMessage] = useState("Chargement des ventes…");

  useEffect(() => {
    let isMounted = true;

    const loadSales = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/sales`, { headers: authHeaders(), credentials: "include" });
        if (!response.ok) throw new Error("Ventes indisponibles");

        const nextSales = await response.json() as Sale[];
        if (!isMounted) return;
        setSales(nextSales);
        setMessage("");
      } catch {
        if (isMounted) {
          setMessage("Les ventes ne sont pas disponibles pour le moment.");
        }
      }
    };

    void loadSales();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalAmount = sales.reduce((total, sale) => total + sale.total_amount, 0);
  const completedCount = sales.filter((sale) => sale.status === "paid" || sale.status === "completed").length;
  const pendingCount = sales.filter((sale) => sale.status === "pending").length;

  return (
    <AppShell>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Ventes / opérations quotidiennes</p>
          <h1>Commandes</h1>
          <p>Retrouvez les ventes enregistrées et leur état de traitement.</p>
        </div>
        <div className={styles.headerIcon} aria-hidden="true"><ShoppingCart size={24} /></div>
      </header>

      <section className={styles.metrics} aria-label="Résumé des commandes">
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}><ShoppingCart size={17} /></span>
          <div><small>Total des commandes</small><strong>{sales.length}</strong></div>
        </article>
        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.metricIconGood}`}><CheckCircle2 size={17} /></span>
          <div><small>Commandes terminées</small><strong>{completedCount}</strong></div>
        </article>
        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.metricIconPending}`}><Clock3 size={17} /></span>
          <div><small>En attente</small><strong>{pendingCount}</strong></div>
        </article>
        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.metricIconAmount}`}><WalletCards size={17} /></span>
          <div><small>Chiffre d'affaires</small><strong>{formatAmount(totalAmount)}</strong></div>
        </article>
      </section>

      <section className={styles.table} aria-label="Liste des commandes">
        <div className={styles.tableHeading}><div><h2>Dernières ventes</h2><p>Historique réel des opérations.</p></div><span>{sales.length} résultat{sales.length > 1 ? "s" : ""}</span></div>
        {message ? <div className={styles.empty}>{message}</div> : sales.length === 0 ? <div className={styles.empty}>Aucune vente enregistrée.</div> : sales.map((sale) => <article className={styles.row} key={sale.id}><div className={styles.orderIdentity}><span>Vente #{sale.id}</span><strong>{sale.customer_id ? `Client #${sale.customer_id}` : "Vente comptoir"}</strong></div><time>{new Date(sale.sale_date).toLocaleDateString("fr-FR")}</time><b>{formatAmount(sale.total_amount)}</b><em className={styles[`status${sale.status.charAt(0).toUpperCase()}${sale.status.slice(1)}`] ?? ""}>{statusLabel(sale.status)}</em></article>)}
      </section>
    </AppShell>
  );
}
