"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronDown, History } from "lucide-react";
import AppShell from "../../components/AppShell";
import { authHeaders } from "../../lib/auth";
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
  const router = useRouter();
  const [registers, setRegisters] = useState<Register[]>([]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [recaps, setRecaps] = useState<SessionRecap[]>([]);
  const [balance, setBalance] = useState<CashBalance | null>(null);
  const [registerId, setRegisterId] = useState("");
  const [amount, setAmount] = useState("");
  const [closeAmount, setCloseAmount] = useState("");
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerCode, setRegisterCode] = useState("");
  const [isCreatingRegister, setIsCreatingRegister] = useState(false);
  const [registerError, setRegisterError] = useState("");
  
  // Accordéons
  const [showHistory, setShowHistory] = useState(false);
  const [expandedRecapId, setExpandedRecapId] = useState<number | null>(null);

  const [message, setMessage] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [isAdmin] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const storedUser = window.localStorage.getItem("quincaillerie_user");
      if (!storedUser) return false;
      const parsed = JSON.parse(storedUser) as { role?: "admin" | "seller"; user?: { role?: "admin" | "seller" } };
      return (parsed.user?.role ?? parsed.role) === "admin";
    } catch {
      return false;
    }
  });

  // Verrouillage du scroll en arrière-plan & gestion de la touche Échap
  useEffect(() => {
    if (isCloseModalOpen || isRegisterModalOpen) {
      document.body.style.overflow = "hidden";
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsCloseModalOpen(false);
          setIsRegisterModalOpen(false);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isCloseModalOpen, isRegisterModalOpen]);

  const headers = (): Record<string, string> => {
    return authHeaders() as Record<string, string>;
  };

  async function load() {
    const [registerResponse, sessionResponse, recapResponse] = await Promise.all([
      fetch(`${API_URL}/api/v1/cash/registers`, { headers: headers(), credentials: "include" }),
      fetch(`${API_URL}/api/v1/cash/sessions`, { headers: headers(), credentials: "include" }),
      fetch(`${API_URL}/api/v1/cash/sessions/recap`, { headers: headers(), credentials: "include" }),
    ]);
    if (!registerResponse.ok || !sessionResponse.ok) throw new Error();
    setRegisters(await registerResponse.json());
    setSessions(await sessionResponse.json());
    setRecaps(recapResponse.ok ? await recapResponse.json() : []);
  }

  useEffect(() => {
    let isMounted = true;

    const initializeCashPage = async () => {
      try {
        await load();
        if (!isMounted) return;
        setBalance(null);
      } catch {
        if (isMounted) {
          setMessage("Impossible de charger les caisses.");
        }
      }
    };

    void initializeCashPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const openSession = sessions.find((session) => session.status === "open");
  const previousSession = sessions.find((session) => session.status === "closed" && session.register_id === Number(registerId));
  const expectedCash = balance?.expected_cash_amount ?? openSession?.actual_opening_amount ?? 0;
  const physicalClosing = Number(closeAmount || 0);
  const closingDifference = physicalClosing - expectedCash;

  useEffect(() => {
    if (!openSession) return;

    let isMounted = true;

    const fetchBalance = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/cash/sessions/${openSession.id}/balance`, {
          headers: headers(),
          credentials: "include",
        });
        if (!isMounted) return;
        setBalance(response.ok ? await response.json() : null);
      } catch {
        if (isMounted) {
          setBalance(null);
        }
      }
    };

    void fetchBalance();

    return () => {
      isMounted = false;
    };
  }, [openSession?.id]);

  async function open(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`${API_URL}/api/v1/cash/sessions/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers() },
      credentials: "include",
      body: JSON.stringify({ register_id: Number(registerId), actual_opening_amount: Number(amount) }),
    });
    if (!response.ok) {
      setMessage("Ouverture impossible. Vérifiez la caisse ou le montant.");
      return;
    }
    setMessage("Caisse ouverte.");
    setAmount("");
    await load();
    router.replace("/sales");
  }

  async function createRegister(event: FormEvent) {
    event.preventDefault();
    setIsCreatingRegister(true);
    setRegisterError("");

    try {
      const response = await fetch(`${API_URL}/api/v1/cash/registers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        credentials: "include",
        body: JSON.stringify({ name: registerName.trim(), code: registerCode.trim().toUpperCase() }),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { detail?: string | { msg?: string }[] } | null;
        const validationMessage = Array.isArray(detail?.detail) ? detail.detail[0]?.msg : detail?.detail;
        setRegisterError(response.status === 409 ? "Ce code de caisse existe déjà." : validationMessage || `Création impossible (${response.status}).`);
        return;
      }

      const register = await response.json() as Register;
      setRegisters((current) => [...current, register]);
      setRegisterId(String(register.id));
      setRegisterName("");
      setRegisterCode("");
      setIsRegisterModalOpen(false);
      setMessage("Caisse créée. Vous pouvez maintenant ouvrir la session.");
    } catch {
      setRegisterError("Serveur inaccessible. Vérifiez votre connexion puis réessayez.");
    } finally {
      setIsCreatingRegister(false);
    }
  }

  async function confirmClose() {
    if (!openSession || !closeAmount) return;
    setIsClosing(true);
    const response = await fetch(`${API_URL}/api/v1/cash/sessions/${openSession.id}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers() },
      credentials: "include",
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
          <div className={styles.headerActions}>
            {isAdmin && (
              <button type="button" className={styles.addRegisterButton} onClick={() => { setRegisterError(""); setIsRegisterModalOpen(true); }}>
                + NOUVELLE CAISSE
              </button>
            )}
            <div className={styles.statusIndicator}>
              <span className={openSession ? styles.dotActive : styles.dotInactive} />
              <span className={styles.statusText}>{openSession ? "SESSION ACTIVE" : "FERMÉ"}</span>
            </div>
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
              <History size={16} /> HISTORIQUE D&apos;EXPLOITATION ({sessions.length})
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

        {/* ACCORDÉON 2 : RÉCAPITULATIFS DE CLÔTURE */}
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

        {/* MODAL DE CLÔTURE */}
        {isRegisterModalOpen && (
          <div className={styles.modalOverlay} onClick={() => setIsRegisterModalOpen(false)}>
            <form className={styles.zaraModal} onSubmit={createRegister} onClick={(event) => event.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <span className={styles.modalEyebrow}>Administration</span>
                  <h3 id="register-modal-title">NOUVELLE CAISSE</h3>
                </div>
                <button type="button" onClick={() => setIsRegisterModalOpen(false)} aria-label="Fermer la fenêtre">
                  <X size={18} />
                </button>
              </div>

              <div className={styles.registerFormBody}>
                <p className={styles.modalIntro}>Créez une caisse pour qu’elle soit disponible à l’ouverture d’une session.</p>
                {registerError && <p className={styles.registerError} role="alert">{registerError}</p>}
                <div className={styles.modalInputGroup}>
                  <label htmlFor="registerName">Nom de la caisse</label>
                  <input id="registerName" required minLength={2} maxLength={100} autoFocus value={registerName} onChange={(event) => setRegisterName(event.target.value)} placeholder="Caisse principale" />
                </div>
                <div className={styles.modalInputGroup}>
                  <label htmlFor="registerCode">Code interne</label>
                  <input id="registerCode" required minLength={1} maxLength={50} value={registerCode} onChange={(event) => setRegisterCode(event.target.value)} placeholder="CAISSE-01" />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.outlineButton} onClick={() => setIsRegisterModalOpen(false)}>ANNULER</button>
                <button type="submit" className={styles.zaraButton} disabled={isCreatingRegister}>{isCreatingRegister ? "CRÉATION…" : "CRÉER LA CAISSE"}</button>
              </div>
            </form>
          </div>
        )}

        {isCloseModalOpen && openSession && (
          <div className={styles.modalOverlay} onClick={() => setIsCloseModalOpen(false)}>
            <div 
              className={styles.zaraModal} 
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
            >
              <div className={styles.modalHeader}>
                <h3 id="modal-title">CLÔTURE DE SESSION</h3>
                <button type="button" onClick={() => setIsCloseModalOpen(false)} aria-label="Fermer la fenêtre">
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
                    onChange={(e) => setCloseAmount(e.target.value)}
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