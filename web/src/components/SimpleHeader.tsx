"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearStoredAuth, getStoredUser } from "../lib/auth";
import styles from "./SimpleHeader.module.css";

export default function SimpleHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(Boolean(getStoredUser()));
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousHtmlPosition = document.documentElement.style.position;

    if (menuOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.documentElement.style.position = "fixed";
      document.body.style.width = "100%";
      document.documentElement.style.width = "100%";
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.position = previousBodyPosition;
      document.documentElement.style.position = previousHtmlPosition;
      document.body.style.width = "";
      document.documentElement.style.width = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="MIZAN ERP, accueil">
          <span className={styles.brandMark}>M</span>
          <span className={styles.brandText}>
            <small>Amanah · Ihsan · Baraka</small>
            <strong>MIZAN ERP</strong>
          </span>
        </Link>

        <div className={styles.actions}>
          {isConnected ? (
            <button
              type="button"
              className={styles.loginButton}
              onClick={() => {
                clearStoredAuth();
                setIsConnected(false);
                setMenuOpen(false);
              }}
            >
              Se déconnecter
            </button>
          ) : (
            <Link href="/login" className={styles.loginButton}>
              Se connecter
            </Link>
          )}

          <button
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={styles.menuIcon}>
              <span />
              <span />
            </span>
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className={styles.modalOverlay} aria-modal="true" role="dialog">
          <div className={styles.modalHeader}>
            <Link href="/" className={styles.modalBrand} aria-label="Accueil MIZAN ERP">
              <span className={styles.brandMark}>M</span>
              <span>MIZAN ERP</span>
            </Link>

            <button
              type="button"
              className={styles.closeButton}
              aria-label="Fermer le menu"
              onClick={() => setMenuOpen(false)}
            >
              ×
            </button>
          </div>

          <nav className={styles.modalNav} aria-label="Menu principal">
            <Link href="/" onClick={() => setMenuOpen(false)}>
              Accueil
            </Link>
            <a href="#solution" onClick={() => setMenuOpen(false)}>
              La solution
            </a>
            <a href="#fonctionnalites" onClick={() => setMenuOpen(false)}>
              Fonctionnalités
            </a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>
              Contact
            </a>
            <Link href="/legal/support" onClick={() => setMenuOpen(false)}>
              Support
            </Link>
          </nav>

          <div className={styles.modalFooter}>
            {isConnected ? (
              <button
                type="button"
                className={styles.modalLoginButton}
                onClick={() => {
                  clearStoredAuth();
                  setIsConnected(false);
                  setMenuOpen(false);
                }}
              >
                Se déconnecter
              </button>
            ) : (
              <Link href="/login" className={styles.modalLoginButton} onClick={() => setMenuOpen(false)}>
                Se connecter
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
