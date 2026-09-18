import styles from "./page.module.css";

export default function LegalSupportPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Support</p>
        <h1>Support et assistance</h1>
      </header>

      <section className={styles.card}>
        <h2>Contact</h2>
        <p>Pour une demande de support, contactez l’équipe responsable de l’exploitation et de la sécurité.</p>
        <ul>
          <li>Suivi des incidents et des comptes</li>
          <li>Vérification des accès et des modules</li>
          <li>Analyse du statut du système et des audits</li>
        </ul>
      </section>
    </main>
  );
}
