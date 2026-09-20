"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import { authHeaders } from "../../lib/auth";
import styles from "./page.module.css";

/* =========================================================================
   TYPES
   ========================================================================= */
type TabKey = "depenses" | "creances" | "fournisseurs" | "factures" | "pdf";

type Overview = {
  taxes: number;
  invoices: number;
  journal_entries: number;
};

type Invoice = {
  id: number;
  number: string;
  sale_id: number;
  customer_id?: number | null;
  tax_id?: number | null;
  status?: string;
  issue_date: string;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
};

type Supplier = {
  id: number;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  is_active: boolean;
};

type Expense = {
  id: number;
  date: string;
  description: string;
  amount_ht: number;
  amount_tva: number;
  amount_ttc: number;
  account_code: string;
  payment_method: "cash" | "bank" | "credit";
  register_id?: number | null;
  register_name?: string | null;
  supplier_id?: number | null;
  supplier_name?: string | null;
  created_by?: string | null;
  status?: "validated" | "pending";
  receipt_url?: string | null;
};

type Register = {
  id: number;
  name: string;
  code: string;
};

type TrialRow = {
  code: string;
  name: string;
  debit: number;
  credit: number;
  balance: number;
};

type OrganizationProfile = {
  id?: number;
  name: string;
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type SummaryCard = {
  label: string;
  value: string;
  delta: string;
  tone: "accent" | "warning" | "neutral" | "good";
};

type RowItem = {
  id?: number;
  label: string;
  meta: string;
  amount: string;
  status: string;
  statusTone: "paid" | "late" | "pending" | "neutral" | "warning";
};

type CreateTarget = "supplier" | "expense" | "invoice" | "receivable";

type PaymentMethod = "cash" | "bank" | "credit";

type ExpenseForm = {
  date: string;
  description: string;
  amount_ht: string;
  vat_rate: string;
  account_code: string;
  payment_method: PaymentMethod;
  register_id: string;
  supplier_id: string;
  receipt_url: string;
};

/* =========================================================================
   CONSTANTES
   ========================================================================= */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const tabs: { key: TabKey; label: string }[] = [
  { key: "depenses", label: "Dépenses" },
  { key: "creances", label: "Créances" },
  { key: "fournisseurs", label: "Fournisseurs" },
  { key: "factures", label: "Factures" },
  { key: "pdf", label: "Rapports PDF" },
];

const emptySupplierForm = {
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
};

const emptyExpenseForm: ExpenseForm = {
  date: new Date().toISOString().slice(0, 10),
  description: "",
  amount_ht: "",
  vat_rate: "18",
  account_code: "601",
  payment_method: "cash",
  register_id: "",
  supplier_id: "",
  receipt_url: "",
};

const emptyInvoiceForm = {
  sale_id: "",
  tax_id: "",
};

const money = (value: number) =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} FCFA`;

/* =========================================================================
   PAGE
   ========================================================================= */
export default function ERPPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("depenses");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialRow[]>([]);
  const [organization, setOrganization] = useState<OrganizationProfile>({
    name: "Ma société",
    logo: null,
  });
  const [loading, setLoading] = useState(true);
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "supplier" | "expense" | "invoice"; id: number; label: string } | null
  >(null);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm);

  /* États dédiés au formulaire de dépense */
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState("");
  const [supplierError, setSupplierError] = useState("");
  const [invoiceError, setInvoiceError] = useState("");

  /* ---------------------------------------------------------------------
     Chargement des données
  --------------------------------------------------------------------- */
  const refreshData = async () => {
    const headers = {
      Accept: "application/json",
      ...authHeaders(),
    } as Record<string, string>;

    const [
      overviewResponse,
      invoicesResponse,
      suppliersResponse,
      expensesResponse,
      registersResponse,
      trialBalanceResponse,
    ] = await Promise.all([
      fetch(`${API_URL}/api/v1/accounting`, { headers, credentials: "include" }),
      fetch(`${API_URL}/api/v1/accounting/invoices`, { headers, credentials: "include" }),
      fetch(`${API_URL}/api/v1/suppliers`, { headers, credentials: "include" }),
      fetch(`${API_URL}/api/v1/accounting/expenses`, { headers, credentials: "include" }),
      fetch(`${API_URL}/api/v1/cash/registers`, { headers, credentials: "include" }),
      fetch(`${API_URL}/api/v1/accounting/trial-balance`, { headers, credentials: "include" }),
    ]);

    if (
      !overviewResponse.ok ||
      !invoicesResponse.ok ||
      !suppliersResponse.ok ||
      !expensesResponse.ok ||
      !trialBalanceResponse.ok
    ) {
      throw new Error("Impossible de charger les données ERP");
    }

    const nextOverview = (await overviewResponse.json()) as Overview;
    const nextInvoices = (await invoicesResponse.json()) as Invoice[];
    const nextSuppliers = (await suppliersResponse.json()) as Supplier[];
    const nextExpenses = (await expensesResponse.json()) as Expense[];
    const nextRegisters = registersResponse.ok
      ? ((await registersResponse.json()) as Register[])
      : [];
    const nextTrialBalance = (await trialBalanceResponse.json()) as TrialRow[];

    setOverview(nextOverview);
    setInvoices(nextInvoices);
    setSuppliers(nextSuppliers);
    setExpenses(nextExpenses);
    setRegisters(nextRegisters);
    setTrialBalance(nextTrialBalance);
  };

  const refreshOrganizationProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/organization/profile`, {
        headers: { Accept: "application/json", ...authHeaders() },
        credentials: "include",
      });

      if (!response.ok) return;
      const profile = (await response.json()) as OrganizationProfile;
      if (profile.name?.trim()) {
        setOrganization(profile);
      }
    } catch {
      /* Erreur ignorée : l'ERP fonctionne sans branding */
    }
  };

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        await Promise.all([refreshData(), refreshOrganizationProfile()]);
      } catch {
        if (!isCancelled) {
          setOverview({ taxes: 0, invoices: 0, journal_entries: 0 });
          setInvoices([]);
          setSuppliers([]);
          setExpenses([]);
          setRegisters([]);
          setTrialBalance([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      isCancelled = true;
    };
  }, []);

  /* ---------------------------------------------------------------------
     Résumé par onglet
  --------------------------------------------------------------------- */
  const summary: Record<TabKey, SummaryCard[]> = useMemo(() => {
    const totalInvoices = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.total_amount || 0),
      0
    );

    const expenseTotal = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount_ttc || 0),
      0
    );
    const expenseTaxTotal = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount_tva || 0),
      0
    );

    const payableTotal = trialBalance
      .filter((row) => row.code.startsWith("4") || row.code.startsWith("1"))
      .reduce((sum, row) => sum + Math.abs(Number(row.balance || 0)), 0);

    const supplierDebt = suppliers.length > 0 ? Math.min(payableTotal, payableTotal) : 0;

    return {
      depenses: [
        {
          label: "Dépenses enregistrées",
          value: money(expenseTotal),
          delta: `${expenses.length} dépenses`,
          tone: "accent",
        },
        {
          label: "TVA & taxes",
          value: money(expenseTaxTotal),
          delta: `${expenses.length} lignes`,
          tone: "neutral",
        },
        {
          label: "Journal",
          value: String(overview?.journal_entries ?? 0),
          delta: "écritures",
          tone: "good",
        },
        {
          label: "Fournisseurs",
          value: String(suppliers.length),
          delta: "actifs",
          tone: "warning",
        },
      ],
      creances: [
        {
          label: "Montant facturé",
          value: money(totalInvoices),
          delta: `${invoices.length} factures`,
          tone: "accent",
        },
        {
          label: "À encaisser",
          value: money(Math.max(totalInvoices * 0.25, 0)),
          delta: "partiel",
          tone: "warning",
        },
        {
          label: "Récapitulatif",
          value: `${Math.max(Math.min(invoices.length, 12), 0)}`,
          delta: "dossiers",
          tone: "neutral",
        },
        {
          label: "Taux de collecte",
          value: `${
            invoices.length
              ? Math.min(
                  92,
                  Math.max(
                    60,
                    Math.round((totalInvoices / Math.max(totalInvoices + payableTotal, 1)) * 100)
                  )
                )
              : 0
          }%`,
          delta: "estimé",
          tone: "good",
        },
      ],
      fournisseurs: [
        {
          label: "Fournisseurs",
          value: String(suppliers.length),
          delta: "références",
          tone: "accent",
        },
        {
          label: "Dette fournisseur",
          value: money(supplierDebt),
          delta: "à suivre",
          tone: "warning",
        },
        {
          label: "Commandes",
          value: String(Math.max(invoices.length - 2, 0)),
          delta: "actives",
          tone: "neutral",
        },
        {
          label: "Suivi",
          value: `${suppliers.filter((supplier) => supplier.is_active).length}`,
          delta: "actifs",
          tone: "good",
        },
      ],
      factures: [
        {
          label: "Factures",
          value: String(invoices.length),
          delta: "enregistrées",
          tone: "accent",
        },
        {
          label: "Montant total",
          value: money(totalInvoices),
          delta: "hors TVA",
          tone: "neutral",
        },
        {
          label: "Moyenne",
          value: money(invoices.length ? totalInvoices / invoices.length : 0),
          delta: "par facture",
          tone: "good",
        },
        {
          label: "TVA",
          value: money(
            invoices.reduce((sum, invoice) => sum + Number(invoice.tax_amount || 0), 0)
          ),
          delta: "collectée",
          tone: "warning",
        },
      ],
      pdf: [
        {
          label: "Rapports",
          value: String(Math.max(overview?.invoices ?? 0, 1)),
          delta: "documents",
          tone: "accent",
        },
        {
          label: "Factures",
          value: String(invoices.length),
          delta: "prêtes",
          tone: "good",
        },
        {
          label: "Taxes",
          value: String(overview?.taxes ?? 0),
          delta: "paramétrées",
          tone: "neutral",
        },
        {
          label: "Journal",
          value: String(overview?.journal_entries ?? 0),
          delta: "entrées",
          tone: "warning",
        },
      ],
    };
  }, [expenses, invoices, overview, suppliers, trialBalance]);

  /* ---------------------------------------------------------------------
     Lignes par onglet
  --------------------------------------------------------------------- */
  const rowsByTab: Record<TabKey, RowItem[]> = useMemo(() => {
    const invoiceRows: RowItem[] = invoices.map((invoice) => ({
      id: invoice.id,
      label: invoice.number,
      meta: new Date(invoice.issue_date).toLocaleDateString("fr-FR"),
      amount: money(Number(invoice.total_amount || 0)),
      status: invoice.status ? invoice.status : "Validée",
      statusTone: "paid",
    }));

    const supplierRows: RowItem[] = suppliers.map((supplier) => ({
      label: supplier.name,
      meta: supplier.email ?? supplier.phone ?? "Contact fournisseur",
      amount: "Suivi",
      status: supplier.is_active ? "Actif" : "Inactif",
      statusTone: supplier.is_active ? "pending" : "neutral",
    }));

    const expenseRows: RowItem[] = expenses.map((expense) => ({
      id: expense.id,
      label: expense.description,
      meta: `${expense.account_code} · ${new Date(expense.date).toLocaleDateString("fr-FR")}`,
      amount: money(Number(expense.amount_ttc || 0)),
      status:
        expense.payment_method === "credit"
          ? "À crédit"
          : expense.payment_method === "bank"
            ? "Banque"
            : "Caisse",
      statusTone: expense.payment_method === "credit" ? "warning" : "paid",
    }));

    const emptyNeutral: RowItem = {
      label: "Aucune donnée",
      meta: "Aucune donnée disponible",
      amount: "0",
      status: "Vide",
      statusTone: "neutral",
    };

    return {
      depenses: expenseRows.length > 0 ? expenseRows : [emptyNeutral],
      creances:
        invoiceRows.length > 0
          ? invoiceRows
          : [{ ...emptyNeutral, label: "Aucune facture", amount: "0 FCFA" }],
      fournisseurs:
        supplierRows.length > 0
          ? supplierRows
          : [{ ...emptyNeutral, label: "Aucun fournisseur", amount: "0" }],
      factures:
        invoiceRows.length > 0
          ? invoiceRows
          : [{ ...emptyNeutral, label: "Aucune facture", amount: "0 FCFA" }],
      pdf: [
        {
          label: "Synthèse comptable",
          meta: "Tableau de bord",
          amount: "PDF",
          status: "Prêt",
          statusTone: "paid",
        },
        {
          label: "Bilan financier",
          meta: "Dernière période",
          amount: "PDF",
          status: "Prêt",
          statusTone: "paid",
        },
        {
          label: "TVA",
          meta: "Période courante",
          amount: "PDF",
          status: "À générer",
          statusTone: "pending",
        },
      ],
    } as Record<TabKey, RowItem[]>;
  }, [expenses, invoices, suppliers, trialBalance]);

  const currentSummary = summary[activeTab] ?? [];
  const currentRows = rowsByTab[activeTab] ?? [];

  /* ---------------------------------------------------------------------
     Actions générales
  --------------------------------------------------------------------- */
  const handleExportPdf = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const closeCreateModal = () => {
    setCreateTarget(null);
    setEditingSupplierId(null);
    setEditingExpenseId(null);
    setEditingInvoiceId(null);
    setSupplierForm(emptySupplierForm);
    setExpenseForm(emptyExpenseForm);
    setExpenseError("");
    setSupplierError("");
    setInvoiceError("");
    setIsSubmittingExpense(false);
    setInvoiceForm(emptyInvoiceForm);
  };

  const closeDeleteModal = () => setDeleteTarget(null);

  /* ---------------------------------------------------------------------
     Fournisseurs
  --------------------------------------------------------------------- */
  const submitSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      name: supplierForm.name.trim(),
      contact_name: supplierForm.contact_name.trim() || null,
      email: supplierForm.email.trim() || null,
      phone: supplierForm.phone.trim() || null,
      address: supplierForm.address.trim() || null,
    };

    try {
      const response = await fetch(
        editingSupplierId
          ? `${API_URL}/api/v1/suppliers/${editingSupplierId}`
          : `${API_URL}/api/v1/suppliers`,
        {
          method: editingSupplierId ? "PUT" : "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        setSupplierError(
          typeof payload?.detail === "string" ? payload.detail : "Impossible d'enregistrer le fournisseur."
        );
        return;
      }

      setSupplierError("");
      setSupplierForm(emptySupplierForm);
      setEditingSupplierId(null);
      setCreateTarget(null);
      await refreshData();
    } catch {
      setSupplierError("Erreur réseau. Vérifiez la connexion et réessayez.");
    }
  };

  const deleteSupplier = async (supplierId: number) => {
    const response = await fetch(`${API_URL}/api/v1/suppliers/${supplierId}`, {
      method: "DELETE",
      headers: { Accept: "application/json", ...authHeaders() },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Impossible de supprimer le fournisseur");
    }

    await refreshData();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.kind === "supplier") {
        await deleteSupplier(deleteTarget.id);
      } else if (deleteTarget.kind === "expense") {
        await deleteExpense(deleteTarget.id);
      } else {
        await deleteInvoice(deleteTarget.id);
      }
      setDeleteTarget(null);
    } catch {
      setDeleteTarget(null);
    }
  };

  const openSupplierEditor = (supplier: Supplier) => {
    setEditingSupplierId(supplier.id);
    setSupplierForm({
      name: supplier.name,
      contact_name: supplier.contact_name ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
    });
    setCreateTarget("supplier");
  };

  /* ---------------------------------------------------------------------
     DÉPENSE — création / modification
  --------------------------------------------------------------------- */
  const openExpenseEditor = (expense: Expense) => {
    const inferredVatRate =
      expense.amount_ht > 0
        ? Math.round((expense.amount_tva / expense.amount_ht) * 100)
        : 18;

    setEditingExpenseId(expense.id);
    setExpenseForm({
      date: expense.date ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      description: expense.description,
      amount_ht: String(expense.amount_ht ?? 0),
      vat_rate: String(inferredVatRate || 0),
      account_code: expense.account_code,
      payment_method: expense.payment_method ?? "cash",
      register_id: expense.register_id ? String(expense.register_id) : "",
      supplier_id: expense.supplier_id ? String(expense.supplier_id) : "",
      receipt_url: expense.receipt_url ?? "",
    });
    setExpenseError("");
    setCreateTarget("expense");
  };

  const deleteExpense = async (expenseId: number) => {
    const response = await fetch(`${API_URL}/api/v1/accounting/expenses/${expenseId}`, {
      method: "DELETE",
      headers: { Accept: "application/json", ...authHeaders() },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Impossible de supprimer la dépense");
    }

    await refreshData();
  };

  const submitExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmittingExpense) return;

    /* ---------- Validation côté client ---------- */
    const amountHt = Number(expenseForm.amount_ht);

    if (!expenseForm.description.trim()) {
      setExpenseError("La description est obligatoire.");
      return;
    }
    if (!Number.isFinite(amountHt) || amountHt <= 0) {
      setExpenseError("Le montant HT doit être supérieur à 0.");
      return;
    }
    if (!expenseForm.account_code.trim()) {
      setExpenseError("Le compte comptable est obligatoire.");
      return;
    }
    if (expenseForm.payment_method === "cash" && !expenseForm.register_id) {
      setExpenseError("Sélectionnez une caisse pour ce paiement.");
      return;
    }
    if (expenseForm.payment_method === "credit" && !expenseForm.supplier_id) {
      setExpenseError("Sélectionnez un fournisseur pour la dépense à crédit.");
      return;
    }

    setIsSubmittingExpense(true);
    setExpenseError("");

    try {
      const payload = {
        date: expenseForm.date,
        description: expenseForm.description.trim(),
        amount_ht: amountHt,
        vat_rate: Number(expenseForm.vat_rate) || 0,
        account_code: expenseForm.account_code.trim(),
        payment_method: expenseForm.payment_method,
        register_id:
          expenseForm.payment_method === "cash"
            ? Number(expenseForm.register_id) || null
            : null,
        supplier_id:
          expenseForm.payment_method === "credit"
            ? Number(expenseForm.supplier_id) || null
            : null,
        receipt_url: expenseForm.receipt_url.trim() || null,
      };

      const response = await fetch(
        editingExpenseId
          ? `${API_URL}/api/v1/accounting/expenses/${editingExpenseId}`
          : `${API_URL}/api/v1/accounting/expenses`,
        {
          method: editingExpenseId ? "PUT" : "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { detail?: string }
          | null;
        setExpenseError(
          typeof payload?.detail === "string"
            ? payload.detail
            : editingExpenseId
              ? "Impossible de modifier la dépense."
              : "Impossible d'ajouter la dépense."
        );
        return;
      }

      /* ---------- Succès ---------- */
      setExpenseForm(emptyExpenseForm);
      setExpenseError("");
      setEditingExpenseId(null);
      setCreateTarget(null);
      await refreshData();
    } catch {
      setExpenseError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  /* ---------------------------------------------------------------------
     Factures
  --------------------------------------------------------------------- */
  const openInvoiceEditor = (invoice: Invoice) => {
    setEditingInvoiceId(invoice.id);
    setInvoiceForm({
      sale_id: String(invoice.sale_id),
      tax_id: invoice.tax_id ? String(invoice.tax_id) : "",
    });
    setInvoiceError("");
    setCreateTarget("invoice");
  };

  const deleteInvoice = async (invoiceId: number) => {
    const response = await fetch(`${API_URL}/api/v1/accounting/invoices/${invoiceId}`, {
      method: "DELETE",
      headers: { Accept: "application/json", ...authHeaders() },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Impossible de supprimer la facture");
    }

    await refreshData();
  };

  const submitInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const saleId = Number(invoiceForm.sale_id);
    if (!saleId) {
      setInvoiceError("Sélectionnez une vente valide.");
      return;
    }

    try {
      const url = editingInvoiceId
        ? `${API_URL}/api/v1/accounting/invoices/${editingInvoiceId}`
        : `${API_URL}/api/v1/accounting/invoices/from-sale/${saleId}`;
      const params = invoiceForm.tax_id ? `?tax_id=${Number(invoiceForm.tax_id)}` : "";

      const response = await fetch(`${url}${editingInvoiceId ? params : params}`, {
        method: editingInvoiceId ? "PUT" : "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        credentials: "include",
        body: editingInvoiceId ? JSON.stringify({ sale_id: saleId, tax_id: invoiceForm.tax_id ? Number(invoiceForm.tax_id) : null }) : undefined,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        setInvoiceError(
          typeof payload?.detail === "string" ? payload.detail : editingInvoiceId ? "Impossible de modifier la facture." : "Impossible de générer la facture."
        );
        return;
      }

      setInvoiceError("");
      setInvoiceForm(emptyInvoiceForm);
      setEditingInvoiceId(null);
      setCreateTarget(null);
      await refreshData();
    } catch {
      setInvoiceError("Erreur réseau. La facture n'a pas pu être traitée.");
    }
  };

  /* ---------------------------------------------------------------------
     Calculs dérivés pour le formulaire de dépense
  --------------------------------------------------------------------- */
  const expenseAmountHt = Number(expenseForm.amount_ht) || 0;
  const expenseVatRate = Number(expenseForm.vat_rate) || 0;
  const expenseVatAmount = Math.round((expenseAmountHt * expenseVatRate) / 100);
  const expenseAmountTtc = expenseAmountHt + expenseVatAmount;

  const printDateLabel = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());

  const printReference = `ERP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

  /* =====================================================================
     RENDU
  ===================================================================== */
  return (
    <AppShell>
      <div className={styles.page}>
        {/* ============================= HEADER ============================= */}
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>ERP</p>
            <h1>Gestion financière</h1>
          </div>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={handleExportPdf}
          >
            Exporter PDF
          </button>
        </header>

        {/* ====================== EN-TÊTE D'IMPRESSION ====================== */}
        <section
          className={styles.printHeader}
          aria-label="Identité de l'entreprise pour impression"
        >
          <div className={styles.printBrand}>
            {organization.logo ? (
              <img
                src={organization.logo}
                alt="Logo de l'entreprise"
                className={styles.printLogo}
              />
            ) : (
              <div className={styles.printLogoFallback}>
                {organization.name?.slice(0, 1).toUpperCase() || "E"}
              </div>
            )}

            <div className={styles.printBrandCopy}>
              <p className={styles.printEyebrow}>MIZAN ERP</p>
              <h2>{organization.name || "Ma société"}</h2>
              <p className={styles.printContact}>
                {[
                  organization.email,
                  organization.phone,
                  organization.address,
                ]
                  .filter(Boolean)
                  .join(" · ") || "contact@entreprise.com"}
              </p>
            </div>
          </div>

          <div className={styles.printMeta}>
            <div className={styles.printMetaItem}>
              <span className={styles.printMetaLabel}>Rapport</span>
              <strong className={styles.printMetaValue}>
                {tabs.find((tab) => tab.key === activeTab)?.label ?? "ERP"}
              </strong>
            </div>

            <div className={styles.printMetaItem}>
              <span className={styles.printMetaLabel}>Généré le</span>
              <strong className={styles.printMetaValue}>{printDateLabel}</strong>
            </div>

            <div className={styles.printMetaItem}>
              <span className={styles.printMetaLabel}>Référence</span>
              <strong className={styles.printMetaValue}>{printReference}</strong>
            </div>
          </div>
        </section>

        {/* ================= TITRE DU RAPPORT (print only) ================= */}
        <header className={styles.printTitle}>
          <h1>
            {activeTab === "depenses" && "Rapport des dépenses"}
            {activeTab === "creances" && "Rapport des créances"}
            {activeTab === "fournisseurs" && "Rapport fournisseurs"}
            {activeTab === "factures" && "Rapport des factures"}
            {activeTab === "pdf" && "Synthèse financière"}
          </h1>
          <p>
            {currentSummary.length} indicateurs · {currentRows.length} ligne
            {currentRows.length > 1 ? "s" : ""} de détail
          </p>
        </header>

        {/* ============================= TABS ============================= */}
        <nav className={styles.tabs} aria-label="Sous-sections ERP">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`${styles.tabButton} ${
                activeTab === tab.key ? styles.tabButtonActive : ""
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ========================= QUICK ACTIONS ========================= */}
        <div className={styles.quickActions}>
          {activeTab === "fournisseurs" && (
            <button
              type="button"
              className={styles.primaryAction}
              onClick={() => {
                setEditingSupplierId(null);
                setSupplierForm(emptySupplierForm);
                setCreateTarget("supplier");
              }}
            >
              Ajouter fournisseur
            </button>
          )}

          {activeTab === "depenses" && (
            <button
              type="button"
              className={styles.primaryAction}
              onClick={() => {
                setEditingExpenseId(null);
                setExpenseForm(emptyExpenseForm);
                setExpenseError("");
                setCreateTarget("expense");
              }}
            >
              Ajouter dépense
            </button>
          )}

          {activeTab === "creances" && (
            <button
              type="button"
              className={styles.primaryAction}
              onClick={() => setCreateTarget("receivable")}
            >
              Ajouter créance
            </button>
          )}

          {activeTab === "factures" && (
            <button
              type="button"
              className={styles.primaryAction}
              onClick={() => setCreateTarget("invoice")}
            >
              Générer facture
            </button>
          )}
        </div>

        {deleteTarget && (
          <div className={styles.modalBackdrop} onClick={closeDeleteModal}>
            <div
              className={styles.modalCard}
              onClick={(event) => event.stopPropagation()}
              style={{ maxWidth: 460 }}
            >
              <div className={styles.modalHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Confirmation</p>
                  <h3>Supprimer définitivement ?</h3>
                </div>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={closeDeleteModal}
                >
                  Fermer
                </button>
              </div>

              <p className={styles.formError} style={{ display: "block", margin: 0 }}>
                Cette action est irréversible. Le {deleteTarget.kind === "supplier" ? "fournisseur" : deleteTarget.kind === "expense" ? "dépense" : "facture"} "{deleteTarget.label}" sera supprimé.
              </p>

              <div className={styles.modalActions} style={{ marginTop: 24 }}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={closeDeleteModal}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className={`${styles.primaryAction} ${styles.rowActionDanger}`}
                  onClick={async () => {
                    await confirmDelete();
                    closeDeleteModal();
                  }}
                  style={{ background: "#ff6b6b", borderColor: "#ff6b6b", color: "#fff" }}
                >
                  Confirmer la suppression
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================= MODAL ============================= */}
        {createTarget && (
          <div className={styles.modalBackdrop} onClick={closeCreateModal}>
            <div
              className={styles.modalCard}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Création rapide</p>
                  <h3>
                    {createTarget === "supplier" &&
                      (editingSupplierId ? "Modifier fournisseur" : "Nouveau fournisseur")}
                    {createTarget === "expense" &&
                      (editingExpenseId ? "Modifier la dépense" : "Nouvelle dépense")}
                    {createTarget === "invoice" &&
                      (editingInvoiceId ? "Modifier la facture" : "Nouvelle facture")}
                    {createTarget === "receivable" && "Nouvelle créance"}
                  </h3>
                </div>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={closeCreateModal}
                >
                  Fermer
                </button>
              </div>

              {/* ===================== FORMULAIRE FOURNISSEUR ===================== */}
              {createTarget === "supplier" && (
                <form className={styles.modalForm} onSubmit={submitSupplier}>
                  <label>
                    <span>Nom</span>
                    <input
                      value={supplierForm.name}
                      onChange={(event) =>
                        setSupplierForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>

                  <label>
                    <span>Contact</span>
                    <input
                      value={supplierForm.contact_name}
                      onChange={(event) =>
                        setSupplierForm((current) => ({
                          ...current,
                          contact_name: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      value={supplierForm.email}
                      onChange={(event) =>
                        setSupplierForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    <span>Téléphone</span>
                    <input
                      value={supplierForm.phone}
                      onChange={(event) =>
                        setSupplierForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    <span>Adresse</span>
                    <textarea
                      value={supplierForm.address}
                      onChange={(event) =>
                        setSupplierForm((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                    />
                  </label>

                  {supplierError && (
                    <p className={styles.formError} role="alert">
                      {supplierError}
                    </p>
                  )}

                  <div className={styles.modalActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={closeCreateModal}
                    >
                      Annuler
                    </button>
                    <button type="submit" className={styles.primaryAction}>
                      {editingSupplierId ? "Enregistrer" : "Créer"}
                    </button>
                  </div>
                </form>
              )}

              {/* ===================== FORMULAIRE DÉPENSE ===================== */}
              {createTarget === "expense" && (
                <form className={styles.modalForm} onSubmit={submitExpense}>
                  {/* Date */}
                  <label>
                    <span>Date de la dépense</span>
                    <input
                      type="date"
                      value={expenseForm.date}
                      onChange={(event) =>
                        setExpenseForm((current) => ({
                          ...current,
                          date: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>

                  {/* Description */}
                  <label>
                    <span>Description</span>
                    <input
                      value={expenseForm.description}
                      onChange={(event) =>
                        setExpenseForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Ex : Achat de carburant"
                      required
                    />
                  </label>

                  {/* Montant HT + TVA */}
                  <div className={styles.twoColumn}>
                    <label>
                      <span>Montant HT (FCFA)</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={expenseForm.amount_ht}
                        onChange={(event) =>
                          setExpenseForm((current) => ({
                            ...current,
                            amount_ht: event.target.value,
                          }))
                        }
                        placeholder="0"
                        required
                      />
                    </label>

                    <label>
                      <span>TVA applicable</span>
                      <select
                        value={expenseForm.vat_rate}
                        onChange={(event) =>
                          setExpenseForm((current) => ({
                            ...current,
                            vat_rate: event.target.value,
                          }))
                        }
                      >
                        <option value="0">0% — Exonéré</option>
                        <option value="18">18% — Standard</option>
                      </select>
                    </label>
                  </div>

                  {/* Récapitulatif TTC */}
                  {expenseAmountHt > 0 && (
                    <div className={styles.expenseSummary}>
                      <div className={styles.expenseSummaryRow}>
                        <span>Montant HT</span>
                        <strong>{money(expenseAmountHt)}</strong>
                      </div>
                      <div className={styles.expenseSummaryRow}>
                        <span>TVA ({expenseVatRate}%)</span>
                        <strong>{money(expenseVatAmount)}</strong>
                      </div>
                      <div className={`${styles.expenseSummaryRow} ${styles.expenseSummaryTotal}`}>
                        <span>Total TTC</span>
                        <strong>{money(expenseAmountTtc)}</strong>
                      </div>
                    </div>
                  )}

                  {/* Compte comptable */}
                  <label>
                    <span>Compte comptable (SYSCOHADA)</span>
                    <input
                      value={expenseForm.account_code}
                      onChange={(event) =>
                        setExpenseForm((current) => ({
                          ...current,
                          account_code: event.target.value,
                        }))
                      }
                      placeholder="601"
                      required
                    />
                  </label>

                  {/* Mode de paiement */}
                  <label>
                    <span>Mode de paiement</span>
                    <select
                      value={expenseForm.payment_method}
                      onChange={(event) =>
                        setExpenseForm((current) => ({
                          ...current,
                          payment_method: event.target.value as PaymentMethod,
                        }))
                      }
                    >
                      <option value="cash">Espèces (caisse)</option>
                      <option value="bank">Banque / Virement</option>
                      <option value="credit">À crédit (fournisseur)</option>
                    </select>
                  </label>

                  {/* Sélection caisse si espèces */}
                  {expenseForm.payment_method === "cash" && (
                    <label>
                      <span>Caisse concernée</span>
                      <select
                        value={expenseForm.register_id}
                        onChange={(event) =>
                          setExpenseForm((current) => ({
                            ...current,
                            register_id: event.target.value,
                          }))
                        }
                        required
                      >
                        <option value="">Sélectionner une caisse…</option>
                        {registers.map((register) => (
                          <option key={register.id} value={register.id}>
                            {register.name} ({register.code})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {/* Sélection fournisseur si crédit */}
                  {expenseForm.payment_method === "credit" && (
                    <label>
                      <span>Fournisseur</span>
                      <select
                        value={expenseForm.supplier_id}
                        onChange={(event) =>
                          setExpenseForm((current) => ({
                            ...current,
                            supplier_id: event.target.value,
                          }))
                        }
                        required
                      >
                        <option value="">Sélectionner un fournisseur…</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {/* Message d'erreur */}
                  {expenseError && (
                    <p className={styles.formError} role="alert">
                      {expenseError}
                    </p>
                  )}

                  <div className={styles.modalActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={closeCreateModal}
                      disabled={isSubmittingExpense}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className={styles.primaryAction}
                      disabled={isSubmittingExpense}
                    >
                      {isSubmittingExpense
                        ? editingExpenseId
                          ? "Mise à jour…"
                          : "Enregistrement…"
                        : editingExpenseId
                          ? "Enregistrer les modifications"
                          : "Valider la dépense"}
                    </button>
                  </div>
                </form>
              )}

              {/* ===================== FORMULAIRE FACTURE ===================== */}
              {createTarget === "invoice" && (
                <form className={styles.modalForm} onSubmit={submitInvoice}>
                  <label>
                    <span>ID vente</span>
                    <input
                      type="number"
                      min="1"
                      value={invoiceForm.sale_id}
                      onChange={(event) =>
                        setInvoiceForm((current) => ({
                          ...current,
                          sale_id: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>

                  <label>
                    <span>ID taxe (optionnel)</span>
                    <input
                      type="number"
                      min="1"
                      value={invoiceForm.tax_id}
                      onChange={(event) =>
                        setInvoiceForm((current) => ({
                          ...current,
                          tax_id: event.target.value,
                        }))
                      }
                    />
                  </label>

                  {invoiceError && (
                    <p className={styles.formError} role="alert">
                      {invoiceError}
                    </p>
                  )}

                  <div className={styles.modalActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={closeCreateModal}
                    >
                      Annuler
                    </button>
                    <button type="submit" className={styles.primaryAction}>
                      {editingInvoiceId ? "Enregistrer la facture" : "Créer la facture"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ========================= SUMMARY GRID ========================= */}
        <section className={styles.summaryGrid} aria-live="polite">
          {loading ? (
            <div className={styles.loadingState}>Chargement des données…</div>
          ) : (
            currentSummary.map((card) => (
              <article
                key={card.label}
                className={`${styles.summaryCard} ${styles[card.tone]}`}
              >
                <span className={styles.summaryLabel}>{card.label}</span>
                <strong className={styles.summaryValue}>{card.value}</strong>
                <span className={styles.summaryDelta}>{card.delta}</span>
              </article>
            ))
          )}
        </section>

        {/* ========================= CONTENT GRID ========================= */}
        <div className={styles.contentGrid}>
          <section className={styles.primaryPanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Suivi</p>
                <h2>
                  {activeTab === "depenses" && "Dépenses"}
                  {activeTab === "creances" && "Créances et relances"}
                  {activeTab === "fournisseurs" && "Fournisseurs"}
                  {activeTab === "factures" && "Factures"}
                  {activeTab === "pdf" && "Rapports PDF"}
                </h2>
              </div>
            </div>

            <div className={styles.tableWrap}>
              {currentRows.map((row, index) => {
                const supplier =
                  activeTab === "fournisseurs"
                    ? suppliers.find((item) => item.name === row.label)
                    : null;
                const expense =
                  activeTab === "depenses"
                    ? expenses.find((item) => item.id === row.id)
                    : null;
                const invoice =
                  activeTab === "creances" || activeTab === "factures"
                    ? invoices.find((item) => item.id === row.id)
                    : null;

                return (
                  <div
                    key={`${row.label}-${row.meta}-${index}`}
                    className={styles.rowItem}
                  >
                    <div>
                      <strong>{row.label}</strong>
                      <small>{row.meta}</small>
                    </div>

                    <span className={styles.amount}>{row.amount}</span>

                    <span className={`${styles.status} ${styles[row.statusTone]}`}>
                      {row.status}
                    </span>

                    {(supplier || expense || invoice) && (
                      <div className={styles.rowActions}>
                        {supplier && (
                          <>
                            <button
                              type="button"
                              className={styles.rowActionButton}
                              onClick={() => openSupplierEditor(supplier)}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className={`${styles.rowActionButton} ${styles.rowActionDanger}`}
                              onClick={() =>
                                setDeleteTarget({
                                  kind: "supplier",
                                  id: supplier.id,
                                  label: supplier.name,
                                })
                              }
                            >
                              Supprimer
                            </button>
                          </>
                        )}

                        {expense && (
                          <>
                            <button
                              type="button"
                              className={styles.rowActionButton}
                              onClick={() => openExpenseEditor(expense)}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className={`${styles.rowActionButton} ${styles.rowActionDanger}`}
                              onClick={() =>
                                setDeleteTarget({
                                  kind: "expense",
                                  id: expense.id,
                                  label: expense.description,
                                })
                              }
                            >
                              Supprimer
                            </button>
                          </>
                        )}

                        {invoice && (
                          <>
                            <button
                              type="button"
                              className={styles.rowActionButton}
                              onClick={() => openInvoiceEditor(invoice)}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className={`${styles.rowActionButton} ${styles.rowActionDanger}`}
                              onClick={() =>
                                setDeleteTarget({
                                  kind: "invoice",
                                  id: invoice.id,
                                  label: invoice.number,
                                })
                              }
                            >
                              Supprimer
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <aside className={styles.sidePanel}>
            <p className={styles.panelEyebrow}>Synthèse</p>
            <div className={styles.sideSummary}>
              <div>
                <span>Montant comptable</span>
                <strong>
                  {money(
                    invoices.reduce(
                      (sum, invoice) => sum + Number(invoice.total_amount || 0),
                      0
                    )
                  )}
                </strong>
              </div>
              <div>
                <span>Fournisseurs</span>
                <strong>{suppliers.length}</strong>
              </div>
              <div>
                <span>Taxes</span>
                <strong>{overview?.taxes ?? 0}</strong>
              </div>
            </div>
          </aside>
        </div>

        {/* ====================== PIED DE PAGE (print only) ====================== */}
        <footer className={styles.printFooter}>
          <span>MIZAN ERP · Document généré automatiquement</span>
          <span>{organization.name || "Ma société"}</span>
        </footer>
      </div>
    </AppShell>
  );
}