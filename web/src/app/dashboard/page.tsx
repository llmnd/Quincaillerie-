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
        <div>
          <p className={styles.eyebrow}>Espace de travail</p>
          <h1>Bonjour{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}</h1>
          <p>Choisissez une application pour commencer</p>
        </div>
        {user?.role && (
          <span className={styles.role}>
            {user.role === "admin" ? "Administrateur" : "Vendeur"}
          </span>
        )}
      </header>

      <section className={styles.appGrid} aria-label="Applications disponibles">
        {visibleApps.map((application) => {
          const ApplicationIcon = application.icon;
          return <Link href={application.href} key={application.href} className={styles.appCard}>
            <span className={styles.appIcon}><ApplicationIcon size={20} strokeWidth={1.8} /></span>
            <div className={styles.appContent}>
              <strong>{application.label}</strong>
              <small>{application.description}</small>
            </div>
          </Link>;
        })}
      </section>

      {visibleApps.length === 0 && (
        <section className={styles.emptyPanel}>
          <h2>Votre activité</h2>
          <p>Les données apparaîtront ici. Créez votre première vente ou ajoutez vos produits pour commencer.</p>
        </section>
      )}
    </AppShell>
  );
}