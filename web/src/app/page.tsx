'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, ShoppingCart, WalletCards } from "lucide-react";
import {
  authHeaders,
  clearStoredAuth,
  restoreAuthSession,
  type AuthUser,
} from "../lib/auth";
import styles from "./page.module.css";

const modules = [
  ["01", "Ventes", "ventes", "https://i.pinimg.com/1200x/cf/f9/34/cff9349aa326663fdbff5b863c4c3a72.jpg"],
  ["02", "Produits", "produits", "https://i.pinimg.com/1200x/06/a0/80/06a080194e88100b55e25cdfdf51d7f4.jpg"],
  ["03", "Caisse", "caisse", "https://i.pinimg.com/736x/8c/33/e3/8c33e3983e190056f12c75841a8ecdd0.jpg"],
  ["04", "Clients", "clients", "https://i.pinimg.com/736x/5e/97/c1/5e97c160d37c1e422df3dea82e47c5ff.jpg"],
  ["05", "Stock", "stock", "https://i.pinimg.com/1200x/d8/43/df/d843df2ec1fa940efc4834eb655777d8.jpg"],
  ["06", "Élevage", "elevage", "https://i.pinimg.com/736x/ed/f6/91/edf69125695ac5b4e1e50cbaabfe0d9f.jpg"],
] as const;

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (window.sessionStorage.getItem("quincaillerie_authenticated") !== "1") {
      clearStoredAuth();
      return;
    }

    restoreAuthSession().then(setUser);
  }, []);

  async function handleLogout() {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
      });
    } finally {
      clearStoredAuth();
      window.sessionStorage.removeItem("quincaillerie_authenticated");
      setUser(null);
      setMenuOpen(false);
    }
  }

  return (
    <main className={styles.landingPage}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="MIZAN ERP, accueil">
          <span className={styles.brandMark}>M</span>
          <span><small>Amanah · Ihsan · Baraka</small><strong>MIZAN ERP</strong></span>
        </Link>
        <div className={styles.headerActions}>
          {user ? <>
            <Link href="/workspace" className={styles.workspaceButton}>Workspace</Link>
            <button type="button" className={styles.logoutButton} onClick={handleLogout}>Se déconnecter</button>
          </> : null}
          <button type="button" className={styles.menuButton} aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <span className={styles.menuButtonInner}><span className={styles.menuLine} /><span className={styles.menuLine} /></span>
          </button>
        </div>
      </header>

      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ""}`}>
        <div className={styles.mobileMenuInner}>
          {user ? <>
            <Link href="/workspace" className={styles.mobileLoginButton} onClick={() => setMenuOpen(false)}>Ouvrir le workspace</Link>
            <button type="button" className={styles.mobileLogoutButton} onClick={handleLogout}>Se déconnecter</button>
          </> : <Link href="/login" className={styles.mobileLoginButton} onClick={() => setMenuOpen(false)}>Se connecter</Link>}
          <nav className={styles.mobileNav} aria-label="Menu mobile">
            <a href="#solution" onClick={() => setMenuOpen(false)}>La solution</a>
            <a href="#fonctionnalites" onClick={() => setMenuOpen(false)}>Fonctionnalités</a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
            <a href="/legal/support" onClick={() => setMenuOpen(false)}>Support</a>
          </nav>
        </div>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>ERP modulaire et multi-entreprises</p>
          <p className={styles.heroText}>Gérez votre activité. Gardez l’équilibre. Mizan.</p>
          <div className={styles.heroActions}>
            {user ? <Link href="/workspace" className={styles.primaryButton}>Ouvrir le bureau</Link> : null}
            <Link href={user ? "/workspace" : "/login"} className={styles.primaryButton}>{user ? "Ouvrir le workspace" : "Commencer"}</Link>
            <a href="#solution" className={styles.textButton}>Découvrir <span>↓</span></a>
          </div>
          {!user && <section className={styles.moduleShowcase} aria-label="Modules Mizan">
            <div className={styles.moduleShowcaseGrid}>
              {modules.map(([number, name, slug, image]) => <Link key={name} href={`/presentation/${slug}`} className={styles.moduleShowcaseTile}>
                <div className={styles.moduleShowcaseIcon}><img src={image} alt="" className={styles.moduleShowcaseImage} /></div>
                <span className={styles.moduleShowcaseNumber}>{number}</span>
                <span className={styles.moduleShowcaseName}>{name}</span>
              </Link>)}
            </div>
          </section>}
        </div>

        <div className={styles.heroArtwork} aria-label="Aperçu de l’interface MIZAN">
          <div className={styles.phone}><div className={styles.phoneNotch} /><div className={styles.phoneScreen}>
            <div className={styles.appHeader}>
              <span className={styles.appEyebrow}>VOTRE ACTIVITÉ</span>
              <h3 className={styles.appTitle}>Bonjour, Lamine</h3>
              <p className={styles.appSubtitle}>Une vue simple de votre journée.</p>
            </div>
            <div className={styles.dashboardGrid}>
              <div className={`${styles.dashCard} ${styles.highlightCard}`}><span className={styles.cardLabel}>Ventes du jour</span><div className={styles.metricRow}><span className={styles.metricIcon}><ShoppingCart size={11} /></span><strong className={styles.cardValue}>5</strong></div></div>
              <div className={styles.dashCard}><span className={styles.cardLabel}>Caisse</span><div className={styles.metricRow}><span className={styles.metricIcon}><WalletCards size={11} /></span><strong className={`${styles.cardValue} ${styles.greenText}`}>Active</strong></div></div>
              <div className={styles.dashCard}><span className={styles.cardLabel}>Alertes</span><div className={styles.metricRow}><span className={styles.metricIconRed}><AlertTriangle size={11} /></span><strong className={`${styles.cardValue} ${styles.redValue}`}>2</strong></div></div>
              <div className={styles.dashCard}><span className={styles.cardLabel}>Stock à surveiller</span><div className={styles.metricRow}><span className={styles.metricIconRed}><AlertTriangle size={11} /></span><strong className={`${styles.cardValue} ${styles.redValue}`}>4</strong></div></div>
            </div>
            <div className={styles.tracabilityCard}>
              <div className={styles.tracabilityHeader}><span className={styles.tracabilityTitle}>ACTIVITÉ RÉCENTE</span></div>
              <div className={styles.activityList}><div className={styles.activityRow}><span>Fatou a vendu une perceuse</span><strong>35 000 FCFA</strong></div></div>
            </div>
          </div></div>
        </div>
      </section>

      <section id="solution" className={styles.statement}>
        <p className={styles.eyebrow}>Une seule interface</p>
        <div><h2>Tout ce dont vous avez besoin. Rien de plus.</h2><p>Les données appartiennent à votre équipe. Le logiciel fournit les outils pour les faire vivre.</p></div>
      </section>

      <section id="fonctionnalites" className={styles.featureSection}>
        <div className={styles.sectionIntro}><div><p className={styles.eyebrow}>Pensé pour le quotidien</p><h2>Une base solide pour avancer.</h2></div></div>
        <div className={styles.featureGrid}>
          {["Vendre avec précision", "Piloter le stock", "Centraliser l’activité"].map((title, index) => <article key={title} className={styles.featureCard}><span>0{index + 1}</span><h3>{title}</h3><p>{["Créez vos ventes et maîtrisez chaque opération.", "Une vue claire de vos références et mouvements.", "Clients, rapports et données réunis."][index]}</p></article>)}
        </div>
      </section>

      <section id="contact" className={styles.ctaSection}><div><p className={styles.eyebrow}>Quand vous êtes prêt</p><h2>Commencez. Remplissez avec votre métier.</h2></div><Link href={user ? "/workspace" : "/login"} className={styles.primaryButton}>{user ? "Ouvrir le workspace" : "Se connecter"}</Link></section>
    </main>
  );
}
