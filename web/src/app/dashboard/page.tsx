"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Grid } from "lucide-react";
import AppShell, { applications } from "../../components/AppShell";
import styles from "./page.module.css";

type User = { full_name?: string; role?: "admin" | "seller" };

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const value = window.localStorage.getItem("quincaillerie_user");
    if (value) {
      try {
        setUser(JSON.parse(value) as User);
      } catch (e) {
        console.error("Erreur de lecture du profil utilisateur", e);
      }
    }
  }, []);

  const visibleApps = applications.filter((application) =>
    application.roles.includes(user?.role ?? "seller")
  );

  const firstName = user?.full_name ? user.full_name.split(" ")[0] : "";

  return (
    <AppShell>
      <div className={styles.container}>
        {/* EN-TÊTE ÉDITORIAL ZARA */}
        <header className={styles.header}>
          <div className={styles.headerInfo}>
            <span className={styles.eyebrow}>
              <Grid size={12} className={styles.eyebrowIcon} />
              ESPACE D'EXPLOITATION
            </span>
            <h1 className={styles.title}>
              {firstName ? `BONJOUR, ${firstName.toUpperCase()}` : "TABLEAU DE BORD"}
            </h1>
            <p className={styles.subtitle}>
              Sélectionnez un module pour accéder à vos outils de gestion.
            </p>
          </div>

          {user?.role && (
            <div className={styles.roleTag}>
              <span className={styles.roleDot} />
              <span className={styles.roleText}>
                {user.role === "admin" ? "ADMINISTRATEUR" : "VENDEUR"}
              </span>
            </div>
          )}
        </header>

        {/* GRILLE D'APPLICATIONS */}
        {visibleApps.length > 0 ? (
          <section className={styles.appGrid} aria-label="Applications disponibles">
            {visibleApps.map((application) => {
              const ApplicationIcon = application.icon;
              return (
                <Link
                  href={application.href}
                  key={application.href}
                  className={styles.appCard}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.appIconWrapper}>
                      <ApplicationIcon size={18} strokeWidth={1.5} />
                    </div>
                    <ArrowUpRight size={16} className={styles.arrowIcon} />
                  </div>

                  <div className={styles.appContent}>
                    <strong className={styles.appName}>{application.label}</strong>
                    <small className={styles.appDescription}>{application.description}</small>
                  </div>
                </Link>
              );
            })}
          </section>
        ) : (
          <section className={styles.emptyPanel}>
            <h2>AUCUNE APPLICATION DISPONIBLE</h2>
            <p>
              Votre compte ne dispose pas des autorisations nécessaires pour accéder aux modules.
              Veuillez contacter votre administrateur.
            </p>
          </section>
        )}
      </div>
    </AppShell>
  );
}