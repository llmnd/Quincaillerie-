"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import { authHeaders } from "../../../lib/auth";
import styles from "./page.module.css";

type User = { id: number; full_name: string; email: string; role: "admin" | "seller"; is_active: boolean };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const emptyForm = { full_name: "", email: "", password: "", role: "seller" };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]); const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState(""); const [showForm, setShowForm] = useState(false); const [form, setForm] = useState(emptyForm);

  async function loadUsers() {
    const response = await fetch(`${API_URL}/api/v1/auth/users`, { headers: authHeaders(), credentials: "include" });
    if (response.status === 403) throw new Error("Cette page est réservée aux administrateurs.");
    if (!response.ok) throw new Error("Impossible de charger les utilisateurs.");
    return response.json() as Promise<User[]>;
  }

  useEffect(() => {
    let isMounted = true;

    const initializeUsers = async () => {
      try {
        const nextUsers = await loadUsers();
        if (!isMounted) return;
        setUsers(nextUsers);
        setError("");
      } catch (reason: unknown) {
        if (!isMounted) return;
        setError(reason instanceof Error ? reason.message : "Impossible de charger les utilisateurs.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initializeUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  async function createUser(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const response = await fetch(`${API_URL}/api/v1/auth/users`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, credentials: "include", body: JSON.stringify(form) }); if (!response.ok) { setError("Impossible de créer ce compte. Vérifiez l’email et le mot de passe."); return; } setForm(emptyForm); setShowForm(false); setError(""); await loadUsers().then((nextUsers) => setUsers(nextUsers)).catch(() => setError("Impossible de recharger les utilisateurs.")); }
  return <AppShell><header className={styles.header}><div><p className={styles.eyebrow}>Administration</p><h1>Utilisateurs</h1><p>Gérez les comptes et les niveaux d’accès de votre équipe.</p></div><button type="button" className={styles.primaryButton} onClick={() => setShowForm(!showForm)}>Créer un utilisateur</button></header>{showForm ? <form className={styles.createForm} onSubmit={createUser}><input required placeholder="Nom complet" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /><input required type="email" placeholder="Email professionnel" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><input required minLength={8} type="password" placeholder="Mot de passe (8 caractères minimum)" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="seller">Vendeur</option><option value="admin">Administrateur</option></select><button className={styles.primaryButton}>Créer le compte</button></form> : null}{isLoading ? <div className={styles.state}>Chargement des utilisateurs…</div> : null}{error ? <div className={styles.state}>{error}</div> : null}{!isLoading && !error ? <div className={styles.table}>{users.map((user) => <div className={styles.row} key={user.id}><div><strong>{user.full_name}</strong><small>{user.email}</small></div><span className={styles.role}>{user.role === "admin" ? "Administrateur" : "Vendeur"}</span><span className={user.is_active ? styles.active : styles.inactive}>{user.is_active ? "Actif" : "Désactivé"}</span></div>)}</div> : null}</AppShell>;
}
