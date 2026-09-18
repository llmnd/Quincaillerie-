import AppShell from "../../components/AppShell";
import styles from "./page.module.css";

const pillars = [
  {
    title: "Minimisation des données",
    text: "Nous ne collectons que les informations strictement nécessaires au bon fonctionnement de la gestion commerciale, comptable et opérationnelle.",
  },
  {
    title: "Séparation des organisations",
    text: "Chaque utilisateur et chaque donnée sont rattachés à une organisation unique, avec contrôle strict des accès et des modules activés.",
  },
  {
    title: "Traçabilité et audits",
    text: "Les actions sensibles sont journalisées pour permettre l’investigation, la conformité et la reprise d’activité en cas d’incident.",
  },
  {
    title: "Conservation limitée",
    text: "Les journaux, factures et données liées à l’organisation sont conservés selon une politique de rétention définie et documentée.",
  },
];

export default function PrivacyPage() {
  return (
    <AppShell>
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Confidentialité</p>
          <h1>Protection des données et gouvernance</h1>
          <p className={styles.lead}>
            L’ERP est conçu pour protéger les données de chaque organisation et pour limiter l’exposition des informations à leur besoin métier.
          </p>
        </header>

        <section className={styles.grid}>
          {pillars.map((pillar) => (
            <article key={pillar.title} className={styles.card}>
              <h2>{pillar.title}</h2>
              <p>{pillar.text}</p>
            </article>
          ))}
        </section>

        <section className={styles.panel}>
          <h2>Ce que nous garantissons</h2>
          <ul>
            <li>Protection des accès par organisation et par rôle.</li>
            <li>Transmission des données via HTTPS et secrets côté serveur.</li>
            <li>Journalisation des actions critiques et des changements de permissions.</li>
            <li>Suppression ou confinement des données lors de la fermeture d’une organisation ou d’un départ utilisateur.</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
