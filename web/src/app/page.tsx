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
    text: "Clients, rapports et données unifiées dans un espace simple.",
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
          <p className={styles.eyebrow}>Gestion sans complication</p>
          <h1>Clarté et contrôle à chaque vente.</h1>
          <p className={styles.heroText}>
            Quincaillerie Studio ERP : un logiciel conçu pour votre activité au quotidien. 
            Vendre, suivre, organiser. Simple et efficace.
          </p>
          <div className={styles.heroActions}>
            <Link href="/login" className={styles.primaryButton}>Accéder à l'espace de vente</Link>
            <a href="#solution" className={styles.textButton}>Découvrir <span>↓</span></a>
          </div>
        </div>

        <div className={styles.heroArtwork} aria-label="Interface de gestion">
          <div className={styles.artworkTop}>
            <span>Votre espace</span>
            <span className={styles.artworkDot} />
          </div>
          <div className={styles.artworkTitle}>
            <small>Prêt à démarrer</small>
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
        <span>Quincaillerie Studio ERP</span>
        <span>Gestion claire pour professionnels</span>
      </footer>
    </main>
  );
}