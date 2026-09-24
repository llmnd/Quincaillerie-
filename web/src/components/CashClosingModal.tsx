"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { authHeaders } from "../lib/auth";
import styles from "../app/cash/page.module.css";

type Session = { id: number; register_id: number; actual_opening_amount: number };
type Balance = {
  expected_cash_amount: number;
  payment_totals?: Record<string, number>;
  cash_in?: number;
  cash_out?: number;
};

type Props = {
  session: Session;
  balance: Balance | null;
  onDismiss: () => void;
  onClosed: () => void;
};

const money = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} FCFA`;

export default function CashClosingModal({ session, balance, onDismiss, onClosed }: Readonly<Props>) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState("");
  const expected = balance?.expected_cash_amount ?? session.actual_opening_amount;
  const difference = Number(amount || 0) - expected;

  async function closeCash() {
    if (!amount || isClosing) return;
    setIsClosing(true);
    setError("");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/v1/cash/sessions/${session.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ actual_closing_amount: Number(amount), note: note.trim() || null }),
      });
      if (!response.ok) throw new Error("close_failed");
      window.sessionStorage.removeItem("quincaillerie_sale_draft");
      window.sessionStorage.removeItem("quincaillerie_pos_return_path");
      window.sessionStorage.removeItem("quincaillerie_pos_open");
      window.sessionStorage.removeItem("quincaillerie_checkout_view");
      onClosed();
    } catch {
      setError("Clôture impossible. Vérifiez le montant et réessayez.");
    } finally {
      setIsClosing(false);
    }
  }

  return (
    <dialog
      open
      className={styles.modalOverlay}
      aria-labelledby="pos-close-title"
    >
      <div className={styles.closeModal}>
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.modalEyebrow}>Clôture de Caisse</span>
            <h3 id="pos-close-title">Fermeture de la Caisse #{session.register_id}</h3>
          </div>
          <button type="button" onClick={onDismiss} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.daySummary}>
            <div className={styles.daySummaryLabel}>Résumé de la journée</div>
            <div className={styles.daySummaryValue}>Solde théorique · {money(expected)}</div>
          </div>
          <div className={styles.paymentGroupsWrapper}>
            {Object.entries(balance?.payment_totals ?? {}).map(([method, value]) => (
              <div key={method} className={styles.paymentMethodGroup}>
                <div className={styles.paymentMethodHeader}><h4>{method === "cash" ? "Espèces" : method}</h4><span className={styles.paymentMethodAmount}>{money(value)}</span></div>
              </div>
            ))}
          </div>
          <div className={styles.countingBox}>
            <label className={styles.countingLabel} htmlFor="pos-close-amount">Comptage de Caisse (Espèces)</label>
            <input id="pos-close-amount" type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" className={styles.countingInput} autoFocus />
            {amount && <div className={styles.countingDetails}><div className={styles.countingLine}><span className={styles.countingLineLabel}>Écart</span><strong className={styles.countingLineValue}>{money(difference)}</strong></div></div>}
          </div>
          <div className={styles.closingNote}>
            <label className={styles.closingNoteLabel} htmlFor="pos-close-note">Note de clôture</label>
            <textarea id="pos-close-note" value={note} onChange={(event) => setNote(event.target.value)} className={styles.closingNoteInput} placeholder="Ajouter une note de fermeture…" />
          </div>
          {error && <p className={styles.message}>{error}</p>}
        </div>
        <div className={styles.closeActions}>
          <button type="button" className={styles.outlineButton} onClick={onDismiss}>Annuler</button>
          <button type="button" className={styles.zaraButton} onClick={closeCash} disabled={isClosing || !amount}>{isClosing ? "…" : "Fermer la caisse"}</button>
        </div>
      </div>
    </dialog>
  );
}
