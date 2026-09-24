"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Archive,
  Bird,
  Boxes,
  CheckCircle2,
  Clock3,
  Grid,
  Package,
  RefreshCw,
  ShoppingCart,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import AppShell from "../../components/AppShell";
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
type OrganizationProfile = { name: string; logo?: string | null };
type ChartPeriod = "7d" | "30d" | "12m";
type MetricKey = "sales" | "cash" | "stock" | "relations";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const formatMoney = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;
const formatDate = (value: string) =>
  new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
const isToday = (value: string) =>
  new Date(value).toDateString() === new Date().toDateString();
const isYesterday = (value: string) => {
  const d = new Date(value);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString();
};

const chartPeriodLength: Record<ChartPeriod, number> = { "7d": 7, "30d": 30, "12m": 12 };
const chartPeriodLabels: Record<ChartPeriod, string> = { "7d": "7 jours", "30d": "30 jours", "12m": "12 mois" };

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const value = window.localStorage.getItem("quincaillerie_user");
      if (!value) {
        setUser(null);
        return;
      }
      const parsed = JSON.parse(value) as User & { user?: User };
      setUser(parsed.user ?? parsed);
    } catch (error) {
      console.error("Erreur de lecture du profil utilisateur", error);
      setUser(null);
    }
  }, []);

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
  const [organization, setOrganization] = useState<OrganizationProfile | null>(null);
  const [archivedActivityIds, setArchivedActivityIds] = useState<string[]>([]);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("7d");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);

  async function fetchJson<T>(path: string): Promise<T | null> {
    try {
      const response = await fetch(`${API_URL}${path}`, {
        headers: authHeaders(),
        credentials: "include",
      });
      return response.ok ? ((await response.json()) as T) : null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("quincaillerie_archived_activities");
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) {
          setArchivedActivityIds(parsed);
        }
      }
    } catch (error) {
      console.error("Erreur de lecture des activités archivées", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "quincaillerie_archived_activities",
        JSON.stringify(archivedActivityIds)
      );
    } catch (error) {
      console.error("Erreur de sauvegarde des activités archivées", error);
    }
  }, [archivedActivityIds]);

  useEffect(() => {
    let isMounted = true;

    const initializeDashboard = async () => {
      setIsLoading(true);

      try {
        const [
          saleData,
          productData,
          movementData,
          sessionData,
          batchData,
          healthData,
          eggData,
          customerData,
          organizationData,
        ] = await Promise.all([
          fetchJson<Sale[]>("/api/v1/sales"),
          fetchJson<Product[]>("/api/v1/products"),
          fetchJson<StockMovement[]>("/api/v1/stock-movements"),
          fetchJson<CashSession[]>("/api/v1/cash/sessions"),
          fetchJson<Batch[]>("/api/v1/farming/batches"),
          fetchJson<HealthEvent[]>("/api/v1/farming/health-events"),
          fetchJson<EggProduction[]>("/api/v1/farming/egg-productions"),
          fetchJson<{ id: number }[]>("/api/v1/customers"),
          fetchJson<OrganizationProfile>("/api/v1/organization/profile"),
        ]);

        if (!isMounted) return;

        if (saleData) setSales(saleData);
        if (productData) setProducts(productData);
        if (movementData) setMovements(movementData);
        if (sessionData) setSessions(sessionData);
        if (batchData) setBatches(batchData);
        if (healthData) setHealthEvents(healthData);
        if (eggData) setEggProductions(eggData);
        if (customerData) setCustomerCount(customerData.length);
        if (organizationData) setOrganization(organizationData);
        setLastUpdated(new Date());
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initializeDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const firstName = user?.full_name ? user.full_name.split(" ")[0] : "";

  const todaySales = sales.filter((sale) => isToday(sale.sale_date));
  const todayRevenue = todaySales.reduce((total, sale) => total + sale.total_amount, 0);

  const yesterdayRevenue = sales
    .filter((sale) => isYesterday(sale.sale_date))
    .reduce((total, sale) => total + sale.total_amount, 0);

  const salesDelta =
    yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : null;

  const openSession = sessions.find((session) => session.status === "open");
  const lowStockProducts = products.filter((product) => product.remaining_stock <= 5);
  const activeBatches = batches.filter((batch) => batch.status === "active");

  const recentActivities: ActivityItem[] = [
    ...sales.slice(0, 8).map((sale) => ({
      id: `sale-${sale.id}`,
      label: "Vente enregistrée",
      detail: formatMoney(sale.total_amount),
      time: sale.sale_date,
      kind: "sale" as const,
    })),
    ...movements.slice(0, 8).map((movement) => ({
      id: `stock-${movement.id}`,
      label: movement.movement_type === "sale" ? "Sortie de stock" : "Mouvement de stock",
      detail: `${movement.quantity} unité${movement.quantity > 1 ? "s" : ""}`,
      time: movement.created_at,
      kind: "stock" as const,
    })),
    ...sessions.slice(0, 4).map((session) => ({
      id: `cash-${session.id}`,
      label: session.status === "open" ? "Caisse ouverte" : "Session clôturée",
      detail: `Caisse #${session.register_id}`,
      time: session.opened_at,
      kind: "cash" as const,
    })),
    ...batches.slice(0, 4).map((batch) => ({
      id: `batch-${batch.id}`,
      label: "Bande créée",
      detail: `${batch.reference} · ${batch.current_count} sujets`,
      time: batch.created_at,
      kind: "farm" as const,
    })),
    ...healthEvents.slice(0, 4).map((event) => ({
      id: `health-${event.id}`,
      label: event.title,
      detail: event.mortality_count
        ? `${event.mortality_count} perte${event.mortality_count > 1 ? "s" : ""}`
        : "Suivi sanitaire",
      time: event.event_date,
      kind: "farm" as const,
    })),
    ...eggProductions.slice(0, 8).map((production) => ({
      id: `egg-${production.id}`,
      label: "Récolte d'œufs",
      detail: `${production.quantity} œuf${production.quantity > 1 ? "s" : ""} · ${production.damaged_quantity} cassé${production.damaged_quantity > 1 ? "s" : ""}`,
      time: production.created_at,
      kind: "farm" as const,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 16);

  const visibleRecentActivities = recentActivities.filter(
    (activity) => !archivedActivityIds.includes(activity.id)
  );

  const toggleArchiveActivity = (id: string) => {
    setArchivedActivityIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  };

  const archiveCount = archivedActivityIds.length;

  const salesTrend = useMemo(() => {
    const periodLength = chartPeriodLength[chartPeriod];
    const periodUnit = chartPeriod === "12m" ? "month" : "day";

    const days = Array.from({ length: periodLength }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      if (periodUnit === "month") {
        date.setDate(1);
        date.setMonth(date.getMonth() - (periodLength - 1 - index));
      } else {
        date.setDate(date.getDate() - (periodLength - 1 - index));
      }
      return {
        key:
          periodUnit === "month"
            ? date.toISOString().slice(0, 7)
            : date.toISOString().slice(0, 10),
        label:
          periodUnit === "month"
            ? date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")
            : date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
        revenue: 0,
        count: 0,
      };
    });

    for (const sale of sales) {
      const saleDate = new Date(sale.sale_date);
      const key =
        periodUnit === "month"
          ? saleDate.toISOString().slice(0, 7)
          : saleDate.toISOString().slice(0, 10);
      const day = days.find((entry) => entry.key === key);
      if (day) {
        day.revenue += sale.total_amount;
        day.count += 1;
      }
    }

    const currentTotal = days.reduce((total, day) => total + day.revenue, 0);

    const previousStart = new Date(days[0].key);
    if (periodUnit === "month") previousStart.setMonth(previousStart.getMonth() - periodLength);
    else previousStart.setDate(previousStart.getDate() - periodLength);

    const previousTotal = sales.reduce((total, sale) => {
      const saleDate = new Date(sale.sale_date);
      const periodEnd = new Date(days[0].key);
      return saleDate >= previousStart && saleDate < periodEnd
        ? total + sale.total_amount
        : total;
    }, 0);

    const maxRevenue = Math.max(...days.map((day) => day.revenue), 1);
    const maxCount = Math.max(...days.map((day) => day.count), 1);

    /* --- Points avec padding horizontal : x de 4 % à 96 % --- */
    const points = days.map((day, index) => ({
      x: 4 + (index / (days.length - 1)) * 92,
      revenueY: 92 - (day.revenue / maxRevenue) * 68,
      countY: 92 - (day.count / maxCount) * 48,
    }));

    const bestDay = days.reduce(
      (best, day) => (day.revenue > best.revenue ? day : best),
      days[0]
    );

    return {
      days,
      points,
      revenuePath: points.map((point) => `${point.x},${point.revenueY}`).join(" "),
      countPath: points.map((point) => `${point.x},${point.countY}`).join(" "),
      totalRevenue: days.reduce((total, day) => total + day.revenue, 0),
      totalCount: days.reduce((total, day) => total + day.count, 0),
      bestDay,
      bestDayLabel: bestDay.revenue ? formatMoney(bestDay.revenue) : "—",
      periodLabel: chartPeriodLabels[chartPeriod],
      changePercent:
        previousTotal > 0
          ? ((currentTotal - previousTotal) / previousTotal) * 100
          : null,
      changeLabel:
        previousTotal > 0
          ? `${currentTotal >= previousTotal ? "+" : ""}${Math.round(
              ((currentTotal - previousTotal) / previousTotal) * 100
            )} %`
          : "—",
      changeTone:
        previousTotal > 0 && currentTotal >= previousTotal ? "good" : "warning",
    };
  }, [chartPeriod, sales]);

  const handleChartHover = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const count = salesTrend.points.length;
    const idx = Math.max(0, Math.min(count - 1, Math.round((x / 100) * (count - 1))));
    setHoverIndex(idx);
  };

  /* Clamp horizontal du tooltip pour éviter qu'il sorte du panneau */
  const rawTooltipX =
    hoverIndex !== null ? salesTrend.points[hoverIndex].x : null;
  const clampedTooltipX =
    rawTooltipX !== null ? Math.max(15, Math.min(85, rawTooltipX)) : null;

  const activityIcon = { sale: ShoppingCart, stock: Package, cash: WalletCards, farm: Bird };
  const closeMetric = () => setActiveMetric(null);

  useEffect(() => {
    if (!activeMetric) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMetric();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeMetric]);

  return (
    <AppShell>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerInfo}>
            <span className={styles.eyebrow}>
              <Grid size={12} className={styles.eyebrowIcon} />
              ESPACE D&apos;EXPLOITATION
            </span>
            <h3 className={styles.title}>
              {firstName ? `BONJOUR, ${firstName.toUpperCase()}` : "TABLEAU DE BORD"}
            </h3>
          </div>

          <div className={styles.headerMeta}>
            {organization && (
              <div className={styles.organizationIdentity}>
                {organization.logo ? (
                  <img src={organization.logo} alt="" className={styles.organizationLogo} />
                ) : (
                  <span className={styles.organizationFallback}>
                    {organization.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <strong>{organization.name}</strong>
              </div>
            )}
            <span>
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
            <button
              type="button"
              className={styles.refreshButton}
              onClick={() => {
                setIsLoading(true);
                void (async () => {
                  const [
                    saleData,
                    productData,
                    movementData,
                    sessionData,
                    batchData,
                    healthData,
                    eggData,
                    customerData,
                  ] = await Promise.all([
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
                })();
              }}
              aria-label="Actualiser l'activité"
              title="Actualiser"
            >
              <RefreshCw size={15} className={isLoading ? styles.spinning : ""} />
            </button>
          </div>
        </header>

        <section className={styles.metricGrid} aria-label="Indicateurs de l'organisation">
          <button
            type="button"
            className={`${styles.metricCard} ${styles.metricAccent}`}
            onClick={() => setActiveMetric("sales")}
            aria-label="Voir le détail des ventes du jour"
          >
            <span>Ventes du jour</span>
            <div className={styles.metricValue}>
              <strong className={!isLoading && todayRevenue === 0 ? styles.zeroValue : undefined}>
                {isLoading ? "—" : formatMoney(todayRevenue)}
              </strong>
              {salesDelta !== null && !isLoading ? (
                <span
                  className={`${styles.delta} ${
                    salesDelta >= 0 ? styles.deltaUp : styles.deltaDown
                  }`}
                  title={`Hier : ${formatMoney(yesterdayRevenue)}`}
                >
                  {salesDelta >= 0 ? "▲" : "▼"} {Math.abs(Math.round(salesDelta))}%
                </span>
              ) : (
                <span className={`${styles.delta} ${styles.deltaHidden}`} aria-hidden="true">
                  0%
                </span>
              )}
            </div>
            <small>
              <ShoppingCart size={13} /> {todaySales.length} vente
              {todaySales.length > 1 ? "s" : ""}
              {salesDelta !== null ? " · vs hier" : ""}
            </small>
          </button>

          <button
            type="button"
            className={styles.metricCard}
            onClick={() => setActiveMetric("cash")}
            aria-label="Voir le détail de l'état de la caisse"
          >
            <span>État de la caisse</span>
            <strong>{openSession ? "ACTIVE" : "FERMÉE"}</strong>
            <small className={openSession ? styles.good : styles.muted}>
              <WalletCards size={13} />{" "}
              {openSession ? `Caisse #${openSession.register_id}` : "Aucune session ouverte"}
            </small>
          </button>

          <button
            type="button"
            className={styles.metricCard}
            onClick={() => setActiveMetric("stock")}
            aria-label="Voir le détail du stock à surveiller"
          >
            <span>Stock à surveiller</span>
            <strong className={lowStockProducts.length === 0 ? styles.zeroValue : undefined}>
              {lowStockProducts.length}
            </strong>
            <small className={lowStockProducts.length ? styles.warning : styles.good}>
              <Boxes size={13} /> référence{lowStockProducts.length > 1 ? "s" : ""} concernée
              {lowStockProducts.length > 1 ? "s" : ""}
            </small>
          </button>

          <button
            type="button"
            className={styles.metricCard}
            onClick={() => setActiveMetric("relations")}
            aria-label="Voir le détail de l'équipe et des relations"
          >
            <span>Équipe &amp; relations</span>
            <strong className={customerCount === 0 ? styles.zeroValue : undefined}>
              {customerCount}
            </strong>
            <small>
              <Users size={13} /> clients enregistrés · {activeBatches.length} bande
              {activeBatches.length > 1 ? "s" : ""} active
              {activeBatches.length > 1 ? "s" : ""}
            </small>
          </button>
        </section>

        <section className={styles.salesTrendPanel} aria-labelledby="sales-trend-title">
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionKicker}>
                <Activity size={13} /> Ventes
              </span>
              <h2 id="sales-trend-title">Évolution des ventes</h2>
            </div>
            <div className={styles.chartLegend}>
              <span>
                <i className={styles.revenueDot} /> Chiffre d&apos;affaires
              </span>
              <span>
                <i className={styles.countDot} /> Volume
              </span>
            </div>
          </div>

          <div className={styles.chartPeriods} aria-label="Période du graphique des ventes">
            {(["7d", "30d", "12m"] as const).map((period) => (
              <button
                key={period}
                type="button"
                className={chartPeriod === period ? styles.chartPeriodActive : styles.chartPeriod}
                onClick={() => setChartPeriod(period)}
              >
                {chartPeriodLabels[period]}
              </button>
            ))}
          </div>

          <div className={styles.chartSummary}>
            <span>
              <small>{salesTrend.periodLabel}</small>
              <strong>{formatMoney(salesTrend.totalRevenue)}</strong>
            </span>
            <span>
              <small>Transactions</small>
              <strong>{salesTrend.totalCount}</strong>
            </span>
            <span>
              <small>Meilleur jour</small>
              <strong>{salesTrend.bestDayLabel}</strong>
            </span>
            <span>
              <small>Évolution</small>
              <strong className={styles[salesTrend.changeTone]}>
                {salesTrend.changeLabel}
              </strong>
            </span>
          </div>

          <div className={styles.salesChart}>
            <div
              className={styles.chartWrap}
              onMouseMove={handleChartHover}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                role="img"
                aria-label="Évolution du chiffre d'affaires et du volume des ventes"
              >
                <line x1="0" y1="24" x2="100" y2="24" className={styles.chartGridLine} />
                <line x1="0" y1="58" x2="100" y2="58" className={styles.chartGridLine} />
                <line x1="0" y1="92" x2="100" y2="92" className={styles.chartGridLine} />
                <polygon
                  points={`4,92 ${salesTrend.revenuePath} 96,92`}
                  className={styles.revenueArea}
                />
                <polyline
                  points={salesTrend.revenuePath}
                  className={styles.revenueLine}
                  vectorEffect="non-scaling-stroke"
                />
                <polyline
                  points={salesTrend.countPath}
                  className={styles.countLine}
                  vectorEffect="non-scaling-stroke"
                />
                {salesTrend.points.map((point, i) => (
                  <circle
                    key={`${point.x}-${point.revenueY}`}
                    cx={point.x}
                    cy={point.revenueY}
                    r={hoverIndex === i ? 2.2 : 1.4}
                    className={`${styles.revenuePoint} ${
                      hoverIndex === i ? styles.revenuePointActive : ""
                    }`}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>

              {hoverIndex !== null && clampedTooltipX !== null && (
                <>
                  <span
                    className={styles.crosshair}
                    style={{ left: `${salesTrend.points[hoverIndex].x}%` }}
                    aria-hidden
                  />
                  <div
                    className={styles.chartTooltip}
                    style={{ left: `${clampedTooltipX}%` }}
                    role="tooltip"
                  >
                    <span className={styles.tooltipDay}>
                      {salesTrend.days[hoverIndex].label}
                    </span>
                    <strong>{formatMoney(salesTrend.days[hoverIndex].revenue)}</strong>
                    <small>
                      {salesTrend.days[hoverIndex].count} vente
                      {salesTrend.days[hoverIndex].count > 1 ? "s" : ""}
                    </small>
                  </div>
                </>
              )}
            </div>

            <div className={styles.chartLabels}>
              {salesTrend.days.map((day) => (
                <span key={day.key}>{day.label}</span>
              ))}
            </div>
          </div>
        </section>

        <div className={styles.dashboardGrid}>
          <section className={styles.activityPanel} aria-labelledby="activity-title">
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionKicker}>
                  <Activity size={13} /> Traçabilité
                </span>
                <h2 id="activity-title">Activité récente</h2>
              </div>
              <div className={styles.sectionMeta}>
                <span className={styles.updatedAt}>
                  {lastUpdated
                    ? `Mis à jour à ${lastUpdated.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "Chargement…"}
                </span>
                {archiveCount > 0 && (
                  <button
                    type="button"
                    className={styles.restoreButton}
                    onClick={() => setArchivedActivityIds([])}
                  >
                    Rétablir ({archiveCount})
                  </button>
                )}
              </div>
            </div>

            {visibleRecentActivities.length ? (
              <div className={styles.activityList}>
                {visibleRecentActivities.map((item) => {
                  const Icon = activityIcon[item.kind];
                  return (
                    <div className={styles.activityRow} key={item.id}>
                      <span className={`${styles.activityIcon} ${styles[item.kind]}`}>
                        <Icon size={16} />
                      </span>
                      <div className={styles.activityCopy}>
                        <strong>{item.label}</strong>
                        <small>{item.detail}</small>
                      </div>
                      <time>{formatDate(item.time)}</time>
                      <button
                        type="button"
                        className={styles.archiveButton}
                        onClick={() => toggleArchiveActivity(item.id)}
                        aria-label={`Archiver ${item.label}`}
                        title="Archiver cette activité"
                      >
                        <Archive size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Clock3 size={20} />
                <p>
                  {archiveCount > 0
                    ? "Aucune activité visible dans le flux courant."
                    : isLoading
                    ? "Lecture des opérations…"
                    : "Aucune activité enregistrée pour le moment."}
                </p>
              </div>
            )}
          </section>

          <aside className={styles.alertPanel} aria-labelledby="attention-title">
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionKicker}>
                  <AlertCircle size={13} /> À surveiller
                </span>
                <h2 id="attention-title">Points d&apos;attention</h2>
              </div>
            </div>
            <div className={styles.alertList}>
              {!openSession && (
                <div className={styles.alertRow}>
                  <span className={styles.alertIcon}>
                    <WalletCards size={15} />
                  </span>
                  <div>
                    <strong>Caisse fermée</strong>
                    <small>Une session doit être ouverte pour vendre.</small>
                  </div>
                </div>
              )}

              {lowStockProducts.slice(0, 3).map((product) => (
                <div className={styles.alertRow} key={product.id}>
                  <span className={styles.alertIcon}>
                    <Package size={15} />
                  </span>
                  <div>
                    <strong>{product.name}</strong>
                    <small>Stock restant : {product.remaining_stock}</small>
                  </div>
                </div>
              ))}

              {healthEvents.some((event) => event.mortality_count > 0) && (
                <div className={styles.alertRow}>
                  <span className={styles.alertIcon}>
                    <Bird size={15} />
                  </span>
                  <div>
                    <strong>Suivi sanitaire requis</strong>
                    <small>Une perte a été signalée dans l&apos;élevage.</small>
                  </div>
                </div>
              )}

              {openSession &&
                !lowStockProducts.length &&
                !healthEvents.some((event) => event.mortality_count > 0) && (
                  <div className={styles.clearState}>
                    <CheckCircle2 size={18} />
                    <span>Tout est sous contrôle.</span>
                  </div>
                )}
            </div>
          </aside>
        </div>
      </div>

      {activeMetric && (
        <div
          className={styles.metricModalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeMetric();
          }}
        >
          <section
            className={styles.metricModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="metric-modal-title"
          >
            <div className={styles.metricModalHeader}>
              <div>
                <span className={styles.sectionKicker}>Détail de l&apos;indicateur</span>
                <h2 id="metric-modal-title">
                  {activeMetric === "sales" && "Ventes du jour"}
                  {activeMetric === "cash" && "État de la caisse"}
                  {activeMetric === "stock" && "Stock à surveiller"}
                  {activeMetric === "relations" && "Équipe & relations"}
                </h2>
              </div>
              <button type="button" className={styles.modalCloseButton} onClick={closeMetric} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>

            {activeMetric === "sales" && (
              <div className={styles.metricModalContent}>
                <div className={styles.modalSummary}>
                  <strong>{formatMoney(todayRevenue)}</strong>
                  <span>{todaySales.length} vente{todaySales.length > 1 ? "s" : ""} aujourd&apos;hui</span>
                </div>
                {todaySales.length ? (
                  <div className={styles.metricDetailList}>
                    {todaySales.map((sale) => (
                      <div className={styles.metricDetailRow} key={sale.id}>
                        <span>Vente #{sale.id}<small>{formatDate(sale.sale_date)} · {sale.payment_method}</small></span>
                        <strong>{formatMoney(sale.total_amount)}</strong>
                      </div>
                    ))}
                  </div>
                ) : <p className={styles.modalEmpty}>Aucune vente enregistrée aujourd&apos;hui.</p>}
              </div>
            )}

            {activeMetric === "cash" && (
              <div className={styles.metricModalContent}>
                <div className={styles.modalSummary}>
                  <strong>{openSession ? "ACTIVE" : "FERMÉE"}</strong>
                  <span>{openSession ? `Caisse #${openSession.register_id}` : "Aucune session ouverte"}</span>
                </div>
                {openSession ? (
                  <div className={styles.metricDetailList}>
                    <div className={styles.metricDetailRow}><span>Ouverture<small>{formatDate(openSession.opened_at)}</small></span><strong>{formatMoney(openSession.actual_opening_amount)}</strong></div>
                    <div className={styles.metricDetailRow}><span>Identifiant session</span><strong>#{openSession.id}</strong></div>
                  </div>
                ) : <p className={styles.modalEmpty}>Ouvrez une session pour commencer les ventes.</p>}
              </div>
            )}

            {activeMetric === "stock" && (
              <div className={styles.metricModalContent}>
                <div className={styles.modalSummary}>
                  <strong>{lowStockProducts.length}</strong>
                  <span>référence{lowStockProducts.length > 1 ? "s" : ""} sous le seuil de 5 unités</span>
                </div>
                {lowStockProducts.length ? (
                  <div className={styles.metricDetailList}>
                    {lowStockProducts.map((product) => (
                      <div className={styles.metricDetailRow} key={product.id}>
                        <span>{product.name}<small>Stock actuel · seuil d&apos;alerte 5</small></span>
                        <strong className={product.remaining_stock === 0 ? styles.danger : styles.warning}>{product.remaining_stock}</strong>
                      </div>
                    ))}
                  </div>
                ) : <p className={styles.modalEmpty}>Toutes les références ont un stock suffisant.</p>}
              </div>
            )}

            {activeMetric === "relations" && (
              <div className={styles.metricModalContent}>
                <div className={styles.relationSummaryGrid}>
                  <div><strong>{customerCount}</strong><span>clients enregistrés</span></div>
                  <div><strong>{activeBatches.length}</strong><span>bande{activeBatches.length > 1 ? "s" : ""} active{activeBatches.length > 1 ? "s" : ""}</span></div>
                </div>
                {activeBatches.length ? (
                  <div className={styles.metricDetailList}>
                    {activeBatches.map((batch) => (
                      <div className={styles.metricDetailRow} key={batch.id}>
                        <span>{batch.reference}<small>{batch.production_type} · créée le {formatDate(batch.created_at)}</small></span>
                        <strong>{batch.current_count} sujets</strong>
                      </div>
                    ))}
                  </div>
                ) : <p className={styles.modalEmpty}>Aucune bande active pour le moment.</p>}
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}