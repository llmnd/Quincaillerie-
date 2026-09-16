"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError("Email ou mot de passe incorrect.");
        return;
      }

      const payload = await response.json();
      window.localStorage.setItem("quincaillerie_access_token", payload.access_token);
      window.localStorage.setItem("quincaillerie_user", JSON.stringify(payload.user));
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
        <span><small>Quincaillerie</small><strong>Studio ERP</strong></span>
      </Link>

      <section className={styles.loginLayout}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Espace professionnel</p>
          <h1>Bienvenue dans votre espace de travail.</h1>
          <p>Connectez-vous avec votre compte administrateur ou vendeur.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">Email professionnel</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          </div>
          <div>
            <label htmlFor="password">Mot de passe</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="current-password" />
          </div>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? "Connexion…" : "Se connecter"}
          </button>
          <p className={styles.note}>L’administrateur crée et gère les comptes vendeurs.</p>
        </form>
      </section>
    </main>
  );
}