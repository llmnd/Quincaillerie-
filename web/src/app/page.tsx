import Link from "next/link";
import styles from "./page.module.css";

const features = [
  {
    number: "01",
    title: "Vendre avec précision",
    text: "Créez vos ventes, ajoutez vos produits et gardez chaque opération sous contrôle.",
  },
  {
    number: "02",
    title: "Piloter le stock",
    text: "Une vision simple de vos références, de vos entrées et de vos sorties.",
  },
  {
    number: "03",
    title: "Centraliser l’activité",
    text: "Clients, fournisseurs et rapports réunis dans un espace conçu pour aller vite.",
  },
];

export default function Home() {
  return (
    <main className={styles.landingPage}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Quincaillerie Studio ERP, accueil">
          <span className={styles.brandMark}>Q</span>
          <span>
            <small>Quincaillerie</small>
            <strong>Studio ERP</strong>
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
          <p className={styles.eyebrow}>Gestion professionnelle, sans complication</p>
          <h1>Le calme et la maîtrise pour chaque vente.</h1>
          <p className={styles.heroText}>
            Quincaillerie Studio ERP accompagne votre activité au quotidien : vendre, suivre,
            organiser. Un logiciel clair pour les équipes qui travaillent vraiment sur le terrain.
          </p>
          <div className={styles.heroActions}>
            <Link href="/login" className={styles.primaryButton}>Accéder à l’espace de vente</Link>
            <a href="#solution" className={styles.textButton}>Découvrir la solution <span>↓</span></a>
          </div>
        </div>

        <div className={styles.heroArtwork} aria-label="Interface de gestion sans données">
          <div className={styles.artworkTop}>
            <span>Votre espace de travail</span>
            <span className={styles.artworkDot} />
          </div>
          <div className={styles.artworkTitle}>
            <small>Prêt à commencer</small>
            <strong>Construisez votre activité.</strong>
          </div>
          <div className={styles.artworkLines}>
            <span />
            <span />
            <span />
          </div>
          <div className={styles.artworkFooter}>
            <span>Ventes</span>
            <span>Stock</span>
            <span>Clients</span>
          </div>
        </div>
      </section>

      <section id="solution" className={styles.statement}>
        <p className={styles.eyebrow}>Une seule interface</p>
        <h2>Tout ce dont votre quincaillerie a besoin. Rien de superflu.</h2>
        <p>
          Les données appartiennent à votre équipe. Le logiciel fournit le cadre, les outils et la
          visibilité nécessaires pour les faire vivre.
        </p>
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
          <h2>Commencez avec un espace vide. Remplissez-le avec votre métier.</h2>
        </div>
        <Link href="/login" className={styles.primaryButton}>Se connecter</Link>
      </section>

      <footer className={styles.footer}>
        <span>Quincaillerie Studio ERP</span>
        <span>Gestion claire pour professionnels</span>
      </footer>
    </main>
  );
}