"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import { authHeaders } from "../../lib/auth";
import styles from "./page.module.css";

type SaleItem = { product_id: number; quantity: number; unit_price: number; line_total: number };
type Sale = { id: number; customer_id: number | null; total_amount: number; status: string; sale_date: string; items: SaleItem[] };
type Product = { id: number; name: string; image_url?: string | null };
type Customer = { id: number; name: string };
type ReportPeriod = "month" | "quarter" | "year" | "all";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const money = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;
const statusLabel = (status: string) =>
  ({ pending: "En attente", paid: "Payée", completed: "Terminée", cancelled: "Annulée" }[status] ?? status);

function buildPeriodWindow(period: ReportPeriod) {
  const end = new Date();
  const start = new Date(end);

  if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (period === "quarter") {
    const month = Math.floor(start.getMonth() / 3) * 3;
    start.setMonth(month, 1);
    start.setHours(0, 0, 0, 0);
  } else if (period === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setFullYear(2000, 0, 1);
  }

  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function buildPeriodQuery(period: ReportPeriod) {
  if (period === "all") {
    return "";
  }

  const { start, end } = buildPeriodWindow(period);
  const params = new URLSearchParams({
    date_from: start.toISOString(),
    date_to: end.toISOString(),
  });

  return `?${params.toString()}`;
}

function matchesPeriod(date: string, period: ReportPeriod) {
  const saleDate = new Date(date);
  if (Number.isNaN(saleDate.getTime())) return true;

  const { start, end } = buildPeriodWindow(period);
  return saleDate >= start && saleDate <= end;
}

export function ReportsPageContent() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("Chargement des données…");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("month");

  useEffect(() => {
    let isMounted = true;

    const loadReports = async () => {
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(authHeaders() as Record<string, string>),
      };
      const salesQuery = buildPeriodQuery(reportPeriod);

      try {
        const [salesResponse, customersResponse, productsResponse] = await Promise.all([
          fetch(`${API_URL}/api/v1/sales${salesQuery}`, { headers, credentials: "include" }),
          fetch(`${API_URL}/api/v1/customers`, { headers, credentials: "include" }),
          fetch(`${API_URL}/api/v1/products`, { headers, credentials: "include" }),
        ]);

        if (!salesResponse.ok) throw new Error("Rapports indisponibles");

        const nextSales = await salesResponse.json() as Sale[];
        const nextCustomers = customersResponse.ok ? await customersResponse.json() as Customer[] : [];
        const nextProducts = productsResponse.ok ? await productsResponse.json() as Product[] : [];

        if (!isMounted) return;
        setSales(nextSales);
        setCustomers(nextCustomers);
        setProducts(nextProducts);
        setMessage("");
      } catch {
        if (isMounted) {
          setMessage("Les rapports ne sont pas disponibles pour le moment.");
        }
      }
    };

    void loadReports();

    return () => {
      isMounted = false;
    };
  }, [reportPeriod]);

  const customerNames = useMemo(() => new Map(customers.map((customer) => [customer.id, customer.name])), [customers]);
  const productDetails = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const periodSales = useMemo(() => sales.filter((sale) => matchesPeriod(sale.sale_date, reportPeriod)), [sales, reportPeriod]);
  const filteredSales = statusFilter === "all" ? periodSales : periodSales.filter((sale) => sale.status === statusFilter);
  const revenue = periodSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const units = periodSales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const average = periodSales.length ? revenue / periodSales.length : 0;
  const statuses = [...new Set(periodSales.map((sale) => sale.status))];

  return (
    <>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Analyse commerciale</p>
          <h2>Rapports de ventes</h2>
          <p>Chiffre d&apos;affaires, articles vendus et historique des opérations.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.periodSelector} aria-label="Période des rapports">
            {(["month", "quarter", "year", "all"] as const).map((period) => (
              <button
                key={period}
                type="button"
                className={reportPeriod === period ? styles.periodButtonActive : styles.periodButton}
                onClick={() => setReportPeriod(period)}
              >
                {period === "month" ? "Mois" : period === "quarter" ? "Trimestre" : period === "year" ? "Année" : "Tout"}
              </button>
            ))}
          </div>
          <span className={styles.period}>Données enregistrées</span>
        </div>
      </header>

      {message ? (
        <div className={styles.empty}>{message}</div>
      ) : (
        <>
          <section className={styles.kpiGrid}>
            <article>
              <span>Chiffre d&apos;affaires</span>
              <strong>{money(revenue)}</strong>
              <small>Somme des ventes</small>
            </article>
            <article>
              <span>Ventes</span>
              <strong>{sales.length}</strong>
              <small>Transactions</small>
            </article>
            <article>
              <span>Articles vendus</span>
              <strong>{units}</strong>
              <small>Unités sorties</small>
            </article>
            <article>
              <span>Panier moyen</span>
              <strong>{money(average)}</strong>
              <small>Par transaction</small>
            </article>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Journal commercial</p>
                <h2>Détail des ventes</h2>
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filtrer par statut"
              >
                <option value="all">Tous les statuts</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            {filteredSales.length === 0 ? (
              <p className={styles.muted}>Aucune vente pour ce filtre.</p>
            ) : (
              <div className={styles.saleList}>
                {filteredSales.map((sale) => (
                  <article className={styles.saleCard} key={sale.id}>
                    <div className={styles.saleHeader}>
                      <div>
                        <span className={styles.saleNumber}>Vente #{sale.id}</span>
                        <strong>
                          {sale.customer_id
                            ? customerNames.get(sale.customer_id) ?? `Client #${sale.customer_id}`
                            : "Vente comptoir"}
                        </strong>
                      </div>
                      <div className={styles.saleMeta}>
                        <b>{money(sale.total_amount)}</b>
                        <small>{new Date(sale.sale_date).toLocaleDateString("fr-FR")}</small>
                        <em>{statusLabel(sale.status)}</em>
                      </div>
                    </div>
                    <div className={styles.items}>
                      {sale.items.map((item) => (
                        <div key={item.product_id}>
                          <span>{productDetails.get(item.product_id)?.image_url ? <img src={productDetails.get(item.product_id)?.image_url ?? ""} alt="" className={styles.productThumb} /> : null}{productDetails.get(item.product_id)?.name ?? `Produit #${item.product_id}`}</span>
                          <small>
                            {item.quantity} unité{item.quantity > 1 ? "s" : ""} × {money(item.unit_price)}
                          </small>
                          <b>{money(item.line_total)}</b>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

export default function ReportsPage() {
  return <AppShell><ReportsPageContent /></AppShell>;
}