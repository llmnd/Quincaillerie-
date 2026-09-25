"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AppShell from "../../../components/AppShell";
import { authHeaders } from "../../../lib/auth";
import styles from "./page.module.css";

type Module = {
  key: string;
  label: string;
  description: string;
  required: boolean;
  enabled: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function ModulesPageContent() {
  const queryClient = useQueryClient();
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${API_URL}/api/v1/organization/modules`, { credentials: "include", headers: authHeaders() });
        if (!response.ok) throw new Error("Impossible de charger les modules.");
        const nextModules = (await response.json()) as Module[];
        if (!cancelled) {
          setModules(nextModules);
          setError("");
        }
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Impossible de charger les modules.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
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
    await queryClient.invalidateQueries({ queryKey: ["organization", "modules"] });
  }

  return (
    <>
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
    </>
  );
}

export default function ModulesPage() {
  return (
    <AppShell>
      <ModulesPageContent />
    </AppShell>
  );
}
