import Link from "next/link";
import styles from "./page.module.css";

const presentations = {
  ventes: {
    label: "Flux commercial",
    title: "Vendre avec précision.",
    text: "Mizan rassemble les ventes, les produits et les opérations de caisse dans un parcours simple, pensé pour le quotidien.",
    points: ["Créer une vente rapidement", "Suivre chaque opération", "Conserver une trace claire"],
  },
  produits: {
    label: "Catalogue",
    title: "Un catalogue qui reste lisible.",
    text: "Retrouvez vos références, leurs prix et leurs informations sans perdre de temps dans des écrans dispersés.",
    points: ["Centraliser les références", "Maîtriser les prix", "Garder les fiches à jour"],
  },
  caisse: {
    label: "Trésorerie",
    title: "Une caisse sous contrôle.",
    text: "Les sessions, mouvements et clôtures sont réunis pour vous donner une vision fiable de chaque journée.",
    points: ["Ouvrir une session", "Suivre les mouvements", "Clôturer sereinement"],
  },
  clients: {
    label: "Relations",
    title: "Connaître vos clients.",
    text: "Centralisez les contacts et les informations utiles pour construire une relation plus régulière avec votre clientèle.",
    points: ["Retrouver un contact", "Garder l'historique utile", "Structurer les relations"],
  },
  stock: {
    label: "Inventaire",
    title: "Voir ce qui entre et sort.",
    text: "Mizan rend les mouvements de stock plus visibles afin de réduire les ruptures et les incertitudes.",
    points: ["Suivre les mouvements", "Repérer les niveaux critiques", "Fiabiliser l'inventaire"],
  },
  elevage: {
    label: "Exploitation",
    title: "Suivre votre élevage.",
    text: "Un espace pour organiser les lots, les observations et les étapes importantes de votre exploitation.",
    points: ["Organiser les lots", "Documenter le quotidien", "Anticiper les étapes"],
  },
} as const;

type PresentationSlug = keyof typeof presentations;

export function generateStaticParams() {
  return Object.keys(presentations).map((slug) => ({ slug }));
}

export default async function PresentationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const presentation = presentations[slug as PresentationSlug] ?? presentations.ventes;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>M</span>
          <span>
            <small>AMANAH · IHSAN · BARAKA</small>
            <strong>MIZAN ERP</strong>
          </span>
        </Link>
        <Link href="/" className={styles.backLink}>Retour au site</Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{presentation.label}</p>
          <h1>{presentation.title}</h1>
          <p className={styles.lead}>{presentation.text}</p>
          <Link href="/login" className={styles.primaryButton}>Accéder à Mizan</Link>
        </div>

        <div className={styles.featureList}>
          {presentation.points.map((point, index) => (
            <div key={point} className={styles.featureRow}>
              <span>0{index + 1}</span>
              <strong>{point}</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
