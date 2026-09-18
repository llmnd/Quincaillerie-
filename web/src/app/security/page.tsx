import AppShell from "../../components/AppShell";
import styles from "./page.module.css";

const controls = [
  {
    title: "Authentification",
    text: "Chaque session est restaurée avec validation serveur et gestion centralisée des tokens et des autorisations.",
  },
  {
    title: "Rôles et organisations",
    text: "Les permissions sont construites autour de l’organisation active et des rôles autorisés, pour éviter le cross-tenant access.",
  },
  {
    title: "Modules désactivés",
    text: "Les modules non activés sont automatiquement bloqués dans l’interface et sur les routes backend concernées.",
  },
  {
    title: "Journal d’audit",
    text: "Les changements sensibles, modules et actions critiques sont consignés pour être audités et revisités en support.",
  },
  {
    title: "Protection contre les abus",
    text: "Le système applique un rate limiting sur les tentatives de connexion et réduit les risques de brute-force et d’attaques répétées.",
  },
  {
    title: "Sécurité opérationnelle",
    text: "Les environnements prod exigent HTTPS, jetons forts, base PostgreSQL, monitoring et procédures de réponse rapide.",
  },
];

export default function SecurityPage() {
  return (
    <AppShell>
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Sécurité</p>
          <h1>Protection, contrôle d’accès et résilience</h1>
          <p className={styles.lead}>
            La sécurité de l’ERP repose sur une combinaison de contrôle d’accès, d’isolation multi-organisation, de journaux d’audit et de procédures de surveillance.
          </p>
        </header>

        <section className={styles.grid}>
          {controls.map((control) => (
            <article key={control.title} className={styles.card}>
              <h2>{control.title}</h2>
              <p>{control.text}</p>
            </article>
          ))}
        </section>

        <section className={styles.panel}>
          <h2>Rappel des bonnes pratiques</h2>
          <ul>
            <li>Ne jamais utiliser SQLite en production.</li>
            <li>Utiliser des secrets forts et des variables d’environnement distinctes par environnement.</li>
            <li>Surveiller les 401, 403, 429 et les dégradations de la base.</li>
            <li>Valider les changements de permissions et les actions critiques dans le journal d’audit.</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
