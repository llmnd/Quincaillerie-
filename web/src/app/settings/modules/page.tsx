"use client";

import { useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import styles from "./page.module.css";

type Module = {
  key: string;
  label: string;
  description: string;
  required: boolean;
  enabled: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authHeaders(): HeadersInit {
  const storedUser = window.localStorage.getItem("quincaillerie_user");
  if (!storedUser) return {};

  try {
    const parsed = JSON.parse(storedUser) as { access_token?: string; user?: { access_token?: string } };
    const accessToken = parsed.user?.access_token ?? parsed.access_token;
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  } catch {
    return {};
  }
}

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadModules() {
    const response = await fetch(`${API_URL}/api/v1/organization/modules`, { credentials: "include", headers: authHeaders() });
    if (!response.ok) throw new Error("Impossible de charger les modules.");
    setModules(await response.json());
  }

  useEffect(() => {
    loadModules().catch((reason: Error) => setError(reason.message)).finally(() => setIsLoading(false));
  }, []);

  async function toggleModule(module: Module) {
    if (module.required) return;
    setError("");
    const response = await fetch(`${API_URL}/api/v1/organization/modules/${module.key}?enabled=${!module.enabled}`, {
      method: "PATCH",
      credentials: "include",
      headers: authHeaders(),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.detail ?? "Impossible de modifier ce module.");
      return;
    }
    const updated = await response.json();
    setModules((current) => current.map((item) => item.key === updated.key ? updated : item));
  }

  return (
    <AppShell>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Configuration de l’organisation</p>
          <h1>Applications</h1>
          <p>Activez uniquement les modules utiles à votre activité.</p>
        </div>
      </header>

      {isLoading ? <div className={styles.state}>Chargement des modules…</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      {!isLoading ? (
        <section className={styles.moduleList} aria-label="Modules de l’organisation">
          {modules.map((module) => (
            <article className={styles.moduleRow} key={module.key}>
              <div>
                <strong>{module.label}</strong>
                <p>{module.description}</p>
              </div>
              <div className={styles.moduleStatus}>
                <span className={module.enabled ? styles.enabled : styles.disabled}>{module.enabled ? "Actif" : "Inactif"}</span>
                <button
                  type="button"
                  className={module.enabled ? styles.toggleOn : styles.toggleOff}
                  onClick={() => toggleModule(module)}
                  disabled={module.required}
                  aria-label={`${module.enabled ? "Désactiver" : "Activer"} ${module.label}`}
                  title={module.required ? "Module obligatoire" : undefined}
                >
                  <span />
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </AppShell>
  );
}
