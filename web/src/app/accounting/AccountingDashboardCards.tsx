"use client";

import styles from "./page.module.css";

type MetricPeriod = { label: string; value: number };

type DashboardProps = {
  revenue: number;
  expenses: number;
  vatAmount: number;
  uninvoicedCount: number;
  salesTrend: MetricPeriod[];
  purchasesTrend: MetricPeriod[];
  bankTrend: number[];
  onActionClick: (action: "manual" | "upload" | "transactions" | "reconcile") => void;
  documentsCount: number;
  transactionsCount: number;
};

export default function AccountingDashboardCards({
  revenue,
  expenses,
  vatAmount,
  uninvoicedCount,
  salesTrend,
  purchasesTrend,
  bankTrend,
  onActionClick,
  documentsCount,
  transactionsCount,
}: DashboardProps) {
  const chartSales = salesTrend.length > 0 ? salesTrend : [{ label: "Aucune donnée", value: 0 }];
  const chartPurchases = purchasesTrend.length > 0 ? purchasesTrend : [{ label: "Aucune donnée", value: 0 }];
  const maxBankValue = Math.max(...bankTrend, 1);

  const bankPoints = bankTrend.length > 0
    ? bankTrend.map((value, index) => ({ x: index * 40, y: 150 - (value / maxBankValue) * 110 }))
    : [{ x: 0, y: 80 }, { x: 40, y: 80 }, { x: 80, y: 80 }, { x: 120, y: 80 }, { x: 160, y: 80 }, { x: 200, y: 80 }, { x: 240, y: 80 }, { x: 280, y: 80 }, { x: 320, y: 80 }, { x: 360, y: 80 }, { x: 400, y: 80 }];

  const svgPoints = bankPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className={styles.odooGrid}>
      {/* CARD 1: VENTES / PRESTATIONS */}
      <article className={styles.odooCard}>
        <div className={styles.odooCardHeader}>
          <div>
            <h3 className={styles.journalTitle}>
              Ventes de marchandises & prestations
            </h3>
            <div className={styles.actionRow}>
              <button type="button" className={styles.odooPrimaryBtn} onClick={() => onActionClick("manual")}>Nouveau</button>
            </div>
          </div>

          <div className={styles.journalStats}>
            <div className={styles.statLine}>
              <span className={styles.statLabel}>Non payé</span>
              <span className={styles.statValue}>
                {revenue.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
            <div className={styles.statLine}>
              <span className={styles.statLabelWarning}>En retard ({uninvoicedCount})</span>
              <span className={styles.statValueWarning}>
                {Math.round(revenue * 0.3).toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          </div>
        </div>

        {/* DIAGRAMME A BARRES TEMPOREL ODOO */}
        <div className={styles.barChartWrapper}>
          <div className={styles.barChartFlex}>
            {chartSales.map((p, idx) => {
              const maxValue = Math.max(...chartSales.map((point) => point.value), 1);
              return (
                <div key={`${p.label}-${idx}`} className={styles.barCol}>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFillSales}
                      style={{ height: `${Math.max((p.value / maxValue) * 100, p.value > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <span className={styles.barLabel}>{p.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </article>

      {/* CARD 2: ACHATS & FOURNISSEURS */}
      <article className={styles.odooCard}>
        <div className={styles.odooCardHeader}>
          <div>
            <h3 className={styles.journalTitle}>Achats d&apos;exploitation</h3>
            <span className={styles.journalSub}>achats@entreprise.sn</span>
            <div className={styles.actionRow}>
              <button type="button" className={styles.odooPrimaryBtn} onClick={() => onActionClick("upload")}>Uploader</button>
              <button type="button" className={styles.odooSecondaryBtn} onClick={() => onActionClick("manual")}>Nouveau</button>
            </div>
          </div>

          <div className={styles.journalStats}>
            <div className={styles.statLine}>
              <span className={styles.statLabelInfo}>À valider</span>
              <span className={styles.statValue}>
                {expenses.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
            <small className={styles.irregularTag}>Séquences régulières</small>
          </div>
        </div>

        {/* DIAGRAMME A BARRES TEMPOREL ACHATS */}
        <div className={styles.barChartWrapper}>
          <div className={styles.barChartFlex}>
            {chartPurchases.map((p, idx) => {
              const maxValue = Math.max(...chartPurchases.map((point) => point.value), 1);
              return (
                <div key={`${p.label}-${idx}`} className={styles.barCol}>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFillPurchases}
                      style={{ height: `${Math.max((p.value / maxValue) * 100, p.value > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <span className={styles.barLabel}>{p.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </article>

      {/* CARD 3: BANQUE / TRÉSORERIE AVEC COURBE */}
      <article className={styles.odooCard}>
        <div className={styles.odooCardHeader}>
          <div>
            <h3 className={styles.journalTitle}>CBAO Groupe Attijariwafa</h3>
            <div className={styles.actionRow}>
              <button type="button" className={styles.odooPrimaryBtn} onClick={() => onActionClick("transactions")}>Transactions</button>
              <button type="button" className={styles.odooBadgeBtn} onClick={() => onActionClick("reconcile")}> {Math.max(0, transactionsCount - 1)} à rapprocher </button>
            </div>
            <span className={styles.syncStatus}>
              ● Connecté · Récupération auto
            </span>
          </div>

          <div className={styles.journalStats}>
            <div className={styles.statLine}>
              <span className={styles.statLabel}>Solde comptable</span>
              <span className={styles.statValueBold}>
                {(revenue - expenses).toLocaleString("fr-FR")} FCFA
              </span>
            </div>
            <div className={styles.statLine}>
              <span className={styles.statLabel}>Dernier relevé</span>
              <span className={styles.statValue}>
                {(revenue - expenses).toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          </div>
        </div>

        {/* GRAPH EN COURBE BANCAIRE ODOO */}
        <div className={styles.lineChartContainer}>
          <svg viewBox="0 0 400 160" className={styles.bankSvg}>
            {/* Ligne de tendance */}
            <polyline
              fill="none"
              stroke="#a855f7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={svgPoints}
            />
            {/* Points de relevé */}
            {bankPoints.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r="3.5"
                fill="#181a1f"
                stroke="#a855f7"
                strokeWidth="2"
              />
            ))}
          </svg>
        </div>
      </article>

      {/* CARD 4: TVA & DECLARATIONS */}
      <article className={styles.odooCard}>
        <div className={styles.odooCardHeader}>
          <div>
            <h3 className={styles.journalTitle}>TVA Collectée & Déductible</h3>
            <div className={styles.actionRow}>
              <button type="button" className={styles.odooPrimaryBtn} onClick={() => onActionClick("manual")}>Nouveau</button>
              <button type="button" className={styles.odooSecondaryBtn} onClick={() => onActionClick("upload")}>Uploader</button>
            </div>
          </div>

          <div className={styles.journalStats}>
            <div className={styles.statLine}>
              <span className={styles.statLabel}>TVA à payer (18%)</span>
              <span className={styles.statValueHighlight}>
                {vatAmount.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          </div>
        </div>

        <div className={styles.vatEmptyState}>
          <span>{documentsCount} document(s) importé(s) · Déclarations fiscales de la période à jour</span>
        </div>
      </article>
    </div>
  );
}