"use client";

import { FormEvent, useEffect, useState } from "react";
import { X, ChevronRight, Eye } from "lucide-react";
import AppShell from "../../components/AppShell";
import styles from "./page.module.css";

type Register = { id: number; name: string; code: string };
type CashSession = {
  id: number;
  register_id: number;
  user_id: number;
  expected_opening_amount: number;
  actual_opening_amount: number;
  opening_difference: number;
  expected_closing_amount?: number | null;
  actual_closing_amount?: number | null;
  closing_difference?: number | null;
  status: string;
  opened_at: string;
  closed_at?: string | null;
};
type CashBalance = { expected_cash_amount: number };
type CashOperation = { id: number; operation_type: string; amount: number; created_at: string };
type SessionRecap = CashSession & { 
  session_id: number; 
  seller: string; 
  register: string; 
  handoffs: { seller: string; previous_seller?: string | null; acknowledged_at: string }[]; 
  operations: CashOperation[] 
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const money = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;
const operationLabel = (value: string) => ({ 
  sale: "Vente", 
  cash_in: "Encaissement", 
  cash_out: "Retrait", 
  refund: "Remboursement", 
  adjustment_in: "Ajustement entrant", 
  adjustment_out: "Ajustement sortant" 
}[value] ?? value);

const dateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "En cours";

export default function CashPage() {
  const [registers, setRegisters] = useState<Register[]>([]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [recaps, setRecaps] = useState<SessionRecap[]>([]);
  const [balance, setBalance] = useState<CashBalance | null>(null);
  const [registerId, setRegisterId] = useState("");
  const [amount, setAmount] = useState("");
  const [closeAmount, setCloseAmount] = useState("");
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [selectedRecap, setSelectedRecap] = useState<SessionRecap | null>(null);
  const [message, setMessage] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const headers = (): Record<string, string> => {
    const token = window.localStorage.getItem("quincaillerie_access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  async function load() {
    const [registerResponse, sessionResponse, recapResponse] = await Promise.all([
      fetch(`${API_URL}/api/v1/cash/registers`, { headers: headers() }),
      fetch(`${API_URL}/api/v1/cash/sessions`, { headers: headers() }),
      fetch(`${API_URL}/api/v1/cash/sessions/recap`, { headers: headers() }),
    ]);
    if (!registerResponse.ok || !sessionResponse.ok) throw new Error();
    setRegisters(await registerResponse.json());
    setSessions(await sessionResponse.json());
    setRecaps(recapResponse.ok ? await recapResponse.json() : []);
  }

  useEffect(() => {
    const storedUser = window.localStorage.getItem("quincaillerie_user");
    if (storedUser) setIsAdmin(JSON.parse(storedUser).role === "admin");
    load().catch(() => setMessage("Impossible de charger les caisses."));
  }, []);

  const openSession = sessions.find((session) => session.status === "open");
  const previousSession = sessions.find((session) => session.status === "closed" && session.register_id === Number(registerId));
  const expectedCash = balance?.expected_cash_amount ?? openSession?.actual_opening_amount ?? 0;
  const physicalClosing = Number(closeAmount || 0);
  const closingDifference = physicalClosing - expectedCash;

  useEffect(() => {
    if (!openSession) {
      setBalance(null);
      return;
    }
    fetch(`${API_URL}/api/v1/cash/sessions/${openSession.id}/balance`, { headers: headers() })
      .then((response) => (response.ok ? response.json() : null))
      .then(setBalance)
      .catch(() => setBalance(null));
  }, [openSession?.id]);

  async function open(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`${API_URL}/api/v1/cash/sessions/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers() },
      body: JSON.stringify({ register_id: Number(registerId), actual_opening_amount: Number(amount) }),
    });
    if (!response.ok) {
      setMessage("Ouverture impossible. Vérifiez la caisse ou le montant.");
      return;
    }
    setMessage("Caisse ouverte et comptage enregistré.");
    setAmount("");
    await load();
  }

  async function confirmClose() {
    if (!openSession || !closeAmount) return;
    setIsClosing(true);
    const response = await fetch(`${API_URL}/api/v1/cash/sessions/${openSession.id}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers() },
      body: JSON.stringify({ actual_closing_amount: physicalClosing }),
    });
    if (!response.ok) {
      setMessage("Clôture impossible.");
      setIsClosing(false);
      return;
    }
    setIsCloseModalOpen(false);
    setMessage("Session clôturée. L'écart est conservé dans l'historique.");
    setCloseAmount("");
    setIsClosing(false);
    await load();
  }

  return (
    <AppShell>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Point de vente</p>
          <h1>Caisse</h1>
          <p>Ouverture, ventes et clôture de sessions traçables.</p>
        </div>
        <span className={openSession ? styles.open : styles.closed}>
          {openSession ? "Session ouverte" : "Aucune session ouverte"}
        </span>
      </header>

      {message && <div className={styles.message}>{message}</div>}

      <section className={styles.grid}>
        {openSession ? (
          <article className={styles.card}>
            <p className={styles.eyebrow}>Session active</p>
            <h2>Caisse #{openSession.register_id}</h2>
            <div className={styles.metrics}>
              <div>
                <span>Départ attendu</span>
                <strong>{money(openSession.expected_opening_amount)}</strong>
              </div>
              <div>
                <span>Montant caisse actuel</span>
                <strong>{money(expectedCash)}</strong>
              </div>
              <div>
                <span>Écart ouverture</span>
                <strong className={openSession.opening_difference === 0 ? styles.good : styles.warning}>
                  {money(openSession.opening_difference)}
                </strong>
              </div>
            </div>
            <div className={styles.closeBox}>
              <p>La fermeture compare le montant théorique avec le comptage physique.</p>
              {isAdmin && (
                <button type="button" className={styles.primaryButton} onClick={() => setIsCloseModalOpen(true)}>
                  Clôturer la caisse
                </button>
              )}
            </div>
          </article>
        ) : (
          <article className={styles.card}>
            <p className={styles.eyebrow}>Nouvelle session</p>
            <h2>Ouvrir une caisse</h2>
            <form onSubmit={open} className={styles.form}>
              <label htmlFor="register">
                Caisse
                <select id="register" required value={registerId} onChange={(event) => setRegisterId(event.target.value)}>
                  <option value="">Choisir une caisse</option>
                  {registers.map((register) => (
                    <option key={register.id} value={register.id}>
                      {register.name} · {register.code}
                    </option>
                  ))}
                </select>
              </label>
              {registerId && (
                <div className={styles.previousClosing}>
                  <span>Dernière clôture de cette caisse</span>
                  <strong>{money(previousSession?.actual_closing_amount ?? 0)}</strong>
                  <small>
                    {previousSession ? `Session #${previousSession.id} · ${dateTime(previousSession.closed_at)}` : "Aucune clôture précédente"}
                  </small>
                </div>
              )}
              <label htmlFor="amount">
                Montant réellement présent
                <input
                  id="amount"
                  required
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Montant en FCFA"
                />
              </label>
              <button className={styles.primaryButton}>Vérifier et ouvrir</button>
            </form>
          </article>
        )}

        <article className={styles.card}>
          <p className={styles.eyebrow}>Historique</p>
          <h2>Sessions de caisse</h2>
          <div className={styles.history}>
            {sessions.map((session) => (
              <div key={session.id}>
                <strong>Session #{session.id}</strong>
                <span>{session.status === "open" ? "Ouverte" : "Clôturée"}</span>
                <small>
                  {session.status === "closed" ? `Écart : ${money(session.closing_difference ?? 0)}` : `Écart ouverture : ${money(session.opening_difference)}`}
                </small>
              </div>
            ))}
          </div>
        </article>
      </section>

      {recaps.length > 0 && (
        <section className={styles.recapSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Contrôle administrateur</p>
              <h2>Récapitulatifs de clôture</h2>
            </div>
            <span>
              {recaps.length} session{recaps.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className={styles.recapTable}>
            {recaps.map((recap) => (
              <article 
                key={recap.session_id} 
                className={styles.recapCard} 
                onClick={() => setSelectedRecap(recap)}
                role="button"
                tabIndex={0}
              >
                <div className={styles.recapCardHeader}>
                  <div>
                    <strong>
                      {recap.register} · {recap.seller}
                    </strong>
                    <small>
                      Session #{recap.session_id} · {dateTime(recap.opened_at)} → {dateTime(recap.closed_at)}
                    </small>
                  </div>
                  <div className={styles.recapHeaderRight}>
                    <b className={recap.closing_difference === 0 ? styles.good : styles.warning}>
                      {recap.status === "closed" ? money(recap.closing_difference ?? 0) : "En cours"}
                    </b>
                    <span className={styles.viewBadge}>
                      <Eye size={13} />
                      <span className={styles.viewText}>Détails</span>
                      <ChevronRight size={14} className={styles.mobileChevron} />
                    </span>
                  </div>
                </div>

                <div className={styles.recapMetrics}>
                  <span>
                    Ouverture
                    <strong>{money(recap.actual_opening_amount)}</strong>
                  </span>
                  <span>
                    Théorique
                    <strong>{money(recap.expected_closing_amount ?? 0)}</strong>
                  </span>
                  <span>
                    Compté
                    <strong>{recap.actual_closing_amount == null ? "-" : money(recap.actual_closing_amount)}</strong>
                  </span>
                </div>

                {/* Prévisualisation restreinte des opérations pour un aperçu rapide */}
                {recap.operations.length > 0 ? (
                  <div className={styles.operationsPreview}>
                    <small>{recap.operations.length} opération(s) enregistrée(s)</small>
                  </div>
                ) : (
                  <small className={styles.noOperations}>Aucune opération complémentaire</small>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Modal de détail du récapitulatif (au clic sur une carte) */}
      {selectedRecap && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedRecap(null)}>
          <div className={`${styles.modal} ${styles.recapModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Session #{selectedRecap.session_id}</p>
                <h2>Détails · {selectedRecap.register}</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setSelectedRecap(null)}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className={styles.recapDetailBody}>
              <div className={styles.detailRow}>
                <span>Caissier principal</span>
                <strong>{selectedRecap.seller}</strong>
              </div>
              <div className={styles.detailRow}>
                <span>Période</span>
                <strong>{dateTime(selectedRecap.opened_at)} → {dateTime(selectedRecap.closed_at)}</strong>
              </div>

              <div className={styles.recapMetricsModal}>
                <div>
                  <span>Ouverture</span>
                  <strong>{money(selectedRecap.actual_opening_amount)}</strong>
                </div>
                <div>
                  <span>Théorique</span>
                  <strong>{money(selectedRecap.expected_closing_amount ?? 0)}</strong>
                </div>
                <div>
                  <span>Compté</span>
                  <strong>{selectedRecap.actual_closing_amount == null ? "-" : money(selectedRecap.actual_closing_amount)}</strong>
                </div>
                <div>
                  <span>Écart final</span>
                  <strong className={selectedRecap.closing_difference === 0 ? styles.good : styles.warning}>
                    {selectedRecap.status === "closed" ? money(selectedRecap.closing_difference ?? 0) : "En cours"}
                  </strong>
                </div>
              </div>

              {selectedRecap.handoffs.length > 1 && (
                <div className={styles.handoffHistory}>
                  <small>Historique des passations</small>
                  {selectedRecap.handoffs.map((handoff, index) => (
                    <span key={`${selectedRecap.session_id}-${handoff.acknowledged_at}`}>
                      {index + 1}. {handoff.seller} · {dateTime(handoff.acknowledged_at)}
                    </span>
                  ))}
                </div>
              )}

              <div className={styles.operationsFull}>
                <small>Détail complet des opérations ({selectedRecap.operations.length})</small>
                {selectedRecap.operations.length > 0 ? (
                  <div className={styles.operationsList}>
                    {selectedRecap.operations.map((operation) => (
                      <div key={operation.id} className={styles.operationItem}>
                        <div>
                          <strong>{operationLabel(operation.operation_type)}</strong>
                          <small>{dateTime(operation.created_at)}</small>
                        </div>
                        <span className={styles.operationAmount}>{money(operation.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <small className={styles.noOperations}>Aucune opération complémentaire effectuée pendant cette session.</small>
                )}
              </div>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.primaryButton} onClick={() => setSelectedRecap(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de clôture de caisse */}
      {isCloseModalOpen && openSession && (
        <div className={styles.modalBackdrop} onClick={() => setIsCloseModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Clôturer la caisse</h2>
              <button type="button" className={styles.closeButton} onClick={() => setIsCloseModalOpen(false)}>
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            <div className={styles.recap}>
              <div>
                <span>Montant théorique</span>
                <strong>{money(expectedCash)}</strong>
              </div>
              <div>
                <span>Montant compté</span>
                <label htmlFor="closeInput">
                  FCFA
                  <input
                    id="closeInput"
                    type="number"
                    min="0"
                    value={closeAmount}
                    onChange={(event) => setCloseAmount(event.target.value)}
                    placeholder="0"
                  />
                </label>
              </div>
              <div className={closingDifference === 0 ? styles.recapGood : styles.recapDifference}>
                <span>Écart de clôture</span>
                <strong>{money(closingDifference)}</strong>
              </div>
            </div>

            <p className={styles.modalNote}>
              L'écart entre le montant théorique et celui compté sera archivé. Vous pouvez procéder même en cas de différence.
            </p>

            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setIsCloseModalOpen(false)}>
                Annuler
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={confirmClose}
                disabled={isClosing || !closeAmount}
              >
                {isClosing ? "Clôture en cours…" : "Confirmer la clôture"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}