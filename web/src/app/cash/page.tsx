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
type CashBalance = {
  expected_cash_amount: number;
  payment_totals?: Record<string, number>;
  cash_in?: number;
  cash_out?: number;
};
type CashOperation = { id: number; operation_type: string; amount: number; created_at: string };
type SessionRecap = CashSession & {
  session_id: number;
  seller: string;
  register: string;
  handoffs: { seller: string; previous_seller?: string | null; acknowledged_at: string }[];
  operations: CashOperation[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const money = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

const operationLabel = (value: string) =>
  ({
    sale: "Vente",
    cash_in: "Encaissement",
    cash_out: "Retrait",
    refund: "Remboursement",
    adjustment_in: "Ajustement entrant",
    adjustment_out: "Ajustement sortant",
  }[value] ?? value);

const dateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "En cours";

const paymentMethodLabel = (key: string): string =>
  ({
    cash: "Espèces",
    wave: "Wave",
    orange_money: "Orange Money",
    mobile_money: "Mobile Money",
    card: "Carte",
    other: "Autre",
  }[key] ?? key);

export default function CashPage() {
  const router = useRouter();
  const [registers, setRegisters] = useState<Register[]>([]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [recaps, setRecaps] = useState<SessionRecap[]>([]);
  const [balance, setBalance] = useState<CashBalance | null>(null);
  const [registerId, setRegisterId] = useState("");
  const [amount, setAmount] = useState("");
  const [closeAmount, setCloseAmount] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerCode, setRegisterCode] = useState("");
  const [isCreatingRegister, setIsCreatingRegister] = useState(false);
  const [registerError, setRegisterError] = useState("");

  const [showHistory, setShowHistory] = useState(false);
  const [expandedRecapId, setExpandedRecapId] = useState<number | null>(null);

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [operationType, setOperationType] = useState<"cash_in" | "cash_out">("cash_in");
  const [operationAmount, setOperationAmount] = useState("");
  const [operationReason, setOperationReason] = useState("");
  const [isSavingOperation, setIsSavingOperation] = useState(false);
  const [isAdmin] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const storedUser = window.localStorage.getItem("quincaillerie_user");
      if (!storedUser) return false;
      const parsed = JSON.parse(storedUser) as {
        role?: "admin" | "seller";
        user?: { role?: "admin" | "seller" };
      };
      return (parsed.user?.role ?? parsed.role) === "admin";
    } catch {
      return false;
    }
  });

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
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void initializeCashPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const openSession = sessions.find((session) => session.status === "open");
  const previousSession = sessions.find(
    (session) => session.status === "closed" && session.register_id === Number(registerId)
  );
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
      body: JSON.stringify({
        register_id: Number(registerId),
        actual_opening_amount: Number(amount),
      }),
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
        body: JSON.stringify({
          name: registerName.trim(),
          code: registerCode.trim().toUpperCase(),
        }),
      });

      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as
          | { detail?: string | { msg?: string }[] }
          | null;
        const validationMessage = Array.isArray(detail?.detail)
          ? detail.detail[0]?.msg
          : detail?.detail;
        setRegisterError(
          response.status === 409
            ? "Ce code de caisse existe déjà."
            : validationMessage || `Création impossible (${response.status}).`
        );
        return;
      }

      const register = (await response.json()) as Register;
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
    setCloseNote("");
    setIsClosing(false);
    await load();
  }

  async function saveCashOperation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!openSession || !operationAmount || !operationReason.trim()) return;
    setIsSavingOperation(true);
    const response = await fetch(`${API_URL}/api/v1/cash/operations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers() },
      credentials: "include",
      body: JSON.stringify({
        session_id: openSession.id,
        operation_type: operationType,
        amount: Number(operationAmount),
        payment_method: "cash",
        reason: operationReason.trim(),
      }),
    });
    if (!response.ok) {
      setMessage("Impossible d'enregistrer cette opération de caisse.");
    } else {
      setMessage(
        operationType === "cash_in"
          ? "Entrée de caisse enregistrée."
          : "Sortie de caisse enregistrée."
      );
      setOperationAmount("");
      setOperationReason("");
      const balanceResponse = await fetch(
        `${API_URL}/api/v1/cash/sessions/${openSession.id}/balance`,
        { headers: headers(), credentials: "include" }
      );
      if (balanceResponse.ok) setBalance(await balanceResponse.json());
      await load();
    }
    setIsSavingOperation(false);
  }

  const totalPayments = Object.values(balance?.payment_totals ?? {}).reduce(
    (sum, value) => sum + value,
    0
  );

  return (
    <AppShell>
      {isLoading ? (
        <div className={styles.loadingState} aria-busy="true" aria-live="polite">
          <span className={styles.loadingSpinner} />
          <span>Vérification de la caisse et de la session…</span>
        </div>
      ) : (
        <div className={styles.container}>
          {/* HEADER */}
          <header className={styles.header}>
            <div>
              <span className={styles.categoryLabel}>Point de Vente</span>
              <h1 className={styles.title}>Caisse</h1>
            </div>
            <div className={styles.headerActions}>
              {isAdmin && (
                <button
                  type="button"
                  className={styles.addRegisterButton}
                  onClick={() => {
                    setRegisterError("");
                    setIsRegisterModalOpen(true);
                  }}
                >
                  + Nouvelle Caisse
                </button>
              )}
              <div className={styles.statusIndicator}>
                <span className={openSession ? styles.dotActive : styles.dotInactive} />
                <span className={styles.statusText}>
                  {openSession ? "Session Active" : "Fermé"}
                </span>
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
                    <label>Mise initiale</label>
                    <p>{money(openSession.actual_opening_amount)}</p>
                  </div>
                  <div className={styles.metricBlock}>
                    <label>Solde théorique</label>
                    <p className={styles.highlight}>{money(expectedCash)}</p>
                  </div>
                  <div className={styles.metricBlock}>
                    <label>Total ventes</label>
                    <p>{money(totalPayments)}</p>
                  </div>
                </div>

                {/* RÉSUMÉ PAIEMENTS */}
                <div className={styles.paymentSummary}>
                  <h3>Encaissements par moyen de paiement</h3>
                  <div className={styles.paymentGrid}>
                    {["cash", "wave", "orange_money", "mobile_money", "card", "other"].map(
                      (key) => (
                        <div key={key}>
                          <span>{paymentMethodLabel(key)}</span>
                          <strong>{money(balance?.payment_totals?.[key] ?? 0)}</strong>
                        </div>
                      )
                    )}
                  </div>
                  <div className={styles.cashFlowLine}>
                    <div>
                      <span>Entrées cash</span>
                      <strong>{money(balance?.cash_in ?? 0)}</strong>
                    </div>
                    <div>
                      <span>Sorties cash</span>
                      <strong>{money(balance?.cash_out ?? 0)}</strong>
                    </div>
                  </div>
                </div>

                {/* MOUVEMENT DE CAISSE */}
                <form className={styles.cashOperationForm} onSubmit={saveCashOperation}>
                  <h3>Mouvement de Caisse</h3>
                  <div className={styles.operationFields}>
                    <select
                      value={operationType}
                      onChange={(event) =>
                        setOperationType(event.target.value as "cash_in" | "cash_out")
                      }
                      aria-label="Type de mouvement"
                    >
                      <option value="cash_in">Entrée</option>
                      <option value="cash_out">Sortie</option>
                    </select>
                    <input
                      required
                      min="1"
                      type="number"
                      value={operationAmount}
                      onChange={(event) => setOperationAmount(event.target.value)}
                      placeholder="Montant FCFA"
                    />
                    <input
                      required
                      value={operationReason}
                      onChange={(event) => setOperationReason(event.target.value)}
                      placeholder="Motif"
                    />
                    <button
                      type="submit"
                      className={styles.outlineButton}
                      disabled={isSavingOperation}
                    >
                      {isSavingOperation ? "…" : "Enregistrer"}
                    </button>
                  </div>
                </form>

                {isAdmin && (
                  <div className={styles.actionRow}>
                    <button
                      type="button"
                      className={styles.zaraButton}
                      onClick={() => setIsCloseModalOpen(true)}
                    >
                      Clôturer la Caisse
                    </button>
                  </div>
                )}
              </article>
            ) : (
              <article className={styles.minimalCard}>
                <h2>Ouverture de Session</h2>
                <form onSubmit={open} className={styles.zaraForm}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="register">Sélectionner une caisse</label>
                    <select
                      id="register"
                      required
                      value={registerId}
                      onChange={(e) => setRegisterId(e.target.value)}
                    >
                      <option value="">Choisir une caisse...</option>
                      {registers.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {registerId && (
                    <div className={styles.infoLine}>
                      <span>Dernier montant clôturé :</span>
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

                  <button className={styles.zaraButton}>Ouvrir la Session</button>
                </form>
              </article>
            )}
          </section>

          {/* ACCORDÉON : HISTORIQUE */}
          <section className={styles.accordionSection}>
            <button
              type="button"
              className={styles.accordionToggle}
              onClick={() => setShowHistory(!showHistory)}
            >
              <span className={styles.accordionTitle}>
                <History size={16} /> Historique d&apos;Exploitation ({sessions.length})
              </span>
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${showHistory ? styles.chevronRotated : ""}`}
              />
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
                        <span
                          className={s.status === "open" ? styles.tagOpen : styles.tagClosed}
                        >
                          {s.status === "open" ? "Ouverte" : "Clôturée"}
                        </span>
                        {s.status === "closed" && (
                          <small
                            className={
                              s.closing_difference === 0 ? styles.goodText : styles.badText
                            }
                          >
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

          {/* ACCORDÉON : RÉCAPITULATIFS */}
          {recaps.length > 0 && (
            <section className={styles.accordionSection}>
              <div className={styles.sectionHeaderZara}>
                <h3>Contrôle et Récapitulatifs de Caisse</h3>
              </div>

              <div className={styles.recapList}>
                {recaps.map((recap) => {
                  const isExpanded = expandedRecapId === recap.session_id;
                  return (
                    <article key={recap.session_id} className={styles.recapItem}>
                      <button
                        type="button"
                        className={styles.recapHeaderBar}
                        onClick={() =>
                          setExpandedRecapId(isExpanded ? null : recap.session_id)
                        }
                      >
                        <div className={styles.recapMeta}>
                          <strong>
                            {recap.register} — {recap.seller}
                          </strong>
                          <small>
                            Session #{recap.session_id} · {dateTime(recap.opened_at)}
                          </small>
                        </div>

                        <div className={styles.recapRightNav}>
                          <span
                            className={
                              recap.closing_difference === 0
                                ? styles.goodText
                                : styles.badText
                            }
                          >
                            {recap.status === "closed"
                              ? money(recap.closing_difference ?? 0)
                              : "En cours"}
                          </span>
                          <ChevronDown
                            size={16}
                            className={`${styles.chevron} ${
                              isExpanded ? styles.chevronRotated : ""
                            }`}
                          />
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
                              <p>
                                {recap.actual_closing_amount == null
                                  ? "-"
                                  : money(recap.actual_closing_amount)}
                              </p>
                            </div>
                            <div>
                              <span>Écart</span>
                              <p
                                className={
                                  recap.closing_difference === 0
                                    ? styles.goodText
                                    : styles.badText
                                }
                              >
                                {recap.status === "closed"
                                  ? money(recap.closing_difference ?? 0)
                                  : "En cours"}
                              </p>
                            </div>
                          </div>

                          {recap.handoffs.length > 1 && (
                            <div className={styles.handoffBox}>
                              <label>Historique des Passations</label>
                              {recap.handoffs.map((h, idx) => (
                                <p key={idx}>
                                  {idx + 1}. {h.seller} à {dateTime(h.acknowledged_at)}
                                </p>
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
                              <p className={styles.emptyText}>
                                Aucune opération enregistrée.
                              </p>
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

          {/* MODAL : CRÉATION CAISSE */}
          {isRegisterModalOpen && (
            <div
              className={styles.modalOverlay}
              onClick={() => setIsRegisterModalOpen(false)}
            >
              <form
                className={styles.zaraModal}
                onSubmit={createRegister}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={styles.modalHeader}>
                  <div>
                    <span className={styles.modalEyebrow}>Administration</span>
                    <h3 id="register-modal-title">Nouvelle Caisse</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(false)}
                    aria-label="Fermer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className={styles.registerFormBody}>
                  <p className={styles.modalIntro}>
                    Créez une caisse pour qu&apos;elle soit disponible à l&apos;ouverture
                    d&apos;une session.
                  </p>
                  {registerError && (
                    <p className={styles.registerError} role="alert">
                      {registerError}
                    </p>
                  )}
                  <div className={styles.modalInputGroup}>
                    <label htmlFor="registerName">Nom de la caisse</label>
                    <input
                      id="registerName"
                      required
                      minLength={2}
                      maxLength={100}
                      autoFocus
                      value={registerName}
                      onChange={(event) => setRegisterName(event.target.value)}
                      placeholder="Caisse principale"
                    />
                  </div>
                  <div className={styles.modalInputGroup}>
                    <label htmlFor="registerCode">Code interne</label>
                    <input
                      id="registerCode"
                      required
                      minLength={1}
                      maxLength={50}
                      value={registerCode}
                      onChange={(event) => setRegisterCode(event.target.value)}
                      placeholder="CAISSE-01"
                    />
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.outlineButton}
                    onClick={() => setIsRegisterModalOpen(false)}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className={styles.zaraButton}
                    disabled={isCreatingRegister}
                  >
                    {isCreatingRegister ? "Création…" : "Créer la Caisse"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MODAL : CLÔTURE CAISSE */}
          {isCloseModalOpen && openSession && (
            <div
              className={styles.modalOverlay}
              onClick={() => setIsCloseModalOpen(false)}
            >
              <div
                className={styles.closeModal}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="close-modal-title"
              >
                <div className={styles.modalHeader}>
                  <div>
                    <span className={styles.modalEyebrow}>Clôture de Caisse</span>
                    <h3 id="close-modal-title">
                      Fermeture de la Caisse #{openSession.register_id}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCloseModalOpen(false)}
                    aria-label="Fermer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className={styles.modalBody}>
                  {/* EN-TÊTE : RÉSUMÉ COMMANDES */}
                  <div className={styles.daySummary}>
                    <div className={styles.daySummaryLabel}>Résumé de la journée</div>
                    <div className={styles.daySummaryValue}>
                      0 commande · {money(totalPayments)}
                    </div>
                  </div>

                  {/* GROUPES PAR MOYEN DE PAIEMENT */}
                  <div className={styles.paymentGroupsWrapper}>
                    {/* ESPÈCES */}
                    <div className={styles.paymentMethodGroup}>
                      <div className={styles.paymentMethodHeader}>
                        <h4>Espèces</h4>
                        <span className={styles.paymentMethodAmount}>
                          {money(balance?.payment_totals?.cash ?? 0)}
                        </span>
                      </div>
                      <div className={styles.paymentMethodDetails}>
                        <div className={styles.detailRow}>
                          <span>Ouverture</span>
                          <strong>{money(openSession.actual_opening_amount)}</strong>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Cash entrant/sortant</span>
                          <strong>
                            {balance?.cash_in !== 0 || balance?.cash_out !== 0 ? (
                              money((balance?.cash_in ?? 0) - (balance?.cash_out ?? 0))
                            ) : (
                              <span className={styles.cashFlowInline}>
                                + {money(balance?.cash_in ?? 0)} / - {money(balance?.cash_out ?? 0)}
                              </span>
                            )}
                          </strong>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Compté</span>
                          <strong>{money(balance?.payment_totals?.cash ?? 0)}</strong>
                        </div>
                        <div className={`${styles.detailRow} ${styles.differenceRow}`}>
                          <span>Différence</span>
                          <strong
                            className={
                              (balance?.payment_totals?.cash ?? 0) === expectedCash
                                ? styles.goodText
                                : styles.badText
                            }
                          >
                            {money((balance?.payment_totals?.cash ?? 0) - expectedCash)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* CARTE */}
                    <div className={styles.paymentMethodGroup}>
                      <div className={styles.paymentMethodHeader}>
                        <h4>Carte</h4>
                        <span className={styles.paymentMethodAmount}>
                          {money(balance?.payment_totals?.card ?? 0)}
                        </span>
                      </div>
                      <div className={styles.paymentMethodDetails}>
                        <div className={styles.detailRow}>
                          <span>Compté</span>
                          <strong>{money(balance?.payment_totals?.card ?? 0)}</strong>
                        </div>
                        <div className={`${styles.detailRow} ${styles.differenceRow}`}>
                          <span>Différence</span>
                          <strong className={styles.goodText}>0 FCFA</strong>
                        </div>
                      </div>
                    </div>

                    {/* AUTRES MOYENS */}
                    {["wave", "orange_money", "mobile_money", "other"].map((key) => {
                      const amount = balance?.payment_totals?.[key] ?? 0;
                      if (amount === 0) return null;
                      return (
                        <div key={key} className={styles.paymentMethodGroup}>
                          <div className={styles.paymentMethodHeader}>
                            <h4>{paymentMethodLabel(key)}</h4>
                            <span className={styles.paymentMethodAmount}>
                              {money(amount)}
                            </span>
                          </div>
                          <div className={styles.paymentMethodDetails}>
                            <div className={styles.detailRow}>
                              <span>Compté</span>
                              <strong>{money(amount)}</strong>
                            </div>
                            <div className={`${styles.detailRow} ${styles.differenceRow}`}>
                              <span>Différence</span>
                              <strong className={styles.goodText}>0 FCFA</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* COMPTE CLIENT */}
                    <div className={styles.paymentMethodGroup}>
                      <div className={styles.paymentMethodHeader}>
                        <h4>Compte Client</h4>
                        <span className={styles.paymentMethodAmount}>0 FCFA</span>
                      </div>
                      <div className={styles.paymentMethodDetails}>
                        <div className={styles.detailRow}>
                          <span>Compté</span>
                          <strong>0 FCFA</strong>
                        </div>
                        <div className={`${styles.detailRow} ${styles.differenceRow}`}>
                          <span>Différence</span>
                          <strong className={styles.goodText}>0 FCFA</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION COMPTAGE */}
                  <div className={styles.countingBox}>
                    <label className={styles.countingLabel}>
                      Comptage de Caisse (Espèces)
                    </label>
                    <input
                      type="number"
                      min="0"
                      autoFocus
                      value={closeAmount}
                      onChange={(e) => setCloseAmount(e.target.value)}
                      placeholder="0"
                      className={styles.countingInput}
                    />
                    {closeAmount && (
                      <div className={styles.countingDetails}>
                        <div className={styles.countingLine}>
                          <span className={styles.countingLineLabel}>
                            Solde théorique
                          </span>
                          <strong className={styles.countingLineValue}>
                            {money(expectedCash)}
                          </strong>
                        </div>
                        <div className={styles.countingLine}>
                          <span className={styles.countingLineLabel}>Écart</span>
                          <strong
                            className={`${styles.countingLineValue} ${
                              closingDifference === 0
                                ? styles.goodText
                                : closingDifference > 0
                                ? styles.warningText
                                : styles.badText
                            }`}
                          >
                            {money(closingDifference)}
                          </strong>
                        </div>
                        {closingDifference !== 0 && (
                          <div className={styles.countingHint}>
                            {closingDifference > 0 ? "✓ Excédent" : "⚠ Manque"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* NOTE DE CLÔTURE */}
                  <div className={styles.closingNote}>
                    <label className={styles.closingNoteLabel} htmlFor="closeNote">
                      Note de Clôture
                    </label>
                    <textarea
                      id="closeNote"
                      placeholder="Ajouter une note de fermeture…"
                      value={closeNote}
                      onChange={(e) => setCloseNote(e.target.value)}
                      className={styles.closingNoteInput}
                    />
                  </div>

                  {/* CHECKLIST */}
                  <div className={styles.checklist}>
                    <strong className={styles.checklistTitle}>
                      Vérifications complétées
                    </strong>
                    <div className={styles.checklistItems}>
                      <div>Tous les paiements enregistrés</div>
                      <div>Tous les mouvements de cash notés</div>
                      <div>Comptage physique exact</div>
                    </div>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className={styles.closeActions}>
                  <button
                    type="button"
                    className={styles.outlineButton}
                    onClick={() => setIsCloseModalOpen(false)}
                  >
                    Ignorer
                  </button>
                  <button type="button" className={styles.outlineButton}>
                    Cash In/Out
                  </button>
                  <button
                    type="button"
                    className={styles.zaraButton}
                    onClick={confirmClose}
                    disabled={isClosing || !closeAmount}
                  >
                    {isClosing ? "…" : "Fermer"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}