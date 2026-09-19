"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { setStoredUser } from "../../lib/auth";
import styles from "./page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Email ou mot de passe incorrect.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError("Email ou mot de passe incorrect.");
        return;
      }

      const payload = await response.json();
      const normalizedUser = payload?.user ?? payload;
      let accessToken: string | null = null;

      if (typeof normalizedUser?.access_token === "string") {
        accessToken = normalizedUser.access_token;
      } else if (typeof payload?.access_token === "string") {
        accessToken = payload.access_token;
      }

      if (accessToken) {
        window.localStorage.setItem("quincaillerie_access_token", accessToken);
      }
      window.localStorage.setItem("quincaillerie_from_login", "1");
      window.sessionStorage.setItem("quincaillerie_authenticated", "1");
      window.sessionStorage.setItem("quincaillerie_entry_source", "/login");
      setStoredUser(normalizedUser);
      window.location.replace("/");
    } catch {
      setError("Le service est momentanément indisponible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.pageShell}>
      <Link href="/" className={styles.brand}>
        <span className={styles.brandMark}>Q</span>
        <span>
          <strong>ERP Mizan</strong>
        </span>
      </Link>

      <section className={styles.loginLayout}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Accès professionnel</p>
          <h1>Connectez-vous.</h1>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="votre@email.com"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? "Connexion…" : "Se connecter"}
          </button>

          {/* Intégration dans la même carte */}
          <div className={styles.cardFooter}>
            <span>Première utilisation ?</span>
            <Link href="/signup" className={styles.signupLink}>
              Créer un compte
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}