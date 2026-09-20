"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import { authHeaders } from "../../lib/auth";
import styles from "./page.module.css";

type Sale = { id: number; sale_date: string; total_amount: number; status: string; payment_method: string };
type Product = { id: number; name: string; stock_quantity: number; remaining_stock: number };
type StockMovement = { id: number; product_id: number; movement_type: string; quantity: number; reason?: string | null; created_at: string };
type CashSession = { id: number; register_id: number; status: string; opened_at: string; actual_opening_amount: number };
type Batch = { id: number; reference: string; current_count: number; status: string; production_type: string; created_at: string };
type HealthEvent = { id: number; title: string; event_type: string; mortality_count: number; event_date: string };
type EggProduction = { id: number; batch_id: number; production_date: string; quantity: number; damaged_quantity: number; created_at: string };

type ActivityKind = "sale" | "stock" | "cash" | "farm";
type FilterTab = "all" | "sale" | "stock" | "cash" | "farm";

type ActivityItem = {
  id: string;
  label: string;
  detail: string;
  time: string;
  kind: ActivityKind;
  rawAmount?: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 })
    .format(value)
    .replace("XOF", "FCFA");

const formatDate = (value: string) => {
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(date);
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date);
};

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: authHeaders(),
      credentials: "include",
      signal,
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch (err) {
    if ((err as Error).name === "AbortError") return null;
    return null;
  }
}

