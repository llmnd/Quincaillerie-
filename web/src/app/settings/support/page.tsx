"use client";

import { useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import { authHeaders } from "../../../lib/auth";
import styles from "./page.module.css";

type HealthStatus = {
  status: string;
  app: string;
  database: "ok" | "degraded";
  timestamp?: string;
  version?: string;
};

type AuditEntry = {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  amount: number | null;
  after_data: string | null;
  created_at: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function SupportPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSupportData() {
    setIsLoading(true);
    try {
      const [healthResponse, auditResponse] = await Promise.all([
        fetch(`${API_URL}/health`, { credentials: "include", headers: { Accept: "application/json", ...authHeaders() } }),
        fetch(`${API_URL}/api/v1/cash/audit`, { credentials: "include", headers: { Accept: "application/json", ...authHeaders() } }),
      ]);

      if (!healthResponse.ok) {
        throw new Error("Impossible de récupérer l’état du système.");
      }
      const healthPayload = (await healthResponse.json()) as HealthStatus;
      setHealth(healthPayload);

      if (!auditResponse.ok) {
        setAuditEntries([]);
        return;
      }

      const auditPayload = (await auditResponse.json()) as AuditEntry[];
      setAuditEntries(auditPayload.slice(0, 12));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSupportData();
  }, []);

  const databaseState = health?.database === "ok" ? styles.good : styles.warning;

  return (
    <AppShell>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Support / opérations</p>
          <h1>État système</h1>
          <p>Surveillez la santé du backend et l’activité de sécurité de l’organisation.</p>
        </div>
        <button type="button" className={styles.refreshButton} onClick={() => void loadSupportData()}>
          Actualiser
        </button>
      </header>

      {error ? <div className={styles.error}>{error}</div> : null}

      {isLoading ? <div className={styles.state}>Chargement de l’état du système…</div> : null}

      {!isLoading && health ? (
        <section className={styles.grid} aria-label="État du système">
          <article className={styles.card}>
            <span className={styles.label}>Statut global</span>
            <strong className={health.status === "ok" ? styles.good : styles.warning}>{health.status === "ok" ? "Disponible" : "Dégradé"}</strong>
            <small>{health.app}</small>
          </article>

          <article className={styles.card}>
            <span className={styles.label}>Base de données</span>
            <strong className={databaseState}>{health.database === "ok" ? "OK" : "DÉGRADÉ"}</strong>
            <small>{health.timestamp ? new Date(health.timestamp).toLocaleString("fr-FR") : "N/A"}</small>
          </article>

          <article className={styles.card}>
            <span className={styles.label}>Version</span>
            <strong>{health.version ?? "N/A"}</strong>
            <small>Backend ERP</small>
          </article>
        </section>
      ) : null}

      <section className={styles.auditPanel}>
        <div className={styles.sectionHeader}>
          <h2>Dernières actions auditées</h2>
        </div>

        {auditEntries.length === 0 ? (
          <div className={styles.empty}>Aucune activité critique détectée.</div>
        ) : (
          <div className={styles.auditList}>
            {auditEntries.map((entry) => (
              <article key={entry.id} className={styles.auditRow}>
                <div>
                  <strong>{entry.action}</strong>
                  <small>
                    {entry.entity_type} · {entry.entity_id ?? "-"}
                  </small>
                </div>
                <div className={styles.meta}>
                  <span>{entry.user_id ? `Utilisateur #${entry.user_id}` : "Système"}</span>
                  <time>{new Date(entry.created_at).toLocaleString("fr-FR")}</time>
                  {entry.after_data ? <p>{entry.after_data}</p> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
