"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const stats = [
  { label: "Ventes du jour", value: "18", detail: "+12.4 % vs hier" },
  { label: "CA mensuel", value: "42 850 $", detail: "8 commandes ce mois" },
  { label: "Clients actifs", value: "124", detail: "19 nouveaux" },
  { label: "Stock critique", value: "7", detail: "Produits à réapprovisionner" },
];

const sales = [
  { name: "Boulon M8", client: "R. Ménard", amount: "$1,240", time: "09:45" },
  { name: "Vis à béton", client: "B. Lavoie", amount: "$860", time: "10:20" },
  { name: "Ciment sacs 25 kg", client: "J. Tremblay", amount: "$2,100", time: "11:10" },
  { name: "Panneau MDF", client: "M. Dubé", amount: "$940", time: "13:35" },
];

const inventoryAlerts = [
  "Mâchefer - 3 unités restantes",
  "Colle à bois - seuil critique",
  "Piquets métalliques - réapprovisionnement prévu",
];

const navItems = ["Tableau de bord", "Ventes", "Clients", "Fournisseurs", "Stock", "Rapports"];

export default function Home() {
  const [backendStatus, setBackendStatus] = useState("Vérification...");
  const [productsCount, setProductsCount] = useState<number | null>(null);

  useEffect(() => {
    const loadBackendStatus = async () => {
      try {
        const healthResponse = await fetch(`${API_URL}/health`);
        if (!healthResponse.ok) {
          throw new Error("Health check failed");
        }

        const health = await healthResponse.json();
        setBackendStatus(health.status ?? "ok");

        const productsResponse = await fetch(`${API_URL}/api/v1/products`);
        if (productsResponse.ok) {
          const products = await productsResponse.json();
          setProductsCount(Array.isArray(products) ? products.length : 0);
        }
      } catch {
        setBackendStatus("Backend non accessible");
        setProductsCount(null);
      }
    };

    void loadBackendStatus();
  }, []);

  return (
    <div className={styles.dashboardShell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <div className={styles.brandMark}>Q</div>
          <div>
            <p className={styles.brandLabel}>Quincaillerie</p>
            <strong>ERP</strong>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Navigation principale">
          {navItems.map((item, index) => (
            <button
              key={item}
              type="button"
              className={index === 0 ? styles.navItemActive : styles.navItem}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarCard}>
          <span className={styles.cardEyebrow}>Backend</span>
          <strong>{backendStatus}</strong>
          <small>
            {productsCount !== null ? `${productsCount} produits chargés` : "Vérifiez NEXT_PUBLIC_API_URL"}
          </small>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.kicker}>Accueil</p>
            <h1>Tableau de bord</h1>
          </div>

          <div className={styles.topbarActions}>
            <button type="button" className={styles.secondaryButton}>
              Filtrer
            </button>
            <button type="button" className={styles.primaryButton}>
              + Nouvelle vente
            </button>
          </div>
        </header>

        <section className={styles.heroPanel}>
          <div>
            <p className={styles.kicker}>Performance globale</p>
            <h2>Gestion opérationnelle au quotidien</h2>
          </div>
          <div className={styles.heroMetrics}>
            <div>
              <span>Réservé</span>
              <strong>78%</strong>
            </div>
            <div>
              <span>Livraisons</span>
              <strong>24</strong>
            </div>
          </div>
        </section>

        <section className={styles.statsGrid}>
          {stats.map((stat) => (
            <article key={stat.label} className={styles.statCard}>
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
              <span>{stat.detail}</span>
            </article>
          ))}
        </section>

        <section className={styles.contentGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Ventes récentes</h3>
              <button type="button" className={styles.linkButton}>Voir tout</button>
            </div>

            <div className={styles.table}>
              <div className={styles.tableHead}>
                <span>Produit</span>
                <span>Client</span>
                <span>Montant</span>
                <span>Heure</span>
              </div>

              {sales.map((sale) => (
                <div key={`${sale.name}-${sale.time}`} className={styles.tableRow}>
                  <span>{sale.name}</span>
                  <span>{sale.client}</span>
                  <strong>{sale.amount}</strong>
                  <span>{sale.time}</span>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Alertes de stock</h3>
              <span className={styles.badge}>Urgent</span>
            </div>

            <ul className={styles.alertList}>
              {inventoryAlerts.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}