export default function NotificationsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [eggProductions, setEggProductions] = useState<EggProduction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
      setLoading(true);
      try {
        const [saleData, productData, movementData, sessionData, batchData, healthData, eggData] = await Promise.all([
          fetchJson<Sale[]>("/api/v1/sales", controller.signal),
          fetchJson<Product[]>("/api/v1/products", controller.signal),
          fetchJson<StockMovement[]>("/api/v1/stock-movements", controller.signal),
          fetchJson<CashSession[]>("/api/v1/cash/sessions", controller.signal),
          fetchJson<Batch[]>("/api/v1/farming/batches", controller.signal),
          fetchJson<HealthEvent[]>("/api/v1/farming/health-events", controller.signal),
          fetchJson<EggProduction[]>("/api/v1/farming/egg-productions", controller.signal),
        ]);

        if (controller.signal.aborted) return;

        if (saleData) setSales(saleData);
        if (productData) setProducts(productData);
        if (movementData) setMovements(movementData);
        if (sessionData) setSessions(sessionData);
        if (batchData) setBatches(batchData);
        if (healthData) setHealthEvents(healthData);
        if (eggData) setEggProductions(eggData);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadData();

    return () => {
      controller.abort();
    };
  }, []);

  const allActivities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...sales.slice(0, 10).map((sale) => ({
        id: `sale-${sale.id}`,
        label: "Vente enregistrée",
        detail: `Paiement ${sale.payment_method || "N/A"} · Statut: ${sale.status}`,
        time: sale.sale_date,
        kind: "sale" as const,
        rawAmount: sale.total_amount,
      })),
      ...movements.slice(0, 10).map((m) => ({
        id: `stock-${m.id}`,
        label: m.movement_type === "sale" ? "Sortie de stock" : "Mouvement de stock",
        detail: `${m.quantity} unité${m.quantity > 1 ? "s" : ""}${m.reason ? ` · ${m.reason}` : ""}`,
        time: m.created_at,
        kind: "stock" as const,
      })),
      ...sessions.slice(0, 5).map((s) => ({
        id: `cash-${s.id}`,
        label: s.status === "open" ? "Caisse ouverte" : "Session clôturée",
        detail: `Caisse #${s.register_id} · Fond: ${formatMoney(s.actual_opening_amount)}`,
        time: s.opened_at,
        kind: "cash" as const,
      })),
      ...batches.slice(0, 5).map((b) => ({
        id: `batch-${b.id}`,
        label: "Bande de volaille créée",
        detail: `${b.reference} · ${b.current_count} sujets · ${b.production_type}`,
        time: b.created_at,
        kind: "farm" as const,
      })),
      ...healthEvents.slice(0, 5).map((h) => ({
        id: `health-${h.id}`,
        label: h.title,
        detail: `${h.event_type}${h.mortality_count ? ` · ${h.mortality_count} mortalité(s)` : ""}`,
        time: h.event_date,
        kind: "farm" as const,
      })),
      ...eggProductions.slice(0, 8).map((p) => ({
        id: `egg-${p.id}`,
        label: "Récolte d'œufs",
        detail: `${p.quantity} œuf${p.quantity > 1 ? "s" : ""} · ${p.damaged_quantity} cassé(s)`,
        time: p.created_at,
        kind: "farm" as const,
      })),
    ];

    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 50);
  }, [batches, eggProductions, healthEvents, movements, sales, sessions]);

  const filteredActivities = useMemo(() => {
    if (activeTab === "all") return allActivities;
    return allActivities.filter((item) => item.kind === activeTab);
  }, [allActivities, activeTab]);

  const lowStockCount = useMemo(() => {
    return products.filter((product) => product.remaining_stock <= 5).length;
  }, [products]);

  const totalSalesAmount = useMemo(() => {
    return sales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
  }, [sales]);

  return (
    <AppShell>
      <div className={styles.page}>
        {/* Print Header */}
        <div className={styles.printHeader}>
          <div className={styles.printBrand}>
            <div className={styles.printLogoFallback}>ERP</div>
            <div className={styles.printBrandCopy}>
              <span className={styles.printEyebrow}>Rapport d'activité</span>
              <h2>Journal des Notifications</h2>
              <p className={styles.printContact}>Exportation système ERP - Gestion globale</p>
            </div>
          </div>
          <div className={styles.printMeta}>
            <div className={styles.printMetaItem}>
              <span className={styles.printMetaLabel}>Date d'impression</span>
              <span className={styles.printMetaValue}>{new Date().toLocaleDateString("fr-FR")}</span>
            </div>
          </div>
        </div>

        {/* Screen Header */}
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Centre de notifications</span>
            <h1>Activité récente</h1>
          </div>
          <button className={styles.primaryAction} onClick={() => window.print()}>
            Imprimer le rapport
          </button>
        </header>

        {/* Print Title */}
        <div className={styles.printTitle}>
          <h1>Synthèse d'activité</h1>
          <p>Historique des événements système récents</p>
        </div>

        {/* Summary Grid */}
        <section className={styles.summaryGrid}>
          {loading ? (
            <div className={styles.loadingState}>Chargement des synthèses…</div>
          ) : (
            <>
              <article className={`${styles.summaryCard} ${styles.accent}`}>
                <span className={styles.summaryLabel}>Total Événements</span>
                <strong className={styles.summaryValue}>{allActivities.length}</strong>
                <span className={styles.summaryDelta}>Activités enregistrées</span>
              </article>

              <article className={`${styles.summaryCard} ${styles.warning}`}>
                <span className={styles.summaryLabel}>Stock Faible</span>
                <strong className={styles.summaryValue}>{lowStockCount}</strong>
                <span className={styles.summaryDelta}>Produits sous le seuil</span>
              </article>

              <article className={`${styles.summaryCard} ${styles.good}`}>
                <span className={styles.summaryLabel}>Volume Ventes</span>
                <strong className={styles.summaryValue}>{sales.length}</strong>
                <span className={styles.summaryDelta}>{formatMoney(totalSalesAmount)}</span>
              </article>

              <article className={`${styles.summaryCard} ${styles.neutral}`}>
                <span className={styles.summaryLabel}>Sessions Caisse</span>
                <strong className={styles.summaryValue}>{sessions.length}</strong>
                <span className={styles.summaryDelta}>Aujourd'hui</span>
              </article>
            </>
          )}
        </section>

        {/* Navigation Tabs */}
        <nav className={styles.tabs} aria-label="Filtres des notifications">
          <button
            className={`${styles.tabButton} ${activeTab === "all" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("all")}
          >
            Toutes ({allActivities.length})
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === "sale" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("sale")}
          >
            Ventes
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === "stock" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("stock")}
          >
            Stocks
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === "cash" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("cash")}
          >
            Caisses
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === "farm" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("farm")}
          >
            Ferme
          </button>
        </nav>

        {/* Main Content Grid */}
        <div className={styles.contentGrid}>
          <main className={styles.primaryPanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.panelEyebrow}>Flux de données</span>
                <h2>Journal d'événements</h2>
              </div>
            </div>

            {loading ? (
              <div className={styles.loadingState}>Chargement du flux d'activités…</div>
            ) : filteredActivities.length === 0 ? (
              <div className={styles.loadingState}>Aucun événement trouvé dans cette catégorie.</div>
            ) : (
              <div className={styles.tableWrap}>
                {filteredActivities.map((activity) => (
                  <article key={activity.id} className={styles.rowItem}>
                    <div>
                      <strong>{activity.label}</strong>
                      <small>{activity.detail}</small>
                    </div>

                    <small>{formatDate(activity.time)}</small>

                    <div className={styles.amount}>
                      {activity.rawAmount !== undefined ? (
                        formatMoney(activity.rawAmount)
                      ) : (
                        <span className={`${styles.status} ${styles.good}`}>{formatTime(activity.time)}</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>

          {/* Side Panel */}
          <aside className={styles.sidePanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.panelEyebrow}>Statistiques</span>
                <h2>Aperçu rapide</h2>
              </div>
            </div>

            <div className={styles.sideSummary}>
              <div>
                <span>Dernière synchro</span>
                <strong>{new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</strong>
              </div>
              <div>
                <span>Alertes de stock</span>
                <strong>{lowStockCount > 0 ? `${lowStockCount} alerte(s)` : "Aucune alerte"}</strong>
              </div>
              <div>
                <span>Total ventes</span>
                <strong>{formatMoney(totalSalesAmount)}</strong>
              </div>
            </div>
          </aside>
        </div>

        {/* Print Footer */}
        <footer className={styles.printFooter}>
          <span>Document généré automatiquement par l'ERP</span>
          <span>Page 1 sur 1</span>
        </footer>
      </div>
    </AppShell>
  );
}