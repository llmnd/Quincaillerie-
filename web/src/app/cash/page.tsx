"use client";

import { FormEvent, useEffect, useState } from "react";
import { X, ChevronDown, Plus, History } from "lucide-react";
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
  
  // États de révélation au clic (Accordéons)
  const [showHistory, setShowHistory] = useState(false);
  const [expandedRecapId, setExpandedRecapId] = useState<number | null>(null);

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
    setMessage("Caisse ouverte.");
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
    setMessage("Session clôturée.");
    setCloseAmount("");
    setIsClosing(false);
    await load();
  }

  return (
    <AppShell>
      <div className={styles.container}>
        {/* HEADER ZARA STYLE */}
        <header className={styles.header}>
          <div>
            <span className={styles.categoryLabel}>POINT DE VENTE</span>
            <h1 className={styles.title}>CAISSE</h1>
          </div>
          <div className={styles.statusIndicator}>
            <span className={openSession ? styles.dotActive : styles.dotInactive} />
            <span className={styles.statusText}>{openSession ? "SESSION ACTIVE" : "FERMÉ"}</span>
          </div>
        </header>

        {message && <div className={styles.messageBanner}>{message}</div>}

        {/* SECTION PRINCIPALE */}
        <section className={styles.mainGrid}>
          {openSession ? (
            <article className={styles.minimalCard}>
              <div className={styles.cardHeader}>
                <h2>Caisse #{openSession.register_id}</h2>
                <span className={styles.sessionBadge}>Session en cours</span>
              </div>

              <div className={styles.metricsRow}>
                <div className={styles.metricBlock}>
                  <label>Mise en caisse</label>
                  <p>{money(openSession.expected_opening_amount)}</p>
                </div>
                <div className={styles.metricBlock}>
                  <label>Solde théorique</label>
                  <p className={styles.highlight}>{money(expectedCash)}</p>
                </div>
                <div className={styles.metricBlock}>
                  <label>Écart ouverture</label>
                  <p>{money(openSession.opening_difference)}</p>
                </div>
              </div>

              {isAdmin && (
                <div className={styles.actionRow}>
                  <button type="button" className={styles.zaraButton} onClick={() => setIsCloseModalOpen(true)}>
                    CLÔTURER LA CAISSE
                  </button>
                </div>
              )}
            </article>
          ) : (
            <article className={styles.minimalCard}>
              <h2>Ouverture de session</h2>
              <form onSubmit={open} className={styles.zaraForm}>
                <div className={styles.inputGroup}>
                  <label htmlFor="register">Caisse cible</label>
                  <select id="register" required value={registerId} onChange={(e) => setRegisterId(e.target.value)}>
                    <option value="">Sélectionner une caisse...</option>
                    {registers.map((r) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                    ))}
                  </select>
                </div>

                {registerId && (
                  <div className={styles.infoLine}>
                    <span>Dernière clôture enregistrée :</span>
                    <strong>{money(previousSession?.actual_closing_amount ?? 0)}</strong>
                  </div>
                )}

                <div className={styles.inputGroup}>
                  <label htmlFor="amount">Montant en caisse (FCFA)</label>
                  <input
                    id="amount"
                    required
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <button className={styles.zaraButton}>OUVRIR LA SESSION</button>
              </form>
            </article>
          )}
        </section>

        {/* ACCORDÉON 1 : HISTORIQUE DES SESSIONS */}
        <section className={styles.accordionSection}>
          <button 
            type="button" 
            className={styles.accordionToggle} 
            onClick={() => setShowHistory(!showHistory)}
          >
            <span className={styles.accordionTitle}>
              <History size={16} /> HISTORIQUE D'EXPLOITATION ({sessions.length})
            </span>
            <ChevronDown size={16} className={`${styles.chevron} ${showHistory ? styles.chevronRotated : ''}`} />
          </button>

          {showHistory && (
            <div className={styles.accordionContent}>
              <div className={styles.historyTable}>
                {sessions.map((s) => (
                  <div key={s.id} className={styles.historyRow}>
                    <div className={styles.historyMain}>
                      <strong>Session #{s.id}</strong>
                      <small>Ouverte le {dateTime(s.opened_at)}</small>
                    </div>
                    <div className={styles.historyStatus}>
                      <span className={s.status === "open" ? styles.tagOpen : styles.tagClosed}>
                        {s.status === "open" ? "Ouverte" : "Clôturée"}
                      </span>
                      {s.status === "closed" && (
                        <small className={s.closing_difference === 0 ? styles.goodText : styles.badText}>
                          Écart: {money(s.closing_difference ?? 0)}
                        </small>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ACCORDÉON 2 : RÉCAPITULATIFS DE CLÔTURE (CONTRÔLE) */}
        {recaps.length > 0 && (
          <section className={styles.accordionSection}>
            <div className={styles.sectionHeaderZara}>
              <h3>CONTRÔLE ET RÉCAPITULATIFS DE CAISSE</h3>
            </div>

            <div className={styles.recapList}>
              {recaps.map((recap) => {
                const isExpanded = expandedRecapId === recap.session_id;
                return (
                  <article key={recap.session_id} className={styles.recapItem}>
                    <button 
                      type="button"
                      className={styles.recapHeaderBar}
                      onClick={() => setExpandedRecapId(isExpanded ? null : recap.session_id)}
                    >
                      <div className={styles.recapMeta}>
                        <strong>{recap.register} — {recap.seller}</strong>
                        <small>Session #{recap.session_id} · {dateTime(recap.opened_at)}</small>
                      </div>

                      <div className={styles.recapRightNav}>
                        <span className={recap.closing_difference === 0 ? styles.goodText : styles.badText}>
                          {recap.status === "closed" ? money(recap.closing_difference ?? 0) : "En cours"}
                        </span>
                        <ChevronDown size={16} className={`${styles.chevron} ${isExpanded ? styles.chevronRotated : ''}`} />
                      </div>
                    </button>

                    {/* DÉTAILS RÉVÉLÉS AU CLIC */}
                    {isExpanded && (
                      <div className={styles.recapExpandedBody}>
                        <div className={styles.gridMetrics}>
                          <div>
                            <span>Ouverture</span>
                            <p>{money(recap.actual_opening_amount)}</p>
                          </div>
                          <div>
                            <span>Théorique</span>
                            <p>{money(recap.expected_closing_amount ?? 0)}</p>
                          </div>
                          <div>
                            <span>Compté</span>
                            <p>{recap.actual_closing_amount == null ? "-" : money(recap.actual_closing_amount)}</p>
                          </div>
                          <div>
                            <span>Écart</span>
                            <p className={recap.closing_difference === 0 ? styles.goodText : styles.badText}>
                              {recap.status === "closed" ? money(recap.closing_difference ?? 0) : "En cours"}
                            </p>
                          </div>
                        </div>

                        {recap.handoffs.length > 1 && (
                          <div className={styles.handoffBox}>
                            <label>Historique des passations</label>
                            {recap.handoffs.map((h, idx) => (
                              <p key={idx}>{idx + 1}. {h.seller} à {dateTime(h.acknowledged_at)}</p>
                            ))}
                          </div>
                        )}

                        <div className={styles.operationsBox}>
                          <label>Opérations ({recap.operations.length})</label>
                          {recap.operations.length > 0 ? (
                            <div className={styles.operationsList}>
                              {recap.operations.map((op) => (
                                <div key={op.id} className={styles.opItem}>
                                  <div>
                                    <span>{operationLabel(op.operation_type)}</span>
                                    <small>{dateTime(op.created_at)}</small>
                                  </div>
                                  <strong>{money(op.amount)}</strong>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className={styles.emptyText}>Aucune opération enregistrée.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* MODAL DE CLÔTURE (MINIMALISTE ARCHITECTURAL) */}
        {isCloseModalOpen && openSession && (
          <div className={styles.modalOverlay} onClick={() => setIsCloseModalOpen(false)}>
            <div className={styles.zaraModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>CLÔTURE DE SESSION</h3>
                <button type="button" onClick={() => setIsCloseModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.modalLine}>
                  <span>Solde théorique</span>
                  <strong>{money(expectedCash)}</strong>
                </div>

                <div className={styles.modalInputGroup}>
                  <label htmlFor="closeInput">Montant réellement en caisse (FCFA)</label>
                  <input
                    id="closeInput"
                    type="number"
                    min="0"
                    autoFocus
                    value={closeAmount}
                    onChange={(e) => setCloseAmount(e.eTarget.value || e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className={styles.modalLine}>
                  <span>Écart résultant</span>
                  <strong className={closingDifference === 0 ? styles.goodText : styles.badText}>
                    {money(closingDifference)}
                  </strong>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.outlineButton} onClick={() => setIsCloseModalOpen(false)}>
                  ANNULER
                </button>
                <button
                  type="button"
                  className={styles.zaraButton}
                  onClick={confirmClose}
                  disabled={isClosing || !closeAmount}
                >
                  {isClosing ? "TRAITEMENT..." : "CONFIRMER LA CLÔTURE"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}