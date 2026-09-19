"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import AppShell from "../../components/AppShell";
import OdooFormLayout, {
  OdooNewButton,
} from "../../components/OdooFormLayout";
import { authHeaders } from "../../lib/auth";

import styles from "./page.module.css";

type Customer = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  is_active: boolean;
};

type CustomerForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const emptyForm: CustomerForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

export default function ClientsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null,
  );

  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadCustomers() {
    const response = await fetch(`${API_URL}/api/v1/customers`, {
      headers: authHeaders(),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Impossible de charger les clients.");
    }

    const nextCustomers = (await response.json()) as Customer[];

    setCustomers(nextCustomers);

    return nextCustomers;
  }

  async function refreshCustomers() {
    await loadCustomers();
  }

  useEffect(() => {
    let isMounted = true;

    async function initializeCustomers() {
      try {
        setIsLoading(true);
        setError("");

        if (!isMounted) return;

        await loadCustomers();
      } catch {
        if (isMounted) {
          setError("Impossible de charger les clients.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initializeCustomers();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!showForm) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        setShowForm(false);
        resetForm();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showForm, isSaving]);

  useEffect(() => {
    document.body.style.overflow = showForm ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [showForm]);

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedCustomerId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setMessage("");
    setError("");
    setShowForm(true);
  };

  const openEditForm = (customer: Customer) => {
    setSelectedCustomerId(customer.id);

    setForm({
      name: customer.name ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
    });

    setMessage("");
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (isSaving) return;

    setShowForm(false);
    resetForm();
    setMessage("");
    setError("");
  };

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Le nom du client est obligatoire.");
      return;
    }

    if (isSaving) return;

    setIsSaving(true);
    setMessage("");
    setError("");

    const customerId = selectedCustomerId;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
    };

    const url =
      customerId === null
        ? `${API_URL}/api/v1/customers`
        : `${API_URL}/api/v1/customers/${customerId}`;

    try {
      const response = await fetch(url, {
        method: customerId === null ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError(
          customerId === null
            ? "Impossible de créer ce client."
            : "Impossible de modifier ce client.",
        );
        return;
      }

      const successMessage =
        customerId === null
          ? "Client créé avec succès."
          : "Client mis à jour avec succès.";

      setShowForm(false);
      resetForm();
      setMessage(successMessage);

      try {
        await refreshCustomers();
      } catch {
        setError(
          "Le client a été enregistré, mais la liste n'a pas pu être actualisée.",
        );
      }
    } catch {
      setError(
        customerId === null
          ? "Une erreur est survenue lors de la création."
          : "Une erreur est survenue lors de la modification.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const submitCurrentCustomerForm = () => {
    const formElement = document.getElementById(
      "customer-form",
    ) as HTMLFormElement | null;

    if (formElement) {
      formElement.requestSubmit();
    }
  };

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        !normalizedSearch ||
        customer.name.toLowerCase().includes(normalizedSearch) ||
        customer.email?.toLowerCase().includes(normalizedSearch) ||
        customer.phone?.toLowerCase().includes(normalizedSearch) ||
        customer.address?.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && customer.is_active) ||
        (statusFilter === "inactive" && !customer.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  const activeCustomers = useMemo(
    () => customers.filter((customer) => customer.is_active).length,
    [customers],
  );

  const inactiveCustomers = useMemo(
    () => customers.filter((customer) => !customer.is_active).length,
    [customers],
  );

  const hasFilters =
    search.trim() !== "" || statusFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  return (
    <AppShell>
      <div className={styles.page}>
        {!showForm && (
          <header className={styles.header}>
            <div className={styles.headerMain}>
              <div className={styles.titleIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle
                    cx="9"
                    cy="8"
                    r="3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M3.5 19c.7-3.2 2.5-5 5.5-5s4.8 1.8 5.5 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M16 11a3 3 0 1 0 0-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M17 14c2 .5 3.2 2 3.7 4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div>
                <p className={styles.eyebrow}>Ventes</p>
                <h1>Clients</h1>
                <p className={styles.subtitle}>
                  Contacts, coordonnées et suivi de votre clientèle.
                </p>
              </div>
            </div>

            <OdooNewButton onClick={openCreateForm}>
              Nouveau client
            </OdooNewButton>
          </header>
        )}

        {showForm ? (
          <div className={styles.formOverlay}>
            <OdooFormLayout
              category="Clients"
              title={
                selectedCustomerId === null
                  ? "Nouveau client"
                  : "Modifier client"
              }
              subtitle={
                selectedCustomerId === null
                  ? "Créer un nouveau client pour votre activité."
                  : "Mettre à jour les informations de ce client."
              }
              actions={[
                {
                  label: isSaving
                    ? "Enregistrement..."
                    : "Enregistrer",
                  variant: "primary",
                  onClick: submitCurrentCustomerForm,
                },
              ]}
              onNewClick={openCreateForm}
              onSettingsClick={() => undefined}
              onCloudClick={submitCurrentCustomerForm}
              onCloseClick={closeForm}
              showNewButton={selectedCustomerId !== null}
              showSettings
              showCloud
              showClose
            >
              <form
                id="customer-form"
                className={styles.form}
                onSubmit={saveCustomer}
              >
                <div className={styles.formHeader}>
                  <div>
                    <span className={styles.formEyebrow}>
                      {selectedCustomerId === null
                        ? "Création"
                        : "Modification"}
                    </span>

                    <h2>
                      {selectedCustomerId === null
                        ? "Nouveau client"
                        : "Modifier le client"}
                    </h2>

                    <p>
                      Renseignez les informations principales du
                      client.
                    </p>
                  </div>
                </div>

                <section className={styles.formSection}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <h3>Informations générales</h3>
                      <p>Identité et coordonnées du client.</p>
                    </div>
                  </div>

                  <div className={styles.odooFormGrid}>
                    <div className={styles.formField}>
                      <label htmlFor="customer-name">
                        Nom du client <span>*</span>
                      </label>

                      <input
                        id="customer-name"
                        required
                        value={form.name}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            name: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className={styles.formField}>
                      <label htmlFor="customer-email">
                        Email
                      </label>

                      <input
                        id="customer-email"
                        type="email"
                        value={form.email}
                        placeholder="client@example.com"
                        onChange={(event) =>
                          setForm({
                            ...form,
                            email: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className={styles.formField}>
                      <label htmlFor="customer-phone">
                        Téléphone
                      </label>

                      <input
                        id="customer-phone"
                        value={form.phone}
                        placeholder="+221 77 000 00 00"
                        onChange={(event) =>
                          setForm({
                            ...form,
                            phone: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className={styles.formField}>
                      <label htmlFor="customer-address">
                        Adresse
                      </label>

                      <input
                        id="customer-address"
                        value={form.address}
                        placeholder="Adresse du client"
                        onChange={(event) =>
                          setForm({
                            ...form,
                            address: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </section>

                {(message || error) && (
                  <div
                    className={`${styles.formMessage} ${
                      error
                        ? styles.errorMessage
                        : styles.successMessage
                    }`}
                  >
                    {error || message}
                  </div>
                )}

                <div className={styles.formFooter}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={closeForm}
                    disabled={isSaving}
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isSaving}
                  >
                    {isSaving
                      ? "Enregistrement..."
                      : selectedCustomerId === null
                        ? "Créer le client"
                        : "Enregistrer les modifications"}
                  </button>
                </div>
              </form>
            </OdooFormLayout>
          </div>
        ) : (
          <>
            <section className={styles.stats}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>
                  Total clients
                </div>
                <div className={styles.statValue}>
                  {customers.length}
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statLabel}>
                  Clients actifs
                </div>
                <div className={styles.statValue}>
                  {activeCustomers}
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statLabel}>
                  Clients inactifs
                </div>
                <div
                  className={`${styles.statValue} ${
                    inactiveCustomers > 0
                      ? styles.statWarning
                      : ""
                  }`}
                >
                  {inactiveCustomers}
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statLabel}>
                  Résultats
                </div>
                <div className={styles.statValue}>
                  {filteredCustomers.length}
                </div>
              </div>
            </section>

            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className={styles.searchIcon}
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="6.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M16 16l4.2 4.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>

                <input
                  type="search"
                  value={search}
                  placeholder="Rechercher un client..."
                  aria-label="Rechercher un client"
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />

                {search && (
                  <button
                    type="button"
                    className={styles.clearSearch}
                    aria-label="Effacer la recherche"
                    onClick={() => setSearch("")}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className={styles.toolbarControls}>
                <select
                  value={statusFilter}
                  aria-label="Filtrer par statut"
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as
                        | "all"
                        | "active"
                        | "inactive",
                    )
                  }
                >
                  <option value="all">
                    Tous les statuts
                  </option>
                  <option value="active">Actifs</option>
                  <option value="inactive">Inactifs</option>
                </select>

                <span className={styles.resultCount}>
                  {filteredCustomers.length}
                  {filteredCustomers.length > 1
                    ? " résultats"
                    : " résultat"}
                </span>

                {hasFilters && (
                  <button
                    type="button"
                    className={styles.resetButton}
                    onClick={resetFilters}
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>

            {message && !error && (
              <div className={styles.message}>
                {message}
              </div>
            )}

            {error && (
              <div className={styles.errorBanner}>
                {error}
              </div>
            )}

            {isLoading ? (
              <div className={styles.state}>
                <div className={styles.loader} />
                <span>Chargement des clients...</span>
              </div>
            ) : customers.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      cx="9"
                      cy="8"
                      r="3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M3.5 19c.7-3.2 2.5-5 5.5-5s4.8 1.8 5.5 5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M16 11a3 3 0 1 0 0-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M17 14c2 .5 3.2 2 3.7 4.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <strong>Aucun client enregistré</strong>

                <span>
                  Commencez par créer votre premier client.
                </span>

                <OdooNewButton onClick={openCreateForm}>
                  Nouveau client
                </OdooNewButton>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className={styles.empty}>
                <strong>Aucun résultat</strong>

                <span>
                  Aucun client ne correspond à vos critères
                  de recherche.
                </span>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={resetFilters}
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <section className={styles.tableSection}>
                <div className={styles.tableHead}>
                  <span>Client</span>
                  <span>Contact</span>
                  <span>Statut</span>
                </div>

                <div className={styles.tableBody}>
                  {filteredCustomers.map((customer) => (
                    <article
                      className={styles.row}
                      key={customer.id}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        openEditForm(customer)
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();
                          openEditForm(customer);
                        }
                      }}
                    >
                      <div className={styles.customerInfo}>
                        <div
                          className={styles.customerAvatar}
                          aria-hidden="true"
                        >
                          {customer.name
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className={styles.customerMain}>
                          <strong>{customer.name}</strong>

                          <small>
                            {customer.address ||
                              "Adresse non renseignée"}
                          </small>
                        </div>
                      </div>

                      <div className={styles.contactInfo}>
                        <div className={styles.contactItem}>
                          <span>Email</span>

                          <strong>
                            {customer.email ||
                              "Non renseigné"}
                          </strong>
                        </div>

                        <div className={styles.contactItem}>
                          <span>Téléphone</span>

                          <strong>
                            {customer.phone ||
                              "Non renseigné"}
                          </strong>
                        </div>
                      </div>

                      <div className={styles.statusCell}>
                        <span
                          className={
                            customer.is_active
                              ? styles.activeBadge
                              : styles.inactiveBadge
                          }
                        >
                          <i />
                          {customer.is_active
                            ? "Actif"
                            : "Inactif"}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}