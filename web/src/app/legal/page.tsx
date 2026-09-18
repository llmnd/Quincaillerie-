import Link from "next/link";
import styles from "./page.module.css";

const links = [
  { label: "Support", href: "/legal/support" },
  { label: "Confidentialité", href: "/legal/privacy" },
  { label: "Sécurité", href: "/legal/security" },
];

export default function LegalHome() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Centre de documentation</p>
        <h1>Informations et support</h1>
      </header>

      <nav className={styles.list} aria-label="Pages de support et conformité">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={styles.card}>
            <span>{link.label}</span>
            <small>Ouvrir</small>
          </Link>
        ))}
      </nav>
    </main>
  );
}
