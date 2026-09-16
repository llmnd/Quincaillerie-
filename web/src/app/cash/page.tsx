"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import styles from "./page.module.css";

type Register = { id: number; name: string; code: string };
type CashSession = { id: number; register_id: number; user_id: number; expected_opening_amount: number; actual_opening_amount: number; opening_difference: number; expected_closing_amount?: number | null; actual_closing_amount?: number | null; closing_difference?: number | null; status: string; opened_at: string; closed_at?: string | null };
type CashBalance = { expected_cash_amount: number };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const money = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

export default function CashPage() {
  const [registers, setRegisters] = useState<Register[]>([]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [balance, setBalance] = useState<CashBalance | null>(null);
  const [registerId, setRegisterId] = useState("");
  const [amount, setAmount] = useState("");
  const [closeAmount, setCloseAmount] = useState("");
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const headers = (): Record<string, string> => { const token = window.localStorage.getItem("quincaillerie_access_token"); return token ? { Authorization: `Bearer ${token}` } : {}; };

  async function load() {
    const [registerResponse, sessionResponse] = await Promise.all([fetch(`${API_URL}/api/v1/cash/registers`, { headers: headers() }), fetch(`${API_URL}/api/v1/cash/sessions`, { headers: headers() })]);
    if (!registerResponse.ok || !sessionResponse.ok) throw new Error();
    setRegisters(await registerResponse.json()); setSessions(await sessionResponse.json());
  }
  useEffect(() => { load().catch(() => setMessage("Impossible de charger les caisses.")); }, []);
  const openSession = sessions.find((session) => session.status === "open");
  const expectedCash = balance?.expected_cash_amount ?? openSession?.actual_opening_amount ?? 0;
  const physicalClosing = Number(closeAmount || 0);
  const closingDifference = physicalClosing - expectedCash;
  useEffect(() => { if (!openSession) { setBalance(null); return; } fetch(`${API_URL}/api/v1/cash/sessions/${openSession.id}/balance`, { headers: headers() }).then((response) => response.ok ? response.json() : null).then(setBalance).catch(() => setBalance(null)); }, [openSession?.id]);

  async function open(event: FormEvent) { event.preventDefault(); const response = await fetch(`${API_URL}/api/v1/cash/sessions/open`, { method: "POST", headers: { "Content-Type": "application/json", ...headers() }, body: JSON.stringify({ register_id: Number(registerId), actual_opening_amount: Number(amount) }) }); if (!response.ok) { setMessage("Ouverture impossible. Vérifiez la caisse ou le montant."); return; } setMessage("Caisse ouverte et comptage enregistré."); setAmount(""); await load(); }
  async function confirmClose() { if (!openSession || !closeAmount) return; setIsClosing(true); const response = await fetch(`${API_URL}/api/v1/cash/sessions/${openSession.id}/close`, { method: "POST", headers: { "Content-Type": "application/json", ...headers() }, body: JSON.stringify({ actual_closing_amount: physicalClosing }) }); if (!response.ok) { setMessage("Clôture impossible."); setIsClosing(false); return; } setIsCloseModalOpen(false); setMessage("Session clôturée. L’écart est conservé dans l’historique."); setCloseAmount(""); setIsClosing(false); await load(); }

  return <AppShell><header className={styles.header}><div><p className={styles.eyebrow}>Point de vente</p><h1>Caisse</h1><p>Ouverture, ventes et clôture de sessions traçables.</p></div><span className={openSession ? styles.open : styles.closed}>{openSession ? "Session ouverte" : "Aucune session ouverte"}</span></header>{message ? <div className={styles.message}>{message}</div> : null}<section className={styles.grid}>{openSession ? <article className={styles.card}><p className={styles.eyebrow}>Session active</p><h2>Caisse #{openSession.register_id}</h2><div className={styles.metrics}><div><span>Départ attendu</span><strong>{money(openSession.expected_opening_amount)}</strong></div><div><span>Montant caisse actuel</span><strong>{money(expectedCash)}</strong></div><div><span>Écart ouverture</span><strong className={openSession.opening_difference === 0 ? styles.good : styles.warning}>{money(openSession.opening_difference)}</strong></div></div><div className={styles.closeBox}><p>La fermeture compare le montant théorique avec le comptage physique.</p><button type="button" className={styles.primaryButton} onClick={() => setIsCloseModalOpen(true)}>Fermer la caisse</button></div></article> : <article className={styles.card}><p className={styles.eyebrow}>Nouvelle session</p><h2>Ouvrir une caisse</h2><form onSubmit={open} className={styles.form}><label htmlFor="register">Caisse<select id="register" required value={registerId} onChange={(event) => setRegisterId(event.target.value)}><option value="">Choisir une caisse</option>{registers.map((register) => <option key={register.id} value={register.id}>{register.name} · {register.code}</option>)}</select></label><label htmlFor="amount">Montant réellement présent<input id="amount" required type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Montant en FCFA" /></label><button className={styles.primaryButton}>Vérifier et ouvrir</button></form></article>}<article className={styles.card}><p className={styles.eyebrow}>Historique</p><h2>Sessions de caisse</h2><div className={styles.history}>{sessions.map((session) => <div key={session.id}><strong>Session #{session.id}</strong><span>{session.status === "open" ? "Ouverte" : "Clôturée"}</span><small>{session.status === "closed" ? `Écart : ${money(session.closing_difference ?? 0)}` : `Écart ouverture : ${money(session.opening_difference)}`}</small></div>)}</div></article></section>
    {isCloseModalOpen && openSession ? <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCloseModalOpen(false); }}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="close-title"><div className={styles.modalHeader}><div><p className={styles.eyebrow}>Récapitulatif</p><h2 id="close-title">Fermer la caisse</h2></div><button type="button" className={styles.closeButton} onClick={() => setIsCloseModalOpen(false)} aria-label="Fermer">×</button></div><div className={styles.recap}><div><span>Montant théorique</span><strong>{money(expectedCash)}</strong></div><div><span>Montant physique compté</span><label htmlFor="modalCloseAmount"><input id="modalCloseAmount" autoFocus type="number" min="0" value={closeAmount} onChange={(event) => setCloseAmount(event.target.value)} placeholder="0" /> FCFA</label></div><div className={closingDifference === 0 && closeAmount ? styles.recapGood : styles.recapDifference}><span>Écart</span><strong>{closeAmount ? money(closingDifference) : "À calculer"}</strong></div></div><p className={styles.modalNote}>Après confirmation, cette session devient historique. Le montant physique saisi deviendra le montant d’ouverture attendu de la prochaine session.</p><div className={styles.modalActions}><button type="button" className={styles.cancelButton} onClick={() => setIsCloseModalOpen(false)}>Annuler</button><button type="button" className={styles.primaryButton} onClick={confirmClose} disabled={!closeAmount || isClosing}>{isClosing ? "Clôture…" : "Confirmer la clôture"}</button></div></section></div> : null}
  </AppShell>;
}
