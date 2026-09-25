"use client";

import { FormEvent, useEffect, useState } from "react";
import { ChevronDown, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import OrganizationSettings from "../settings/users/OrganizationSettings";
import styles from "./page.module.css";

type Profile = {
  full_name?: string;
  email?: string;
  role?: "admin" | "seller";
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const EMPTY_PASSWORD_FORM = {
  current_password: "",
  new_password: "",
  confirmation: "",
};

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedUser = window.localStorage.getItem("quincaillerie_user");
      if (!storedUser) {
        setProfile({});
      } else {
        const parsed = JSON.parse(storedUser) as Profile & { user?: Profile };
        setProfile(parsed.user ?? parsed);
      }
    } catch {
      setProfile({});
    } finally {
      setIsHydrated(true);
    }
  }, []);

  /* -----------------------------------------------------------------
     Mot de passe
  ----------------------------------------------------------------- */
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setPasswordMessage("");
    setPasswordError("");

    if (passwordForm.new_password !== passwordForm.confirmation) {
      setPasswordError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/me/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { detail?: string }
          | null;
        setPasswordError(
          payload?.detail === "Current password is incorrect"
            ? "Votre mot de passe actuel est incorrect."
            : "Impossible de modifier le mot de passe."
        );
        return;
      }

      setPasswordForm(EMPTY_PASSWORD_FORM);
      setPasswordMessage("Mot de passe modifié avec succès.");
      setPasswordOpen(false);
    } catch {
      setPasswordError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function logout() {
    fetch(`${API_URL}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);

    window.localStorage.removeItem("quincaillerie_access_token");
    window.localStorage.removeItem("quincaillerie_user");
    window.sessionStorage.removeItem("quincaillerie_authenticated");
    window.sessionStorage.removeItem("quincaillerie_session_user");

    router.replace("/login");
  }

  if (!isHydrated || profile === null) {
    return (
      <AppShell>
        <main className={styles.page}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Compte personnel</p>
              <h1>Mon profil</h1>
              <p>Consultez vos informations et gérez votre session.</p>
            </div>
          </header>

          <section className={styles.profileCard}>
            <div className={styles.profileHero}>
              <div className={styles.avatar} aria-hidden="true" />
              <div>
                <h2>Chargement…</h2>
                <p>Récupération du profil</p>
              </div>
            </div>
          </section>
        </main>
      </AppShell>
    );
  }

  const name = profile.full_name?.trim() || "Utilisateur";
  const initials = name.charAt(0).toUpperCase();
  const roleLabel = profile.role === "admin" ? "Administrateur" : "Vendeur";

  return (
    <AppShell>
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Compte personnel</p>
            <h1>Mon profil</h1>
            <p>Consultez vos informations et gérez votre session.</p>
          </div>
        </header>

        <section className={styles.profileCard}>
          <div className={styles.profileHero}>
            <div className={styles.avatar} aria-hidden="true">
              {initials}
            </div>
            <div>
              <h2>{name}</h2>
              <p>{roleLabel}</p>
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <UserRound size={17} aria-hidden="true" />
              <span>
                <small>Nom complet</small>
                <strong>{name}</strong>
              </span>
            </div>

            <div className={styles.infoItem}>
              <Mail size={17} aria-hidden="true" />
              <span>
                <small>Adresse email</small>
                <strong>{profile.email || "Non renseignée"}</strong>
              </span>
            </div>

            <div className={styles.infoItem}>
              <ShieldCheck size={17} aria-hidden="true" />
              <span>
                <small>Niveau d&apos;accès</small>
                <strong>{roleLabel}</strong>
              </span>
            </div>
          </div>

          <div className={styles.profileActions}>
            <button
              type="button"
              className={styles.logoutButton}
              onClick={logout}
            >
              <LogOut size={16} aria-hidden="true" />
              Se déconnecter
            </button>
          </div>
        </section>

        {/* -----------------------------------------------------------
            Mot de passe — accordéon fermé par défaut
        ----------------------------------------------------------- */}
        <section
          className={`${styles.passwordCard} ${
            passwordOpen ? styles.passwordCardOpen : ""
          }`}
        >
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setPasswordOpen((open) => !open)}
            aria-expanded={passwordOpen}
            aria-controls="password-panel"
          >
            <div className={styles.passwordToggleText}>
              <p className={styles.sectionEyebrow}>Sécurité</p>
              <h2>Modifier mon mot de passe</h2>
            </div>
            <ChevronDown
              size={18}
              className={`${styles.passwordChevron} ${
                passwordOpen ? styles.passwordChevronOpen : ""
              }`}
              aria-hidden="true"
            />
          </button>

          {passwordOpen && (
            <div
              id="password-panel"
              className={styles.passwordBody}
              role="region"
              aria-label="Formulaire de changement de mot de passe"
            >
              <form className={styles.passwordForm} onSubmit={changePassword}>
                <div className={styles.passwordField}>
                  <input
                    required
                    minLength={8}
                    type="password"
                    placeholder="Mot de passe actuel"
                    autoComplete="current-password"
                    aria-label="Mot de passe actuel"
                    value={passwordForm.current_password}
                    onChange={(event) =>
                      setPasswordForm({
                        ...passwordForm,
                        current_password: event.target.value,
                      })
                    }
                  />
                </div>

                <div className={styles.passwordField}>
                  <input
                    required
                    minLength={8}
                    type="password"
                    placeholder="Nouveau mot de passe"
                    autoComplete="new-password"
                    aria-label="Nouveau mot de passe"
                    value={passwordForm.new_password}
                    onChange={(event) =>
                      setPasswordForm({
                        ...passwordForm,
                        new_password: event.target.value,
                      })
                    }
                  />
                </div>

                <div className={styles.passwordField}>
                  <input
                    required
                    minLength={8}
                    type="password"
                    placeholder="Confirmer le nouveau mot de passe"
                    autoComplete="new-password"
                    aria-label="Confirmer le nouveau mot de passe"
                    value={passwordForm.confirmation}
                    onChange={(event) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmation: event.target.value,
                      })
                    }
                  />
                </div>

                <button
                  type="submit"
                  className={styles.passwordButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Modification…" : "Modifier le mot de passe"}
                </button>
              </form>

              {passwordError ? (
                <p className={styles.formError} role="alert">
                  {passwordError}
                </p>
              ) : null}

              {passwordMessage ? (
                <p className={styles.formSuccess} role="status">
                  {passwordMessage}
                </p>
              ) : null}
            </div>
          )}
        </section>

        {profile.role === "admin" ? <OrganizationSettings /> : null}
      </main>
    </AppShell>
  );
}