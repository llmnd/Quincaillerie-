"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, AlertCircle, ArrowUpRight, Bird, Boxes, CheckCircle2, Clock3, Grid, Package, RefreshCw, ShoppingCart, Users, WalletCards } from "lucide-react";
import AppShell, { applications } from "../../components/AppShell";
import { authHeaders } from "../../lib/auth";
import styles from "./page.module.css";

type User = { full_name?: string; role?: "admin" | "seller" };
type Sale = { id: number; sale_date: string; total_amount: number; status: string; payment_method: string };
type Product = { id: number; name: string; stock_quantity: number; remaining_stock: number };
type StockMovement = { id: number; product_id: number; movement_type: string; quantity: number; reason?: string | null; created_at: string };
type CashSession = { id: number; register_id: number; status: string; opened_at: string; actual_opening_amount: number };
type Batch = { id: number; reference: string; current_count: number; status: string; production_type: string; created_at: string };
type HealthEvent = { id: number; title: string; event_type: string; mortality_count: number; event_date: string };
type EggProduction = { id: number; batch_id: number; production_date: string; quantity: number; damaged_quantity: number; created_at: string };
type ActivityItem = { id: string; label: string; detail: string; time: string; kind: "sale" | "stock" | "cash" | "farm" };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const formatMoney = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;
const formatDate = (value: string) => new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
const isToday = (value: string) => new Date(value).toDateString() === new Date().toDateString();

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [eggProductions, setEggProductions] = useState<EggProduction[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchJson<T>(path: string): Promise<T | null> {
    try {
      const response = await fetch(`${API_URL}${path}`, { headers: authHeaders(), credentials: "include" });
      return response.ok ? await response.json() as T : null;
    } catch {
      return null;
    }
  }

  async function loadActivity() {
    setIsLoading(true);
    const [saleData, productData, movementData, sessionData, batchData, healthData, eggData, customerData] = await Promise.all([
      fetchJson<Sale[]>("/api/v1/sales"),
      fetchJson<Product[]>("/api/v1/products"),
      fetchJson<StockMovement[]>("/api/v1/stock-movements"),
      fetchJson<CashSession[]>("/api/v1/cash/sessions"),
      fetchJson<Batch[]>("/api/v1/farming/batches"),
      fetchJson<HealthEvent[]>("/api/v1/farming/health-events"),
      fetchJson<EggProduction[]>("/api/v1/farming/egg-productions"),
      fetchJson<{ id: number }[]>("/api/v1/customers"),
    ]);
    if (saleData) setSales(saleData);
    if (productData) setProducts(productData);
    if (movementData) setMovements(movementData);
    if (sessionData) setSessions(sessionData);
    if (batchData) setBatches(batchData);
    if (healthData) setHealthEvents(healthData);
    if (eggData) setEggProductions(eggData);
    if (customerData) setCustomerCount(customerData.length);
    setLastUpdated(new Date());
    setIsLoading(false);
  }

  useEffect(() => {
    const value = window.localStorage.getItem("quincaillerie_user");
    if (value) {
      try {
        setUser(JSON.parse(value) as User);
      } catch (e) {
        console.error("Erreur de lecture du profil utilisateur", e);
      }
    }
    void loadActivity();
  }, []);

  const visibleApps = applications.filter((application) =>
    application.roles.includes(user?.role ?? "seller")
  );

  const firstName = user?.full_name ? user.full_name.split(" ")[0] : "";
  const todaySales = sales.filter((sale) => isToday(sale.sale_date));
  const todayRevenue = todaySales.reduce((total, sale) => total + sale.total_amount, 0);
  const openSession = sessions.find((session) => session.status === "open");
  const lowStockProducts = products.filter((product) => product.remaining_stock <= 5);
  const activeBatches = batches.filter((batch) => batch.status === "active");
  const recentActivities: ActivityItem[] = [
    ...sales.slice(0, 8).map((sale) => ({ id: `sale-${sale.id}`, label: "Vente enregistrée", detail: formatMoney(sale.total_amount), time: sale.sale_date, kind: "sale" as const })),
    ...movements.slice(0, 8).map((movement) => ({ id: `stock-${movement.id}`, label: movement.movement_type === "sale" ? "Sortie de stock" : "Mouvement de stock", detail: `${movement.quantity} unité${movement.quantity > 1 ? "s" : ""}`, time: movement.created_at, kind: "stock" as const })),
    ...sessions.slice(0, 4).map((session) => ({ id: `cash-${session.id}`, label: session.status === "open" ? "Caisse ouverte" : "Session clôturée", detail: `Caisse #${session.register_id}`, time: session.opened_at, kind: "cash" as const })),
    ...batches.slice(0, 4).map((batch) => ({ id: `batch-${batch.id}`, label: "Bande créée", detail: `${batch.reference} · ${batch.current_count} sujets`, time: batch.created_at, kind: "farm" as const })),
    ...healthEvents.slice(0, 4).map((event) => ({ id: `health-${event.id}`, label: event.title, detail: event.mortality_count ? `${event.mortality_count} perte${event.mortality_count > 1 ? "s" : ""}` : "Suivi sanitaire", time: event.event_date, kind: "farm" as const })),
    ...eggProductions.slice(0, 8).map((production) => ({ id: `egg-${production.id}`, label: "Récolte d'œufs", detail: `${production.quantity} œuf${production.quantity > 1 ? "s" : ""} · ${production.damaged_quantity} cassé${production.damaged_quantity > 1 ? "s" : ""}`, time: production.created_at, kind: "farm" as const })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

  const activityIcon = { sale: ShoppingCart, stock: Package, cash: WalletCards, farm: Bird };

  return (
    <AppShell>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerInfo}>
            <span className={styles.eyebrow}>
              <Grid size={12} className={styles.eyebrowIcon} />
              ESPACE D'EXPLOITATION
            </span>
            <h1 className={styles.title}>
              {firstName ? `BONJOUR, ${firstName.toUpperCase()}` : "TABLEAU DE BORD"}
            </h1>
            <p className={styles.subtitle}>
              La situation de votre organisation, en un seul regard.
            </p>
          </div>

          <div className={styles.headerMeta}>
            <span>{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
            <button type="button" className={styles.refreshButton} onClick={() => void loadActivity()} aria-label="Actualiser l’activité" title="Actualiser"><RefreshCw size={15} className={isLoading ? styles.spinning : ""} /></button>
          </div>
        </header>

        <section className={styles.metricGrid} aria-label="Indicateurs de l'organisation">
          <article className={`${styles.metricCard} ${styles.metricAccent}`}><span>Chiffre d'affaires du jour</span><strong>{isLoading ? "—" : formatMoney(todayRevenue)}</strong><small><ShoppingCart size={13} /> {todaySales.length} vente{todaySales.length > 1 ? "s" : ""}</small></article>
          <article className={styles.metricCard}><span>État de la caisse</span><strong>{openSession ? "ACTIVE" : "FERMÉE"}</strong><small className={openSession ? styles.good : styles.muted}><WalletCards size={13} /> {openSession ? `Caisse #${openSession.register_id}` : "Aucune session ouverte"}</small></article>
          <article className={styles.metricCard}><span>Stock à surveiller</span><strong>{lowStockProducts.length}</strong><small className={lowStockProducts.length ? styles.warning : styles.good}><Boxes size={13} /> référence{lowStockProducts.length > 1 ? "s" : ""} concernée{lowStockProducts.length > 1 ? "s" : ""}</small></article>
          <article className={styles.metricCard}><span>Équipe & relations</span><strong>{customerCount}</strong><small><Users size={13} /> clients enregistrés · {activeBatches.length} bande{activeBatches.length > 1 ? "s" : ""} active{activeBatches.length > 1 ? "s" : ""}</small></article>
        </section>

        <div className={styles.dashboardGrid}>
          <section className={styles.activityPanel} aria-labelledby="activity-title">
            <div className={styles.sectionHeader}><div><span className={styles.sectionKicker}><Activity size={13} /> Traçabilité</span><h2 id="activity-title">Activité récente</h2></div><span className={styles.updatedAt}>{lastUpdated ? `Mis à jour à ${lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "Chargement…"}</span></div>
            {recentActivities.length ? <div className={styles.activityList}>{recentActivities.map((item) => { const Icon = activityIcon[item.kind]; return <div className={styles.activityRow} key={item.id}><span className={`${styles.activityIcon} ${styles[item.kind]}`}><Icon size={16} /></span><div className={styles.activityCopy}><strong>{item.label}</strong><small>{item.detail}</small></div><time>{formatDate(item.time)}</time></div>; })}</div> : <div className={styles.emptyState}><Clock3 size={20} /><p>{isLoading ? "Lecture des opérations…" : "Aucune activité enregistrée pour le moment."}</p></div>}
          </section>

          <aside className={styles.alertPanel} aria-labelledby="attention-title">
            <div className={styles.sectionHeader}><div><span className={styles.sectionKicker}><AlertCircle size={13} /> À surveiller</span><h2 id="attention-title">Points d’attention</h2></div></div>
            <div className={styles.alertList}>
              {!openSession && <div className={styles.alertRow}><span className={styles.alertIcon}><WalletCards size={15} /></span><div><strong>Caisse fermée</strong><small>Une session doit être ouverte pour vendre.</small></div></div>}
              {lowStockProducts.slice(0, 3).map((product) => <div className={styles.alertRow} key={product.id}><span className={styles.alertIcon}><Package size={15} /></span><div><strong>{product.name}</strong><small>Stock restant : {product.remaining_stock}</small></div></div>)}
              {healthEvents.some((event) => event.mortality_count > 0) && <div className={styles.alertRow}><span className={styles.alertIcon}><Bird size={15} /></span><div><strong>Suivi sanitaire requis</strong><small>Une perte a été signalée dans l’élevage.</small></div></div>}
              {openSession && !lowStockProducts.length && !healthEvents.some((event) => event.mortality_count > 0) && <div className={styles.clearState}><CheckCircle2 size={18} /><span>Tout est sous contrôle.</span></div>}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}