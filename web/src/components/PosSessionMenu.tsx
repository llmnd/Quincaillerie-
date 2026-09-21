"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, LockKeyhole, LogOut, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import CashClosingModal from "./CashClosingModal";
import { authHeaders, getStoredUser, type AuthUser } from "../lib/auth";
import styles from "../app/sales/page.module.css";

type ClosingSession = { id: number; register_id: number; actual_opening_amount: number; status: string };
type ClosingBalance = { expected_cash_amount: number; payment_totals?: Record<string, number> };

export default function PosSessionMenu({ inline = false }: Readonly<{ inline?: boolean }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [closingSession, setClosingSession] = useState<ClosingSession | null>(null);
  const [closingBalance, setClosingBalance] = useState<ClosingBalance | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    const lockPos = () => setIsLocked(true);
    const handleBackAttempt = () => {
      window.history.pushState({ posGuard: true }, "", window.location.href);
      lockPos();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") lockPos();
    };

    window.history.pushState({ posGuard: true }, "", window.location.href);
    window.addEventListener("popstate", handleBackAttempt);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("popstate", handleBackAttempt);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  async function openClosingModal() {
    setIsOpen(false);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const response = await fetch(`${apiUrl}/api/v1/cash/sessions`, {
      headers: authHeaders(),
      credentials: "include",
    });
    if (!response.ok) return;
    const sessions = (await response.json()) as ClosingSession[];
    const session = sessions.find((item) => item.status === "open");
    if (!session) return;
    const balanceResponse = await fetch(`${apiUrl}/api/v1/cash/sessions/${session.id}/balance`, {
      headers: authHeaders(),
      credentials: "include",
    });
    setClosingSession(session);
    setClosingBalance(balanceResponse.ok ? await balanceResponse.json() : null);
  }

  function goToBackend() {
    window.sessionStorage.setItem("quincaillerie_pos_return_path", pathname);
    window.sessionStorage.removeItem("quincaillerie_pos_open");
    window.sessionStorage.removeItem("quincaillerie_checkout_view");
    setIsOpen(false);
    router.push("/workspace");
  }

  return (
    <>
      {isLocked && (
        <dialog open className={styles.posLockScreen} aria-labelledby="pos-lock-title">
          <div className={styles.posLockCard}>
            <LockKeyhole size={42} strokeWidth={1.6} aria-hidden="true" />
            <h1 id="pos-lock-title">Caisse verrouillée</h1>
            <p>La session POS est en pause.</p>
            <button type="button" onClick={() => setIsLocked(false)}>
              Déverrouiller la caisse
            </button>
            <button
              type="button"
              className={styles.posLockBackendButton}
              onClick={goToBackend}
            >
              Backend
            </button>
          </div>
        </dialog>
      )}
      <div className={`${styles.posMenuWrap} ${inline ? styles.posMenuInline : ""}`}>
        <button
          type="button"
          className={styles.posMenuButton}
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          POS <ChevronDown size={14} />
        </button>
        {isOpen && (
          <div className={styles.posMenuDropdown} role="menu">
            <div className={styles.posMenuUser}>
              <span className={styles.posMenuUserAvatar}>
                {(user?.full_name ?? user?.email ?? "U").trim().charAt(0).toUpperCase()}
              </span>
              <span>
                <strong>{user?.full_name ?? "Utilisateur"}</strong>
                <small>{user?.email ?? ""}</small>
              </span>
            </div>
            <button type="button" role="menuitem" onClick={() => setIsOpen(false)}>
              <Check size={15} /> Continuer la vente
            </button>
            <button type="button" role="menuitem" onClick={goToBackend}>
              <LogOut size={15} /> Backend
            </button>
            <button
              type="button"
              role="menuitem"
              className={styles.posMenuDanger}
              onClick={() => {
                void openClosingModal();
              }}
            >
              <X size={15} /> Fermer la caisse
            </button>
          </div>
        )}
      {closingSession && (
        <CashClosingModal
          session={closingSession}
          balance={closingBalance}
          onDismiss={() => setClosingSession(null)}
          onClosed={() => router.replace("/workspace")}
        />
      )}
      </div>
    </>
  );
}
