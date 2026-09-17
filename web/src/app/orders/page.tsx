"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import styles from "./page.module.css";

type Sale = { id: number; customer_id: number | null; sale_date: string; total_amount: number; status: string };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const statusLabel = (status: string) => ({ pending: "En attente", paid: "Payée", completed: "Terminée", cancelled: "Annulée" }[status] ?? status);

export default function OrdersPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [message, setMessage] = useState("Chargement des ventes…");
  useEffect(() => { fetch(`${API_URL}/api/v1/sales`, { credentials: "include" }).then(async (response) => { if (!response.ok) throw new Error(); setSales(await response.json()); setMessage(""); }).catch(() => setMessage("Les ventes ne sont pas disponibles pour le moment.")); }, []);
  return <AppShell><header className={styles.header}><div><p className={styles.eyebrow}>Ventes</p><h1>Commandes</h1><p>Historique réel des ventes enregistrées.</p></div></header><section className={styles.table}>{message ? <div className={styles.empty}>{message}</div> : sales.length === 0 ? <div className={styles.empty}>Aucune vente enregistrée.</div> : sales.map((sale) => <article className={styles.row} key={sale.id}><div><span>Vente #{sale.id}</span><strong>{sale.customer_id ? `Client #${sale.customer_id}` : "Vente comptoir"}</strong></div><time>{new Date(sale.sale_date).toLocaleDateString("fr-FR")}</time><b>{sale.total_amount.toLocaleString("fr-FR")} FCFA</b><em>{statusLabel(sale.status)}</em></article>)}</section></AppShell>;
}
