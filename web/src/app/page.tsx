'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  authHeaders,
  clearStoredAuth,
  restoreAuthSession,
  type AuthUser,
} from "../lib/auth";
import SimpleHeader from "../components/SimpleHeader";
import styles from "./page.module.css";

const modules = [
  ["01", "Ventes", "Créez et suivez vos ventes au quotidien.", "https://i.pinimg.com/1200x/cf/f9/34/cff9349aa326663fdbff5b863c4c3a72.jpg"],
  ["02", "Produits", "Retrouvez vos références et gardez votre catalogue à jour.", "https://i.pinimg.com/1200x/06/a0/80/06a080194e88100b55e25cdfdf51d7f4.jpg"],
  ["03", "Caisse", "Suivez les sessions, mouvements et clôtures.", "https://i.pinimg.com/736x/8c/33/e3/8c33e3983e190056f12c75841a8ecdd0.jpg"],
  ["04", "Clients", "Centralisez les contacts et les relations commerciales.", "https://i.pinimg.com/736x/33/b8/52/33b8529a6748fada99324bc30712f373.jpg"],
  ["05", "Stock", "Visualisez les entrées, sorties et niveaux critiques.", "https://i.pinimg.com/736x/71/16/ba/7116bafcb4ae414d6fd8c74a8cd2a46b.jpg"],
  ["06", "Élevage", "Organisez le suivi des lots et de votre exploitation.", "https://i.pinimg.com/originals/6e/cd/13/6ecd136e249649f0ba8452d13613bcfd.gif"],
] as const;

const footerNav = [
  { category: "Plateforme", links: ["Fonctionnalités", "Documentation", "Open Source"] },
  { category: "Services", links: ["Hébergement", "Assistance", "Partenaires"] },
  { category: "Écosystème", links: ["Communauté", "Événements", "Blog"] },
];

