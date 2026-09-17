"use client";

import { useEffect, useState } from "react";
import { LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import styles from "./page.module.css";

type Profile = {
  full_name?: string;
  email?: string;
  role?: "admin" | "seller";
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({});

  useEffect(() => {
    const storedUser = window.localStorage.getItem("quincaillerie_user");
    if (storedUser) {
      try {
        setProfile(JSON.parse(storedUser) as Profile);
      } catch {
        setProfile({});
      }
    }
  }, []);

  function logout() {
    fetch(`${API_URL}/api/v1/auth/logout`, { method: "POST", credentials: "include" }).catch(() => undefined);
    window.localStorage.removeItem("quincaillerie_access_token");
    window.localStorage.removeItem("quincaillerie_user");
    router.replace("/");
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
            <div className={styles.infoItem}><ShieldCheck size={17} /><span><small>Niveau d'accès</small><strong>{profile.role === "admin" ? "Administrateur" : "Vendeur"}</strong></span></div>
          </div>

          <div className={styles.profileActions}>
            <button type="button" className={styles.logoutButton} onClick={logout}><LogOut size={16} /> Se déconnecter</button>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
