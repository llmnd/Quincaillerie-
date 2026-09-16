"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell, { applications } from "../../components/AppShell";
import styles from "./page.module.css";

type User = { full_name?: string; role?: "admin" | "seller" };

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const value = window.localStorage.getItem("quincaillerie_user");
    if (value) setUser(JSON.parse(value) as User);
  }, []);

  const visibleApps = applications.filter((application) => application.roles.includes(user?.role ?? "seller"));

  return (
    <AppShell>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>Espace de travail</p><h1>Bonjour{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}.</h1><p>Choisissez une application pour commencer.</p></div>
        <span className={styles.role}>{user?.role === "admin" ? "Administrateur" : "Vendeur"}</span>
      </header>
      <section className={styles.appGrid} aria-label="Applications disponibles">
        {visibleApps.map((application) => (
          <Link href={application.href} key={application.href} className={styles.appCard}>
            <span className={styles.appIcon}>{application.icon}</span>
            <span><strong>{application.label}</strong><small>{application.description}</small></span>
            <span className={styles.arrow}>↗</span>
          </Link>
        ))}
      </section>
      <section className={styles.emptyPanel}><p className={styles.eyebrow}>Votre activité</p><h2>Les données apparaîtront ici.</h2><p>Créez votre première vente ou ajoutez vos produits pour commencer à alimenter votre espace de travail.</p></section>
    </AppShell>
  );
}