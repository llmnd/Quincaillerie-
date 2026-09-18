"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import styles from "./page.module.css";

type Tax = { id: number; code: string; name: string; rate: number; is_active: boolean };
type Sale = { id: number; total_amount: number; sale_date: string; customer_id: number | null };
type Invoice = { id: number; number: string; sale_id: number; issue_date: string; subtotal: number; tax_amount: number; total_amount: number; currency: string };
type TrialRow = { code: string; name: string; debit: number; credit: number; balance: number };
type JournalEntry = { id: number; reference: string; entry_date: string; journal: string; description: string; lines: { account_id: number; label: string; debit: number; credit: number }[] };
type FinancialReports = { balance: { total_assets: number; total_liabilities: number }; income: { revenue_total: number; expense_total: number; net_result: number }; vat: { taxable_base: number; tax_amount: number; total_amount: number } };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const money = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

export default function AccountingPage() {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialRow[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [reports, setReports] = useState<FinancialReports | null>(null);
  const [form, setForm] = useState({ code: "", name: "", rate: "" });
  const [message, setMessage] = useState("Chargement de la comptabilité…");

  const headers = (): Record<string, string> => {
    return {};
  };

  async function load() {
    const [taxResponse, saleResponse, invoiceResponse, trialResponse, journalResponse, balanceResponse, incomeResponse, vatResponse] = await Promise.all([
      fetch(`${API_URL}/api/v1/accounting/taxes`, { headers: headers(), credentials: "include" }),
      fetch(`${API_URL}/api/v1/sales`, { headers: headers(), credentials: "include" }),
      fetch(`${API_URL}/api/v1/accounting/invoices`, { headers: headers(), credentials: "include" }),
      fetch(`${API_URL}/api/v1/accounting/trial-balance`, { headers: headers(), credentials: "include" }),
      fetch(`${API_URL}/api/v1/accounting/journal`, { headers: headers(), credentials: "include" }),
      fetch(`${API_URL}/api/v1/accounting/reports/balance-sheet`, { headers: headers(), credentials: "include" }),
      fetch(`${API_URL}/api/v1/accounting/reports/income-statement`, { headers: headers(), credentials: "include" }),
      fetch(`${API_URL}/api/v1/accounting/reports/vat`, { headers: headers(), credentials: "include" }),
    ]);

    if (!taxResponse.ok || !saleResponse.ok || !invoiceResponse.ok || !trialResponse.ok || !journalResponse.ok || !balanceResponse.ok || !incomeResponse.ok || !vatResponse.ok) {
      throw new Error();
    }

    const [nextTaxes, nextSales, nextInvoices, nextTrialBalance, nextJournal, nextBalance, nextIncome, nextVat] = await Promise.all([
      taxResponse.json() as Promise<Tax[]>,
      saleResponse.json() as Promise<Sale[]>,
      invoiceResponse.json() as Promise<Invoice[]>,
      trialResponse.json() as Promise<TrialRow[]>,
      journalResponse.json() as Promise<JournalEntry[]>,
      balanceResponse.json() as Promise<{ total_assets: number; total_liabilities: number }>,
      incomeResponse.json() as Promise<{ revenue_total: number; expense_total: number; net_result: number }>,
      vatResponse.json() as Promise<{ taxable_base: number; tax_amount: number; total_amount: number }>,
    ]);

    return {
      taxes: nextTaxes,
      sales: nextSales,
      invoices: nextInvoices,
      trialBalance: nextTrialBalance,
      journal: nextJournal,
      reports: {
        balance: nextBalance,
        income: nextIncome,
        vat: nextVat,
      },
    };
  }

  useEffect(() => {
    let isMounted = true;

    const initializeAccounting = async () => {
      try {
        const data = await load();
        if (!isMounted) return;
        setTaxes(data.taxes);
        setSales(data.sales);
        setInvoices(data.invoices);
        setTrialBalance(data.trialBalance);
        setJournal(data.journal);
        setReports(data.reports);
        setMessage("");
      } catch {
        if (isMounted) {
          setMessage("La comptabilité n'est pas disponible pour le moment.");
        }
      }
    };

    void initializeAccounting();

    return () => {
      isMounted = false;
    };
  }, []);

  const invoicedSaleIds = new Set(invoices.map((invoice) => invoice.sale_id));
  const uninvoicedSales = sales.filter((sale) => !invoicedSaleIds.has(sale.id));

  async function createTax(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`${API_URL}/api/v1/accounting/taxes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers() },
      credentials: "include",
      body: JSON.stringify({ ...form, rate: Number(form.rate) }),
    });

    if (!response.ok) {
      setMessage("Cette taxe ne peut pas être créée. Vérifiez son code.");
      return;
    }

    setForm({ code: "", name: "", rate: "" });
    await load();
  }

  async function invoiceSale(saleId: number) {
    const taxId = taxes[0]?.id;
    const response = await fetch(`${API_URL}/api/v1/accounting/invoices/from-sale/${saleId}${taxId ? `?tax_id=${taxId}` : ""}`, {
      method: "POST",
      headers: headers(),
      credentials: "include",
    });

    if (!response.ok) {
      setMessage("La facture n'a pas pu être créée.");
      return;
    }
    await load();
  }

  async function exportJournal() {
    const response = await fetch(`${API_URL}/api/v1/accounting/exports/journal.csv`, { headers: headers(), credentials: "include" });
    if (!response.ok) {
      setMessage("L'export du journal est réservé aux administrateurs.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "journal-comptable.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Fiscalité Sénégal · XOF</span>
          <h1>Comptabilité</h1>
          <p>Taxes, factures, écritures et états financiers.</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.badge}>V3 · États légaux</span>
          <button type="button" className={styles.secondaryButton} onClick={exportJournal}>
            Exporter le journal
          </button>
        </div>
      </header>

      {message ? <div className={styles.message}>{message}</div> : null}

      {reports && (
        <section className={styles.reportGrid}>
          <article>
            <span>Actif du bilan</span>
            <strong>{money(reports.balance.total_assets)}</strong>
          </article>
          <article>
            <span>Chiffre d&apos;affaires</span>
            <strong>{money(reports.income.revenue_total)}</strong>
          </article>
          <article>
            <span>Résultat net</span>
            <strong className={reports.income.net_result >= 0 ? styles.good : styles.warning}>
              {money(reports.income.net_result)}
            </strong>
          </article>
          <article>
            <span>TVA collectée</span>
            <strong>{money(reports.vat.tax_amount)}</strong>
          </article>
        </section>
      )}

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.eyebrow}>Référentiel fiscal</span>
              <h2>Taxes actives</h2>
            </div>
            <span>{taxes.length}</span>
          </div>
          <div className={styles.taxList}>
            {taxes.map((tax) => (
              <div key={tax.id}>
                <strong>{tax.code}</strong>
                <span>{tax.name}</span>
                <b>{tax.rate}%</b>
              </div>
            ))}
          </div>
          <form className={styles.taxForm} onSubmit={createTax}>
            <input
              required
              placeholder="Code, ex. TVA18"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
            <input
              required
              placeholder="Nom de la taxe"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <input
              required
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="Taux %"
              value={form.rate}
              onChange={(event) => setForm({ ...form, rate: event.target.value })}
            />
            <button className={styles.primaryButton}>Ajouter la taxe</button>
          </form>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.eyebrow}>À facturer</span>
              <h2>Ventes sans facture</h2>
            </div>
            <span>{uninvoicedSales.length}</span>
          </div>
          <div className={styles.saleList}>
            {uninvoicedSales.slice(0, 8).map((sale) => (
              <div className={styles.saleRow} key={sale.id}>
                <div className={styles.saleMain}>
                  <strong>Vente #{sale.id}</strong>
                  <small>{new Date(sale.sale_date).toLocaleDateString("fr-FR")}</small>
                </div>
                <div className={styles.saleAction}>
                  <b>{money(sale.total_amount)}</b>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => invoiceSale(sale.id)}
                  >
                    Facturer
                  </button>
                </div>
              </div>
            ))}
          </div>
          {uninvoicedSales.length === 0 ? (
            <p className={styles.muted}>Toutes les ventes visibles sont facturées.</p>
          ) : null}
        </article>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <span className={styles.eyebrow}>Balance générale</span>
            <h2>Débits, crédits et soldes</h2>
          </div>
          <span>{trialBalance.length} comptes</span>
        </div>
        <div className={styles.invoiceList}>
          {trialBalance.map((row) => (
            <div className={styles.invoiceRow} key={row.code}>
              <strong>{row.code} · {row.name}</strong>
              <span>Débit {money(row.debit)}</span>
              <span>Crédit {money(row.credit)}</span>
              <b>Solde {money(row.balance)}</b>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <span className={styles.eyebrow}>Grand livre</span>
            <h2>Écritures comptables</h2>
          </div>
          <span>{journal.length} écritures</span>
        </div>
        <div className={styles.invoiceList}>
          {journal.map((entry) => (
            <div className={styles.journalRow} key={entry.id}>
              <div>
                <strong>{entry.reference}</strong>
                <small>{entry.description} · {new Date(entry.entry_date).toLocaleDateString("fr-FR")}</small>
              </div>
              <span>{entry.lines.length} lignes équilibrées</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <span className={styles.eyebrow}>Journal fiscal</span>
            <h2>Factures émises</h2>
          </div>
          <span>{invoices.length}</span>
        </div>
        <div className={styles.invoiceList}>
          {invoices.map((invoice) => (
            <div className={styles.invoiceRow} key={invoice.id}>
              <strong>{invoice.number}</strong>
              <span>Vente #{invoice.sale_id}</span>
              <span>HT {money(invoice.subtotal)}</span>
              <span>TVA {money(invoice.tax_amount)}</span>
              <b>TTC {money(invoice.total_amount)}</b>
              <small>{new Date(invoice.issue_date).toLocaleDateString("fr-FR")}</small>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}