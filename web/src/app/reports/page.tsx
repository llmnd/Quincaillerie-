"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import styles from "./page.module.css";

type SaleItem = { product_id: number; quantity: number; unit_price: number; line_total: number };
type Sale = { id: number; customer_id: number | null; total_amount: number; status: string; sale_date: string; items: SaleItem[] };
type Customer = { id: number; name: string };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const money = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([]); const [customers, setCustomers] = useState<Customer[]>([]); const [message, setMessage] = useState("Chargement des données…"); const [statusFilter, setStatusFilter] = useState("all");
  useEffect(() => { const token = window.localStorage.getItem("quincaillerie_access_token"); const headers: Record<string, string> = {}; if (token) headers.Authorization = `Bearer ${token}`; Promise.all([fetch(`${API_URL}/api/v1/sales`, { headers }), fetch(`${API_URL}/api/v1/customers`, { headers })]).then(async ([salesResponse, customersResponse]) => { if (!salesResponse.ok) throw new Error(); setSales(await salesResponse.json()); if (customersResponse.ok) setCustomers(await customersResponse.json()); setMessage(""); }).catch(() => setMessage("Les rapports ne sont pas disponibles pour le moment.")); }, []);
  const customerNames = useMemo(() => new Map(customers.map((customer) => [customer.id, customer.name])), [customers]);
  const filteredSales = statusFilter === "all" ? sales : sales.filter((sale) => sale.status === statusFilter);
  const revenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0); const units = sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0); const average = sales.length ? revenue / sales.length : 0; const statuses = [...new Set(sales.map((sale) => sale.status))];
  return <AppShell><header className={styles.header}><div><p className={styles.eyebrow}>Analyse commerciale</p><h1>Rapports de ventes</h1><p>Chiffre d’affaires, articles vendus et historique des opérations.</p></div><span className={styles.period}>Données enregistrées</span></header>
    {message ? <div className={styles.empty}>{message}</div> : <><section className={styles.kpiGrid}><article><span>Chiffre d’affaires</span><strong>{money(revenue)}</strong><small>Somme des ventes</small></article><article><span>Ventes</span><strong>{sales.length}</strong><small>Transactions enregistrées</small></article><article><span>Articles vendus</span><strong>{units}</strong><small>Unités sorties du stock</small></article><article><span>Panier moyen</span><strong>{money(average)}</strong><small>Par transaction</small></article></section><section className={styles.panel}><div className={styles.panelHeader}><div><p className={styles.eyebrow}>Journal commercial</p><h2>Détail des ventes</h2></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrer par statut"><option value="all">Tous les statuts</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>{filteredSales.length === 0 ? <p className={styles.muted}>Aucune vente pour ce filtre.</p> : <div className={styles.saleList}>{filteredSales.map((sale) => <article className={styles.saleCard} key={sale.id}><div className={styles.saleHeader}><div><span className={styles.saleNumber}>Vente #{sale.id}</span><strong>{sale.customer_id ? customerNames.get(sale.customer_id) ?? `Client #${sale.customer_id}` : "Vente comptoir"}</strong></div><div className={styles.saleMeta}><b>{money(sale.total_amount)}</b><small>{new Date(sale.sale_date).toLocaleDateString("fr-FR")}</small><em>{sale.status}</em></div></div><div className={styles.items}>{sale.items.map((item) => <div key={item.product_id}><span>Produit #{item.product_id}</span><small>{item.quantity} unité{item.quantity > 1 ? "s" : ""} × {money(item.unit_price)}</small><b>{money(item.line_total)}</b></div>)}</div></article>)}</div>}</section></>}</AppShell>;
}
