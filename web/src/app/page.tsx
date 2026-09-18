'use client';

import Link from "next/link";
import { useState } from "react";
import { PackageSearch, Users, Warehouse, RefreshCcw } from "lucide-react";
import styles from "./page.module.css";

const features = [
  {
    number: "01",
    title: "Vendre avec précision",
    text: "Créez vos ventes, gérez vos produits et maîtrisez chaque opération.",
  },
  {
    number: "02",
    title: "Piloter le stock",
    text: "Vue claire de vos références, entrées et sorties en temps réel.",
  },
  {
    number: "03",
    title: "Centraliser l'activité",
    text: "Clients, rapports et données unifiées dans un espace épuré.",
  },
];

const footerNav = [
  {
    category: "PLATEFORME",
    links: ["Fonctionnalités", "Documentation", "Open Source", "Nouveautés"],
  },
  {
    category: "SERVICES",
    links: ["Hébergement", "Assistance", "Partenaires", "Sur mesure"],
  },
  {
    category: "ÉCOSYSTÈME",
    links: ["Communauté", "Événements", "Blog", "Carrières"],
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className={styles.landingPage}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="MIZAN ERP, accueil">
          <span className={styles.brandMark}>M</span>
          <span>
            <small>Amanah · Ihsan · Baraka</small>
            <strong>MIZAN ERP</strong>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Navigation de présentation">
          <a href="#solution">La solution</a>
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#contact">Contact</a>
        </nav>

        <button
          type="button"
          className={styles.menuButton}
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={styles.menuButtonInner}>
            <span className={styles.menuLine}></span>
            <span className={styles.menuLine}></span>
          </span>
        </button>
      </header>

      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ""}`} aria-live="polite">
        <div className={styles.mobileMenuInner}>
          <Link href="/login" className={styles.mobileLoginButton} onClick={() => setMenuOpen(false)}>
            Se connecter
          </Link>

          <nav className={styles.mobileNav} aria-label="Menu mobile">
            <a href="#solution" onClick={() => setMenuOpen(false)}>La solution</a>
            <a href="#fonctionnalites" onClick={() => setMenuOpen(false)}>Fonctionnalités</a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
            <a href="#" onClick={() => setMenuOpen(false)}>Instagram</a>
            <a href="/legal/support" onClick={() => setMenuOpen(false)}>Support</a>
          </nav>
        </div>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>ERP modulaire et multi-entreprises</p>
          <p className={styles.heroText}>
            Gérez votre activité. Gardez l’équilibre. Mizan.
          </p>
          <div className={styles.heroActions}>
            <Link href="/login" className={styles.primaryButton}>Commencer</Link>
            <a href="#solution" className={styles.textButton}>Découvrir <span>↓</span></a>
          </div>
        </div>

        {/* PHONE REPRODUISANT EXACTEMENT L'INTERFACE DE L'IMAGE */}
        <div className={styles.heroArtwork} aria-label="Aperçu de l'interface de gestion sur mobile">
          <div className={styles.phone}>
            <div className={styles.phoneNotch} />
            <div className={styles.phoneScreen}>
              
              {/* En-tête : ESPACE D'EXPLOITATION & BONJOUR, ABDEL */}
              <div className={styles.appHeader}>
                <div className={styles.appEyebrow}>
                  <span className={styles.iconGrid}>::</span> ESPACE D'EXPLOITATION
                </div>
                <h3 className={styles.appTitle}>BONJOUR, Lamine</h3>
                <p className={styles.appSubtitle}>La situation de votre organisation, en un seul regard.</p>
              </div>

              {/* Ligne Organisation & Date */}
              <div className={styles.orgBar}>
                <div className={styles.orgBadge}>
                  <Warehouse size={10} strokeWidth={2} className={styles.orgIcon} />
                  <strong>Company</strong>
                </div>
                <span className={styles.orgDate}>Vendredi 18 Septembre</span>
                <button className={styles.refreshBtn} aria-label="Rafraîchir">
                  <RefreshCcw size={12} strokeWidth={2} />
                </button>
              </div>

              {/* Grille de 4 cartes d'indicateurs */}
              <div className={styles.dashboardGrid}>
                
                {/* Carte 1 : Chiffre d'affaires (avec bordure verte supérieure) */}
                <div className={`${styles.dashCard} ${styles.highlightCard}`}>
                  <span className={styles.cardLabel}>Chiffre d'affaires du jour</span>
                  <strong className={styles.cardValue}>35 000 FCFA</strong>
                  <div className={styles.cardSub}>
                    <span>🛒</span> 5 ventes
                  </div>
                </div>

                {/* Carte 2 : État de la caisse */}
                <div className={styles.dashCard}>
                  <span className={styles.cardLabel}>État de la caisse</span>
                  <strong className={styles.cardValue}>ACTIVE</strong>
                  <div className={`${styles.cardSub} ${styles.greenText}`}>
                    <span>✉</span> Caisse #6
                  </div>
                </div>

                {/* Carte 3 : Stock à surveiller */}
                <div className={styles.dashCard}>
                  <span className={styles.cardLabel}>Stock à surveiller</span>
                  <div className={styles.metricRow}>
                    <span className={styles.metricIconRed}><PackageSearch size={11} strokeWidth={2.2} /></span>
                    <strong className={`${styles.cardValue} ${styles.redValue}`}>4</strong>
                  </div>
                  <div className={`${styles.cardSub} ${styles.warningText}`}>
                    <span>•</span> références critiques
                  </div>
                </div>

                {/* Carte 4 : Équipe & relations */}
                <div className={styles.dashCard}>
                  <span className={styles.cardLabel}>Équipe & relations</span>
                  <div className={styles.metricRow}>
                    <span className={styles.metricIcon}><Users size={11} strokeWidth={2.2} /></span>
                    <strong className={styles.cardValue}>2</strong>
                  </div>
                  <div className={styles.cardSubText}>
                    2 équipes actives · 0 alertes
                  </div>
                </div>

              </div>

              {/* Section TRAÇABILITÉ */}
              <div className={styles.tracabilityCard}>
                <div className={styles.tracabilityHeader}>
                  <div className={styles.tracabilityTitle}>
                    <span className={styles.greenPulse}></span>
                    <span>TRAÇABILITÉ</span>
                  </div>
                  <span className={styles.tracabilityTime}>Mis à jour à 17:32</span>
                </div>
                <h4 className={styles.tracabilitySub}>Activité récente</h4>

                <div className={styles.activityList}>
                  <div className={styles.activityRow}>
                    <div className={styles.activityMeta}>
                      <span className={styles.activityDot}></span>
                      <span>Vente comptoir</span>
                    </div>
                    <strong>4 000 FCFA</strong>
                  </div>
                  <div className={styles.activityRow}>
                    <div className={styles.activityMeta}>
                      <span className={styles.activityDot}></span>
                      <span>Réassort stock</span>
                    </div>
                    <strong>+32</strong>
                  </div>
                  <div className={styles.activityRow}>
                    <div className={styles.activityMeta}>
                      <span className={styles.activityDot}></span>
                      <span>Passation caisse</span>
                    </div>
                    <strong>18:42</strong>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      <section id="solution" className={styles.statement}>
        <p className={styles.eyebrow}>Une seule interface</p>
        <div>
          <h2>Tout ce dont vous avez besoin. Rien de plus.</h2>
          <p>Les données appartiennent à votre équipe. Le logiciel fournit les outils pour les faire vivre.</p>
        </div>
      </section>

      <section id="fonctionnalites" className={styles.featureSection}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Pensé pour le quotidien</p>
          <h2>Une base solide pour avancer.</h2>
        </div>
        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <article key={feature.number} className={styles.featureCard}>
              <span>{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="contact" className={styles.ctaSection}>
        <div>
          <p className={styles.eyebrow}>Quand vous êtes prêt</p>
          <h2>Commencez. Remplissez avec votre métier.</h2>
        </div>
        <Link href="/login" className={styles.primaryButton}>Se connecter</Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerHeader}>
            <span className={styles.footerLogo}>MIZAN ERP</span>
            <div className={styles.countrySelector}>
              <span>AMANAH</span>
              <span className={styles.chevron}>·</span>
              <span>IHSAN · BARAKA</span>
            </div>
          </div>

          <div className={styles.footerNavGrid}>
            {footerNav.map((col) => (
              <div key={col.category} className={styles.footerColumn}>
                <h4>{col.category}</h4>
                <ul>
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className={styles.footerNewsletter}>
              <h4>NEWSLETTER</h4>
              <p>Inscrivez-vous pour recevoir les dernières mises à jour architecturales.</p>
              <div className={styles.newsletterForm}>
                <input type="email" placeholder="ENTREZ VOTRE EMAIL" />
                <button type="button">→</button>
              </div>
            </div>
          </div>

          <div className={styles.footerMeta}>
            <div className={styles.socialsZara}>
              <a href="#">INSTAGRAM</a>
              <a href="#">LINKEDIN</a>
              <a href="#">GITHUB</a>
              <a href="#">X</a>
            </div>

            <div className={styles.legalZara}>
              <Link href="/legal/privacy">CONFIDENTIALITÉ</Link>
              <Link href="/legal/support">CONDITIONS</Link>
              <Link href="/legal/security">SÉCURITÉ</Link>
            </div>
          </div>

          <div className={styles.footerBottomZara}>
            <span>© 2026 MIZAN ERP — AMANAH · IHSAN · BARAKA</span>
          </div>
        </div>
      </footer>
    </main>
  );
}