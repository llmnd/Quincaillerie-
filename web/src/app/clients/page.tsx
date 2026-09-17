"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { authHeaders } from "../../lib/auth";
import styles from "./page.module.css";

type Customer = { id: number; name: string; email?: string | null; phone?: string | null; is_active: boolean };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ClientsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [message, setMessage] = useState("");

  async function loadCustomers() {
    const response = await fetch(`${API_URL}/api/v1/customers`, { headers: authHeaders(), credentials: "include" });
    if (response.ok) setCustomers(await response.json());
  }
  useEffect(() => { void loadCustomers(); }, []);

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`${API_URL}/api/v1/customers`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, credentials: "include", body: JSON.stringify(form) });
    if (!response.ok) { setMessage("Impossible de créer ce client."); return; }
    setForm({ name: "", email: "", phone: "", address: "" }); setShowForm(false); setMessage("Client créé."); void loadCustomers();
  }

  return <AppShell><header className={styles.header}><div><p className={styles.eyebrow}>Relations</p><h1>Clients</h1><p>Les contacts utilisés dans vos ventes.</p></div><button type="button" className={styles.primaryButton} onClick={() => setShowForm(!showForm)}>Nouveau client</button></header>
    {showForm ? <form className={styles.form} onSubmit={createCustomer}><input required placeholder="Nom du client" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><input type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><input placeholder="Téléphone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /><input placeholder="Adresse" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /><button className={styles.primaryButton}>Enregistrer</button></form> : null}
    {message ? <p className={styles.message}>{message}</p> : null}<section className={styles.table}>{customers.length === 0 ? <div className={styles.empty}>Aucun client enregistré.</div> : customers.map((customer) => <article className={styles.row} key={customer.id}><div><strong>{customer.name}</strong><small>{customer.email || "Email non renseigné"}</small></div><span>{customer.phone || "Téléphone non renseigné"}</span><em>{customer.is_active ? "Actif" : "Inactif"}</em></article>)}</section>
  </AppShell>;
}