const featureItems = [
  { title: "Vendre avec précision", description: "Créez vos ventes et maîtrisez chaque opération." },
  { title: "Piloter le stock", description: "Une vue claire de vos références et mouvements." },
  { title: "Centraliser l’activité", description: "Clients, rapports et données réunis." },
];

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSessionResolved, setIsSessionResolved] = useState(false);
  const [selectedModule, setSelectedModule] = useState<(typeof modules)[number] | null>(null);
  const [isWorkspaceClicked, setIsWorkspaceClicked] = useState(false);

  /* Session */
  useEffect(() => {
    let isMounted = true;

    async function resolveSession() {
      try {
        if (window.sessionStorage.getItem("quincaillerie_authenticated") !== "1") {
          clearStoredAuth();
          return;
        }

        const restoredUser = await restoreAuthSession();
        if (isMounted) setUser(restoredUser);
      } finally {
        if (isMounted) setIsSessionResolved(true);
      }
    }

    void resolveSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/auth/logout`,
        {
          method: "POST",
          credentials: "include",
          headers: authHeaders(),
        }
      );
    } finally {
      clearStoredAuth();
      window.sessionStorage.removeItem("quincaillerie_authenticated");
      setUser(null);
    }
  }

  function handleWorkspaceClick() {
    setIsWorkspaceClicked(true);
    window.setTimeout(() => setIsWorkspaceClicked(false), 400);
  }

  if (!isSessionResolved) {
    return (
      <main
        className={styles.homeLoading}
        aria-busy="true"
        aria-label="Chargement de l'accueil"
      >
        <header className={styles.homeLoadingHeader}>
          <span className={`${styles.homeSkeleton} ${styles.homeBrandSkeleton}`} />
          <span className={`${styles.homeSkeleton} ${styles.homeMenuSkeleton}`} />
        </header>
        <section className={styles.homeLoadingHero}>
          <span className={`${styles.homeSkeleton} ${styles.homeEyebrowSkeleton}`} />
          <span className={`${styles.homeSkeleton} ${styles.homeTitleSkeleton}`} />
          <span className={`${styles.homeSkeleton} ${styles.homeTextSkeleton}`} />
          <div className={styles.homeModuleSkeletons}>
            {modules.map((module) => (
              <span
                key={module[1]}
                className={`${styles.homeSkeleton} ${styles.homeModuleSkeleton}`}
              />
            ))}
          </div>
        </section>
      </main>
    );
  }

  const primaryHref = user ? "/workspace" : "/login";
  const primaryLabel = user ? "Accéder au workspace" : "Commencer";
  const connectedUserName = user?.full_name ?? user?.email ?? "Utilisateur";

  const portalModules = [
    { name: "Tableau de bord", href: "/dashboard", image: "https://i.pinimg.com/1200x/a8/13/3f/a8133f8bcfac2c7f80958f5aeb31c574.jpg" },
    { name: "Ventes", href: "/sales", image: "https://i.pinimg.com/1200x/cf/f9/34/cff9349aa326663fdbff5b863c4c3a72.jpg" },
    { name: "Caisse", href: "/cash", image: "https://i.pinimg.com/736x/8c/33/e3/8c33e3983e190056f12c75841a8ecdd0.jpg" },
    { name: "Finances", href: "/erp", image: "https://i.pinimg.com/1200x/98/ed/1c/98ed1c73a25c35145917f361dd010358.jpg", adminOnly: true },
    { name: "Produits", href: "/products", image: "https://i.pinimg.com/1200x/06/a0/80/06a080194e88100b55e25cdfdf51d7f4.jpg" },
    { name: "Clients", href: "/clients", image: "https://i.pinimg.com/1200x/6d/6e/98/6d6e98e8fd33d1b657418c65eb5600d0.jpg" },
    { name: "Stock", href: "/stock", image: "https://i.pinimg.com/736x/71/16/ba/7116bafcb4ae414d6fd8c74a8cd2a46b.jpg" },
    { name: "Élevage", href: "/farming", image: "https://i.pinimg.com/originals/6e/cd/13/6ecd136e249649f0ba8452d13613bcfd.gif" },
    { name: "Admin", href: "/admin", image: "https://i.pinimg.com/1200x/8b/a4/80/8ba4808a95e33280a92660249a971bbd.jpg", adminOnly: true },
  ];

  const visiblePortalModules = portalModules.filter(
    (module) => !module.adminOnly || user?.role === "admin"
  );

  return (
    <>
      <SimpleHeader
        onWorkspaceClick={handleWorkspaceClick}
        isWorkspaceActive={isWorkspaceClicked}
      />
      <main className={styles.landingPage}>
        {/* =====================================================================
          HERO
      ===================================================================== */}
      <section className={`${styles.hero} ${user ? styles.heroConnected : ""}`}>
        <div className={styles.heroContent}>
          {user ? (
            <div className={styles.connectedPanel}>
              <span className={styles.connectedBadge}>Connecté</span>

              <h1 className={styles.heroText}>Bonjour, {connectedUserName}</h1>

              <p className={styles.connectedSubtitle}>
                Votre plateforme est prête.
              </p>

              <div className={styles.heroActions}>
                <div className={styles.workspaceLandingWrap}>
                  <Link
                    href={primaryHref}
                    className={`${styles.workspaceButton} ${styles.workspaceLandingButton}`}
                    aria-label="Accéder au workspace"
                  >
                    <span>{primaryLabel}</span>
                  </Link>
                  <span className={styles.workspaceLandingMarker} aria-hidden="true">
                    <span className={styles.workspaceLandingMarkerDot} />
                    <span className={styles.workspaceLandingMarkerText}>Cliquez ici</span>
                  </span>
                </div>
                <a href="#modules" className={styles.textButton}>
                  Voir les modules <span aria-hidden="true">↓</span>
                </a>
              </div>
            </div>
          ) : (
            <>
              <p className={styles.eyebrow}>ERP modulaire et multi-entreprises</p>
              <h1 className={styles.heroText}>Gérez votre activité.</h1>

              <div className={styles.heroActions}>
                <Link href={primaryHref} className={styles.primaryButton}>
                  {primaryLabel}
                </Link>
                <a href="#solution" className={styles.textButton}>
                  Découvrir <span aria-hidden="true">↓</span>
                </a>
              </div>
            </>
          )}

          {!user && (
            <section className={styles.moduleShowcase} aria-label="Modules Mizan">
              <div className={styles.moduleShowcaseGrid}>
                {modules.map((module) => (
                  <button
                    key={module[1]}
                    type="button"
                    className={styles.moduleShowcaseTile}
                    onClick={() => setSelectedModule(module)}
                    aria-label={`Découvrir le module ${module[1]}`}
                  >
                    <div className={styles.moduleShowcaseIcon}>
                      <img
                        src={module[3]}
                        alt=""
                        className={styles.moduleShowcaseImage}
                      />
                    </div>
                    <span className={styles.moduleShowcaseNumber}>{module[0]}</span>
                    <span className={styles.moduleShowcaseName}>{module[1]}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {user && (
            <section id="modules" className={styles.connectedModules} aria-label="Modules rapides">
              <div className={styles.connectedModulesHeader}>
                <p className={styles.eyebrow}>Accès rapide</p>
                <h2>Modules de travail</h2>
              </div>

              <div className={styles.quickAccessGrid}>
                {visiblePortalModules.map((item) => (
                  <Link key={item.name} href={item.href} className={styles.quickAccessCard}>
                    <span className={styles.quickAccessImageWrap}>
                      <img src={item.image} alt="" className={styles.quickAccessImage} />
                    </span>
                    <span className={styles.quickAccessMeta}>
                      <span className={styles.quickAccessLabel}>{item.name}</span>
                      <strong>Ouvrir</strong>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>

      {/* =====================================================================
          STATEMENT
      ===================================================================== */}
      <section id="solution" className={styles.statement}>
        <p className={styles.eyebrow}>Une seule interface</p>
        <div>
          <h2>Tout ce dont vous avez besoin. Rien de plus.</h2>
          <p>
            Les données appartiennent à votre équipe. Le logiciel fournit les
            outils pour les faire vivre.
          </p>
        </div>
      </section>

      {/* =====================================================================
          FEATURES
      ===================================================================== */}
      <section id="fonctionnalites" className={styles.featureSection}>
        <div className={styles.sectionIntro}>
          <div>
            <p className={styles.eyebrow}>Pensé pour le quotidien</p>
            <h2>Une base solide pour avancer.</h2>
          </div>
        </div>

        <div className={styles.featureGrid}>
          {featureItems.map((item, index) => (
            <article key={item.title} className={styles.featureCard}>
              <span>0{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* =====================================================================
          CTA
      ===================================================================== */}
      <section id="contact" className={styles.ctaSection}>
        <div>
          <p className={styles.eyebrow}>Quand vous êtes prêt</p>
          <h2>Commencez. Remplissez avec votre métier.</h2>
        </div>
        <Link href={primaryHref} className={styles.primaryButton}>
          {user ? "Ouvrir le workspace" : "Se connecter"}
        </Link>
      </section>

      {/* =====================================================================
          FOOTER
      ===================================================================== */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerHeader}>
            <span className={styles.footerLogo}>MIZAN ERP</span>
            <span className={styles.countrySelector}>Amanah · Ihsan · Baraka</span>
          </div>

          <div className={styles.footerNavGrid}>
            {footerNav.map((column) => (
              <div key={column.category} className={styles.footerColumn}>
                <h4>{column.category}</h4>
                <ul>
                  {column.links.map((link) => (
                    <li key={link}>
                      <a href="#">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className={styles.footerNewsletter}>
              <h4>Newsletter</h4>
              <p>Recevez les dernières nouvelles de Mizan.</p>
              <div className={styles.newsletterForm}>
                <input
                  type="email"
                  placeholder="Votre email"
                  aria-label="Votre email"
                />
                <button type="button" aria-label="S'inscrire">→</button>
              </div>
            </div>
          </div>

          <div className={styles.footerMeta}>
            <div className={styles.socialsZara}>
              <a href="#">Instagram</a>
              <a href="#">LinkedIn</a>
              <a href="#">GitHub</a>
            </div>
            <div className={styles.legalZara}>
              <Link href="/legal/privacy">Confidentialité</Link>
              <Link href="/legal/support">Support</Link>
              <Link href="/legal/security">Sécurité</Link>
            </div>
          </div>

          <div className={styles.footerBottomZara}>
            © 2026 MIZAN ERP — Amanah · Ihsan · Baraka
          </div>
        </div>
      </footer>

      {/* =====================================================================
          MODAL MODULE
      ===================================================================== */}
      {selectedModule && (
        <div
          className={styles.moduleModalBackdrop}
          role="presentation"
          onClick={() => setSelectedModule(null)}
        >
          <section
            className={styles.moduleModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="module-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.moduleModalClose}
              onClick={() => setSelectedModule(null)}
              aria-label="Fermer"
            >
              ×
            </button>
            <span className={styles.eyebrow}>Module Mizan</span>
            <h2 id="module-modal-title">{selectedModule[1]}</h2>
            <p>{selectedModule[2]}</p>
            <Link
              href="/login"
              className={styles.primaryButton}
              onClick={() => setSelectedModule(null)}
            >
              Découvrir Mizan
            </Link>
          </section>
        </div>
      )}
      </main>
    </>
  );
}