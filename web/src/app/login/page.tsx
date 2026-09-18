"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { setStoredUser } from "../../lib/auth";
import styles from "./page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
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
      setStoredUser(normalizedUser);
      router.push("/dashboard");
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
          <strong>ERP Studio</strong>
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
              minLength={8}
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