import styles from "./page.module.css";

export default function LegalPrivacyPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Confidentialité</p>
        <h1>Protection des données</h1>
      </header>

      <section className={styles.card}>
        <h2>Principes</h2>
        <ul>
          <li>Minimisation stricte des données collectées.</li>
          <li>Isolation par organisation et contrôle d’accès par rôle.</li>
          <li>Traçabilité des actions sensibles dans les journaux d’audit.</li>
          <li>Rétention et suppression conformes à la politique de gestion des données.</li>
        </ul>
      </section>
    </main>
  );
}
