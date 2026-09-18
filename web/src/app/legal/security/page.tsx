import styles from "./page.module.css";

export default function LegalSecurityPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Sécurité</p>
        <h1>Protection et contrôle d’accès</h1>
      </header>

      <section className={styles.card}>
        <h2>Mesures clés</h2>
        <ul>
          <li>Vérification stricte des accès par organisation et par rôle.</li>
          <li>Modules désactivés et routes protégées côté serveur.</li>
          <li>Rate limiting sur les tentatives de connexion.</li>
          <li>Journaux d’audit sur les actions critiques et les changements de permissions.</li>
        </ul>
      </section>
    </main>
  );
}
