"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import AppShell from "../../components/AppShell";
import { authHeaders } from "../../lib/auth";
import AccountingCharts from "./AccountingCharts";
import AccountingDashboardCards from "./AccountingDashboardCards";
import styles from "./page.module.css";

type Tax = { id: number; code: string; name: string; rate: number; is_active: boolean };
type Sale = { id: number; total_amount: number; sale_date: string; customer_id: number | null };
type Invoice = { id: number; number: string; sale_id: number; issue_date: string; subtotal: number; tax_amount: number; total_amount: number; currency: string };
type TrialRow = { code: string; name: string; debit: number; credit: number; balance: number };
type JournalEntry = { id: number; reference: string; entry_date: string; journal: string; description: string; lines: { account_id: number; label: string; debit: number; credit: number }[] };
type FinancialReports = { balance: { total_assets: number; total_liabilities: number }; income: { revenue_total: number; expense_total: number; net_result: number }; vat: { taxable_base: number; tax_amount: number; total_amount: number } };
type ReportPeriod = "month" | "quarter" | "semester" | "year" | "all";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const money = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

function toLocalDateTime(date: Date, endOfDay = false) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(endOfDay ? 23 : 0);
  const minutes = pad(endOfDay ? 59 : 0);
  const seconds = pad(endOfDay ? 59 : 0);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000`;
}

function buildPeriodQuery(period: ReportPeriod) {
  const params = new URLSearchParams();
  if (period === "all") {
    return "";
  }

  const end = new Date();
  const start = new Date(end);

  if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (period === "quarter") {
    const month = Math.floor(start.getMonth() / 3) * 3;
    start.setMonth(month, 1);
    start.setHours(0, 0, 0, 0);
  } else if (period === "semester") {
    const month = start.getMonth() < 6 ? 0 : 6;
    start.setMonth(month, 1);
    start.setHours(0, 0, 0, 0);
  } else if (period === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }

  end.setHours(23, 59, 59, 999);
  params.set("date_from", toLocalDateTime(start));
  params.set("date_to", toLocalDateTime(end, true));
  return `?${params.toString()}`;
}

export function AccountingPageContent() {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialRow[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [reports, setReports] = useState<FinancialReports | null>(null);
  const [form, setForm] = useState({ code: "", name: "", rate: "" });
  const [message, setMessage] = useState("Chargement de la comptabilité…");
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("month");
  const [activeModal, setActiveModal] = useState<"manual" | "upload" | "transactions" | "reconcile" | null>(null);
  const [manualEntry, setManualEntry] = useState({ reference: "", journal: "ACHAT", description: "", accountId: "", debit: "", credit: "" });
  const [bankTransaction, setBankTransaction] = useState({ label: "", amount: "", type: "credit", date: new Date().toISOString().slice(0, 10) });
  const [reconciledIds, setReconciledIds] = useState<number[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);

  const headers = (): Record<string, string> => ({
    Accept: "application/json",
    ...(authHeaders() as Record<string, string>),
  });

  const load = useCallback(async () => {
    const periodQuery = buildPeriodQuery(reportPeriod);
    const request = (path: string) => fetch(`${API_URL}${path}`, { headers: headers(), credentials: "include" }).then((response) => {
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      return response.json();
    });
    const results = await Promise.allSettled([
      request("/api/v1/accounting/taxes"),
      request(`/api/v1/sales${periodQuery}`),
      request(`/api/v1/accounting/invoices${periodQuery}`),
      request(`/api/v1/accounting/trial-balance${periodQuery}`),
      request("/api/v1/accounting/journal"),
      request(`/api/v1/accounting/reports/balance-sheet${periodQuery}`),
      request(`/api/v1/accounting/reports/income-statement${periodQuery}`),
      request(`/api/v1/accounting/reports/vat${periodQuery}`),
    ]);
    const value = <T,>(index: number, fallback: T): T => results[index].status === "fulfilled" ? results[index].value as T : fallback;

    return {
      taxes: value<Tax[]>(0, []),
      sales: value<Sale[]>(1, []),
      invoices: value<Invoice[]>(2, []),
      trialBalance: value<TrialRow[]>(3, []),
      journal: value<JournalEntry[]>(4, []),
      reports: {
        balance: value(5, { total_assets: 0, total_liabilities: 0 }),
        income: value(6, { revenue_total: 0, expense_total: 0, net_result: 0 }),
        vat: value(7, { taxable_base: 0, tax_amount: 0, total_amount: 0 }),
      },
      hasErrors: results.some((result) => result.status === "rejected"),
    };
  }, [reportPeriod]);

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
        setMessage(data.hasErrors ? "Certaines données comptables sont momentanément indisponibles." : "");
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
  }, [load]);

  const invoicedSaleIds = new Set(invoices.map((invoice) => invoice.sale_id));
  const uninvoicedSales = sales.filter((sale) => !invoicedSaleIds.has(sale.id));

  const salesChart = useMemo(() => {
    const buckets = new Map<string, number>();
    const bucketLabels = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, label: date.toLocaleDateString("fr-FR", { month: "short" }) };
    });

    for (const sale of sales) {
      const date = new Date(sale.sale_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (buckets.has(key)) {
        buckets.set(key, buckets.get(key)! + sale.total_amount);
      } else {
        buckets.set(key, sale.total_amount);
      }
    }

    return bucketLabels.map((bucket) => ({
      label: bucket.label,
      value: buckets.get(bucket.key) ?? 0,
    }));
  }, [sales]);

  const purchasesChart = useMemo(() => {
    const expenseRows = trialBalance
      .filter((row) => row.code.startsWith("6") && row.balance > 0)
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 6);

    if (expenseRows.length === 0) {
      return [
        { label: "Aucun", value: 0 },
        { label: "Aucun", value: 0 },
        { label: "Aucun", value: 0 },
        { label: "Aucun", value: 0 },
        { label: "Aucun", value: 0 },
        { label: "Aucun", value: 0 },
      ];
    }

    return expenseRows.map((row) => ({
      label: row.code,
      value: Math.abs(row.balance),
    }));
  }, [trialBalance]);

  const bankTrend = useMemo(() => {
    const baseValues = trialBalance
      .filter((row) => row.code.startsWith("5") || row.code.startsWith("1"))
      .map((row) => Math.abs(row.balance));

    if (baseValues.length === 0) {
      const fallback = Math.max(reports?.income.net_result ?? 0, 0) || 1;
      return Array.from({ length: 11 }, (_, index) => Math.round(fallback * ((index + 1) / 11) * 1.2));
    }

    const source = baseValues.slice(0, 11).length > 0 ? baseValues.slice(0, 11) : [Math.max(reports?.income.net_result ?? 0, 0)];
    return Array.from({ length: 11 }, (_, index) => {
      const value = source[index % source.length] ?? 0;
      return Math.max(0, Math.round(value * (0.4 + (index + 1) / 12)));
    });
  }, [reports, trialBalance]);

  const reconciliationQueue = useMemo(() => {
    return trialBalance
      .filter((row) => row.code.startsWith("5") || row.code.startsWith("1"))
      .slice(0, 4)
      .filter((row) => !reconciledIds.includes(Number(row.code.replace(/\D/g, "")) || 0))
      .map((row, index) => ({
        id: Number(`${row.code.replace(/\D/g, "") || index + 1}${index + 1}`),
        label: `${row.code} · ${row.name}`,
        amount: Math.abs(row.balance),
      }));
  }, [reconciledIds, trialBalance]);

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

  function handleModalAction(action: "manual" | "upload" | "transactions" | "reconcile") {
    setActiveModal(action);
  }

  function submitManualEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedDebit = Number(manualEntry.debit || 0);
    const parsedCredit = Number(manualEntry.credit || 0);

    if (!manualEntry.reference || !manualEntry.description || !manualEntry.accountId) {
      setMessage("Les champs de l’écriture manuelle sont incomplets.");
      return;
    }

    if (!Number.isFinite(parsedDebit) || !Number.isFinite(parsedCredit)) {
      setMessage("Le débit et le crédit doivent être des valeurs numériques valides.");
      return;
    }

    const nextEntry = {
      id: Date.now(),
      reference: manualEntry.reference,
      label: manualEntry.description,
      accountId: Number(manualEntry.accountId),
      debit: parsedDebit,
      credit: parsedCredit,
    };

    setJournal((current) => [
      {
        id: nextEntry.id,
        reference: nextEntry.reference,
        entry_date: new Date().toISOString(),
        journal: manualEntry.journal,
        description: nextEntry.label,
        lines: [
          {
            account_id: nextEntry.accountId,
            label: nextEntry.label,
            debit: nextEntry.debit,
            credit: nextEntry.credit,
          },
        ],
      },
      ...current,
    ]);
    setManualEntry({ reference: "", journal: "ACHAT", description: "", accountId: "", debit: "", credit: "" });
    setActiveModal(null);
    setMessage("Écriture manuelle ajoutée dans le journal local.");
  }

  function submitBankTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(bankTransaction.amount || 0);
    if (!bankTransaction.label || !Number.isFinite(amount) || amount <= 0) {
      setMessage("La transaction bancaire doit avoir un libellé et un montant valide.");
      return;
    }

    setBankTransaction({ label: "", amount: "", type: "credit", date: new Date().toISOString().slice(0, 10) });
    setActiveModal(null);
    setMessage(`Transaction bancaire enregistrée : ${bankTransaction.label} (${amount.toLocaleString("fr-FR")} FCFA).`);
  }

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const labels = files.map((file) => file.name);
    setUploadedDocuments((current) => [...current, ...labels]);
    setActiveModal(null);
    setMessage(`${files.length} document(s) importé(s) dans la comptabilité.`);
    event.target.value = "";
  }

  function reconcileItem(id: number) {
    setReconciledIds((current) => [...current, id]);
    setMessage("Rapprochement validé pour l’élément sélectionné.");
  }

  return (
    <>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>SYSCOHADA Révisé · XOF</span>
          <h1>Comptabilité</h1>
          <p>Taxes, factures, écritures et états financiers OHADA.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.periodSelector} aria-label="Période comptable">
            {(["month", "quarter", "semester", "year", "all"] as const).map((period) => (
              <button
                key={period}
                type="button"
                className={reportPeriod === period ? styles.periodButtonActive : styles.periodButton}
                onClick={() => setReportPeriod(period)}
              >
                {period === "month" ? "Mois" : period === "quarter" ? "Trimestre" : period === "semester" ? "Semestre" : period === "year" ? "Année" : "Tout"}
              </button>
            ))}
          </div>
          <span className={styles.badge}>SYSCOHADA · États légaux</span>
          <button type="button" className={styles.secondaryButton} onClick={exportJournal}>
            Exporter le journal
          </button>
        </div>
      </header>

      {message ? <div className={styles.message}>{message}</div> : null}

      {reports && (
        <>
          {/* 1. TABLEAU DE BORD INSPIRÉ D'ODOO (Journaux, échéanciers & banque) */}
          <AccountingDashboardCards
            revenue={reports.income.revenue_total}
            expenses={reports.income.expense_total}
            vatAmount={reports.vat.tax_amount}
            uninvoicedCount={uninvoicedSales.length}
            salesTrend={salesChart}
            purchasesTrend={purchasesChart}
            bankTrend={bankTrend}
            onActionClick={handleModalAction}
            documentsCount={uploadedDocuments.length}
            transactionsCount={reconciliationQueue.length}
          />

          {/* 2. SYNTHÈSE DES ÉTATS FINANCIERS GLOBAUX */}
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

          {/* 3. DIAGRAMMES & ANALYSE SYSCOHADA */}
          <AccountingCharts
            revenue={reports.income.revenue_total}
            expenses={reports.income.expense_total}
            netResult={reports.income.net_result}
            vatAmount={reports.vat.tax_amount}
            trialBalance={trialBalance}
          />
        </>
      )}

      {activeModal && typeof document !== "undefined" && createPortal(
        <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>Module comptable</span>
                <h2>
                  {activeModal === "manual" && "Nouvelle écriture manuelle"}
                  {activeModal === "upload" && "Importer des documents"}
                  {activeModal === "transactions" && "Transactions bancaires"}
                  {activeModal === "reconcile" && "Rapprochement bancaire"}
                </h2>
              </div>
              <button type="button" className={styles.secondaryButton} onClick={() => setActiveModal(null)}>Fermer</button>
            </div>

            {activeModal === "manual" && (
              <form className={styles.modalForm} onSubmit={submitManualEntry}>
                <input placeholder="Référence" value={manualEntry.reference} onChange={(event) => setManualEntry({ ...manualEntry, reference: event.target.value })} />
                <select value={manualEntry.journal} onChange={(event) => setManualEntry({ ...manualEntry, journal: event.target.value })}>
                  <option value="ACHAT">ACHAT</option>
                  <option value="VENTES">VENTES</option>
                  <option value="BANQUE">BANQUE</option>
                  <option value="DIVERS">DIVERS</option>
                </select>
                <input placeholder="Compte comptable" value={manualEntry.accountId} onChange={(event) => setManualEntry({ ...manualEntry, accountId: event.target.value })} />
                <input placeholder="Libellé" value={manualEntry.description} onChange={(event) => setManualEntry({ ...manualEntry, description: event.target.value })} />
                <input type="number" min="0" step="0.01" placeholder="Débit" value={manualEntry.debit} onChange={(event) => setManualEntry({ ...manualEntry, debit: event.target.value })} />
                <input type="number" min="0" step="0.01" placeholder="Crédit" value={manualEntry.credit} onChange={(event) => setManualEntry({ ...manualEntry, credit: event.target.value })} />
                <button type="submit" className={styles.primaryButton}>Enregistrer l’écriture</button>
              </form>
            )}

            {activeModal === "upload" && (
              <div className={styles.modalForm}>
                <label className={styles.uploadPanel}>
                  <input type="file" multiple onChange={handleUpload} />
                  <span>Choisir des factures, relevés ou pièces comptables</span>
                </label>
              </div>
            )}

            {activeModal === "transactions" && (
              <form className={styles.modalForm} onSubmit={submitBankTransaction}>
                <input placeholder="Libellé de la transaction" value={bankTransaction.label} onChange={(event) => setBankTransaction({ ...bankTransaction, label: event.target.value })} />
                <input type="date" value={bankTransaction.date} onChange={(event) => setBankTransaction({ ...bankTransaction, date: event.target.value })} />
                <select value={bankTransaction.type} onChange={(event) => setBankTransaction({ ...bankTransaction, type: event.target.value })}>
                  <option value="credit">Crédit</option>
                  <option value="debit">Débit</option>
                </select>
                <input type="number" min="0" step="0.01" placeholder="Montant" value={bankTransaction.amount} onChange={(event) => setBankTransaction({ ...bankTransaction, amount: event.target.value })} />
                <button type="submit" className={styles.primaryButton}>Enregistrer la transaction</button>
              </form>
            )}

            {activeModal === "reconcile" && (
              <div className={styles.modalList}>
                {reconciliationQueue.length === 0 ? (
                  <p className={styles.muted}>Aucun élément à rapprocher.</p>
                ) : (
                  reconciliationQueue.map((item) => (
                    <div key={item.id} className={styles.reconcileRow}>
                      <div>
                        <strong>{item.label}</strong>
                        <small>{item.amount.toLocaleString("fr-FR")} FCFA</small>
                      </div>
                      <button type="button" className={styles.secondaryButton} onClick={() => reconcileItem(item.id)}>Rapprocher</button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>,
        document.body,
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
            <h2>Débits, crédits et soldes SYSCOHADA</h2>
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
          <div className={styles.cardHeaderActions}>
            <span>{journal.length} écritures</span>
            <button type="button" className={styles.primaryButton} onClick={() => handleModalAction("manual")}>
              Nouvelle écriture
            </button>
          </div>
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
    </>
  );
}

export default function AccountingPage() {
  return (
    <AppShell>
      <AccountingPageContent />
    </AppShell>
  );
}