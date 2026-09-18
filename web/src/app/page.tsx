import Link from "next/link";
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

        <Link href="/login" className={styles.loginButton}>Se connecter</Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>ERP modulaire et multi-entreprises</p>
          <h1>Une plateforme ERP prête à évoluer.</h1>
          <p className={styles.heroText}>
            Studio ERP centralise les processus de votre organisation, sans verrouiller le système dans un seul métier.
            Vendre, gérer les stocks, organiser les équipes et faire grandir votre activité sans friction.
          </p>
          <div className={styles.heroActions}>
            <Link href="/login" className={styles.primaryButton}>Accéder à l&apos;espace de vente</Link>
            <a href="#solution" className={styles.textButton}>Découvrir <span>↓</span></a>
          </div>
        </div>

        <div className={styles.heroArtwork} aria-label="Aperçu de l&apos;interface de gestion sur mobile">
          <div className={styles.phone}>
            <div className={styles.phoneNotch} />
            <div className={styles.phoneScreen}>
              <div className={styles.phoneBar}><span>09:41</span><b>ERP</b><span>•••</span></div>
              <div className={styles.phoneGreeting}>
                <small>Tableau de bord</small>
                <strong>Bonjour, équipe</strong>
              </div>
              <div className={styles.phoneBalance}>
                <span>Solde caisse</span>
                <strong>73 500 FCFA</strong>
                <small>+12,8% aujourd&apos;hui</small>
              </div>
              <div className={styles.phoneStats}>
                <div><small>Ventes</small><strong>24</strong></div>
                <div><small>Stock</small><strong>186</strong></div>
              </div>
              <div className={styles.phoneActivity}>
                <small>Activité récente</small>
                <div><span>Vente comptoir</span><b>4 000 FCFA</b></div>
                <div><span>Réassort stock</span><b>+32</b></div>
                <div><span>Passation caisse</span><b>18:42</b></div>
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

      {/* FOOTER INNOVANT / STYLE ZARA */}
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