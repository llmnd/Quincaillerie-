"use client";

import styles from "./page.module.css";

type ChartProps = {
  revenue: number;
  expenses: number;
  netResult: number;
  vatAmount: number;
  trialBalance: { code: string; name: string; balance: number; debit: number; credit: number }[];
};

export default function AccountingCharts({
  revenue,
  expenses,
  netResult,
  vatAmount,
  trialBalance,
}: ChartProps) {
  // Agrégation SYSCOHADA par classe
  const syscohadaClasses = [
    { title: "Classe 1 - Capitaux Permanents", prefix: "1" },
    { title: "Classe 2 - Actif Immobilisé", prefix: "2" },
    { title: "Classe 3 - Stocks", prefix: "3" },
    { title: "Classe 4 - Tiers (Créances / Dettes)", prefix: "4" },
    { title: "Classe 5 - Trésorerie", prefix: "5" },
    { title: "Classe 6 - Charges d'Exploitation", prefix: "6" },
    { title: "Classe 7 - Produits d'Exploitation", prefix: "7" },
  ];

  const classData = syscohadaClasses.map((item) => {
    const total = trialBalance
      .filter((row) => row.code.startsWith(item.prefix))
      .reduce((sum, row) => sum + Math.abs(row.balance), 0);
    return { name: item.title, value: total };
  });

  const maxVal = Math.max(...classData.map((d) => d.value), 1);

  // Courbe dynamique SVG Produits vs Charges
  const totalVolume = revenue + expenses || 1;
  const revY = 130 - Math.min(100, Math.max(15, (revenue / totalVolume) * 110));
  const expY = 130 - Math.min(100, Math.max(10, (expenses / totalVolume) * 110));

  return (
    <div className={styles.chartsGrid}>
      {/* COURBE EVOLUTION / PERFORMANCES (Odoo Style) */}
      <article className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <span className={styles.eyebrow}>Vue d'ensemble</span>
            <h3>Produits vs Charges</h3>
          </div>
          <div className={styles.chartLegend}>
            <span><i className={styles.dotRevenue} /> Classe 7 (Produits)</span>
            <span><i className={styles.dotExpense} /> Classe 6 (Charges)</span>
          </div>
        </div>

        <div className={styles.svgWrapper}>
          <svg viewBox="0 0 500 140" className={styles.lineChartSvg}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#52c41a" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#52c41a" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Lignes de repère */}
            <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.05)" />
            <line x1="0" y1="75" x2="500" y2="75" stroke="rgba(255,255,255,0.05)" />
            <line x1="0" y1="120" x2="500" y2="120" stroke="rgba(255,255,255,0.05)" />

            {/* Gradient sous courbe Produits */}
            <polygon
              points={`0,130 0,${revY + 15} 125,${revY + 5} 250,${revY + 10} 375,${revY - 10} 500,${revY} 500,130`}
              fill="url(#gradRevenue)"
            />

            {/* Ligne Produits (Classe 7) */}
            <polyline
              fill="none"
              stroke="#52c41a"
              strokeWidth="2.5"
              points={`0,${revY + 15} 125,${revY + 5} 250,${revY + 10} 375,${revY - 10} 500,${revY}`}
            />

            {/* Ligne Charges (Classe 6) */}
            <polyline
              fill="none"
              stroke="#ff4d4f"
              strokeWidth="2"
              strokeDasharray="4 4"
              points={`0,${expY + 20} 125,${expY + 10} 250,${expY + 5} 375,${expY + 12} 500,${expY}`}
            />
          </svg>
        </div>

        <div className={styles.chartFooter}>
          <div>
            <small>Solde de Gestion (Résultat Net)</small>
            <strong className={netResult >= 0 ? styles.good : styles.warning}>
              {netResult.toLocaleString("fr-FR")} FCFA
            </strong>
          </div>
          <div>
            <small>TVA Collectée (18%)</small>
            <strong>{vatAmount.toLocaleString("fr-FR")} FCFA</strong>
          </div>
        </div>
      </article>

      {/* REPARTITION DES CLASSES SYSCOHADA */}
      <article className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <span className={styles.eyebrow}>Plan Comptable SYSCOHADA</span>
            <h3>Masse Financière par Classe</h3>
          </div>
        </div>

        <div className={styles.barChartContainer}>
          {classData.map((item, index) => {
            const percentage = Math.round((item.value / maxVal) * 100);
            return (
              <div className={styles.barGroup} key={index}>
                <div className={styles.barLabelGroup}>
                  <span>{item.name}</span>
                  <strong>{item.value.toLocaleString("fr-FR")} FCFA</strong>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${Math.max(percentage, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </div>
  );
}