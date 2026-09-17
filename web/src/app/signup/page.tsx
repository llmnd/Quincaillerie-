"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../login/page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function SignupPage() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organization_name: organizationName,
          full_name: fullName,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.detail ?? "Impossible de créer votre organisation.");
        return;
      }

      const payload = await response.json();
  window.localStorage.removeItem("quincaillerie_access_token");
      window.localStorage.setItem("quincaillerie_user", JSON.stringify(payload.user ?? payload));
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
        <span className={styles.brandMark}>S</span>
        <span>
          <small>ERP</small>
          <strong>Studio</strong>
        </span>
      </Link>

      <section className={styles.loginLayout}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Créer votre organisation</p>
          <h1>Bienvenue dans votre ERP.</h1>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <label htmlFor="organizationName">Nom de l’entreprise</label>
            <input
              id="organizationName"
              type="text"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label htmlFor="fullName">Votre nom</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? "Création…" : "Créer mon organisation"}
          </button>
        </form>

        <div className={styles.signupHint}>
          <span>Vous avez déjà un compte ?</span>
          <Link href="/login">Se connecter</Link>
        </div>
      </section>
    </main>
  );
}
