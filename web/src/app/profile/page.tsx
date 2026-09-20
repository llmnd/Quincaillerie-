"use client";

import { FormEvent, useState } from "react";
import { LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import OrganizationSettings from "../settings/users/OrganizationSettings";
import styles from "./page.module.css";

type Profile = {
  full_name?: string;
  email?: string;
  role?: "admin" | "seller";
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ProfilePage() {
  const router = useRouter();
  const [profile] = useState<Profile>(() => {
    if (typeof window === "undefined") return {};
    try {
      const storedUser = window.localStorage.getItem("quincaillerie_user");
      if (!storedUser) return {};
      const parsed = JSON.parse(storedUser) as Profile & { user?: Profile };
      return parsed.user ?? parsed;
    } catch {
      return {};
    }
  });
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", confirmation: "" });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    if (passwordForm.new_password !== passwordForm.confirmation) {
      setPasswordError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    const response = await fetch(`${API_URL}/api/v1/auth/me/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ current_password: passwordForm.current_password, new_password: passwordForm.new_password }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { detail?: string } | null;
      setPasswordError(payload?.detail === "Current password is incorrect" ? "Votre mot de passe actuel est incorrect." : "Impossible de modifier le mot de passe.");
      return;
    }
    setPasswordForm({ current_password: "", new_password: "", confirmation: "" });
    setPasswordMessage("Mot de passe modifié avec succès.");
  }

  function logout() {
    fetch(`${API_URL}/api/v1/auth/logout`, { method: "POST", credentials: "include" }).catch(() => undefined);
    window.localStorage.removeItem("quincaillerie_access_token");
    window.localStorage.removeItem("quincaillerie_user");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/login");
    }
    router.replace("/login");
  }

  const name = profile.full_name || "Utilisateur";
  const initials = name.slice(0, 1).toUpperCase();

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
            <div className={styles.avatar}>{initials}</div>
            <div>
              <h2>{name}</h2>
              <p>{profile.role === "admin" ? "Administrateur" : "Vendeur"}</p>
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}><UserRound size={17} /><span><small>Nom complet</small><strong>{name}</strong></span></div>
            <div className={styles.infoItem}><Mail size={17} /><span><small>Adresse email</small><strong>{profile.email || "Non renseignée"}</strong></span></div>
            <div className={styles.infoItem}><ShieldCheck size={17} /><span><small>Niveau d&apos;accès</small><strong>{profile.role === "admin" ? "Administrateur" : "Vendeur"}</strong></span></div>
          </div>

          <div className={styles.profileActions}>
            <button type="button" className={styles.logoutButton} onClick={logout}><LogOut size={16} /> Se déconnecter</button>
          </div>
        </section>
        <section className={styles.passwordCard}>
          <div>
            <p className={styles.sectionEyebrow}>Sécurité</p>
            <h2>Modifier mon mot de passe</h2>
          </div>
          <form className={styles.passwordForm} onSubmit={changePassword}>
            <input required minLength={8} type="password" placeholder="Mot de passe actuel" value={passwordForm.current_password} onChange={(event) => setPasswordForm({ ...passwordForm, current_password: event.target.value })} />
            <input required minLength={8} type="password" placeholder="Nouveau mot de passe" value={passwordForm.new_password} onChange={(event) => setPasswordForm({ ...passwordForm, new_password: event.target.value })} />
            <input required minLength={8} type="password" placeholder="Confirmer le nouveau mot de passe" value={passwordForm.confirmation} onChange={(event) => setPasswordForm({ ...passwordForm, confirmation: event.target.value })} />
            <button type="submit" className={styles.passwordButton}>Modifier le mot de passe</button>
          </form>
          {passwordError ? <p className={styles.formError}>{passwordError}</p> : null}
          {passwordMessage ? <p className={styles.formSuccess}>{passwordMessage}</p> : null}
        </section>
        {profile.role === "admin" ? <OrganizationSettings /> : null}
      </main>
    </AppShell>
  );
}
