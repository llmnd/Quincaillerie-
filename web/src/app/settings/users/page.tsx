"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import OdooFormLayout from "../../../components/OdooFormLayout";
import { authHeaders } from "../../../lib/auth";
import styles from "./page.module.css";

type PermissionKey = "sales" | "cash" | "stock" | "customers" | "farming" | "reports";
type User = {
  id: number;
  full_name: string;
  email: string;
  role: "admin" | "seller";
  is_active: boolean;
  permissions?: Partial<Record<PermissionKey, boolean>>;
};
type UserForm = {
  full_name: string;
  email: string;
  password: string;
  role: "admin" | "seller";
  permissions: Record<PermissionKey, boolean>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const defaultPermissions: Record<PermissionKey, boolean> = {
  sales: true,
  cash: true,
  stock: false,
  customers: true,
  farming: false,
  reports: false,
};

const emptyForm: UserForm = {
  full_name: "",
  email: "",
  password: "",
  role: "seller",
  permissions: defaultPermissions,
};

const permissionLabels: Record<PermissionKey, string> = {
  sales: "Ventes",
  cash: "Caisse",
  stock: "Stock",
  customers: "Clients",
  farming: "Élevage",
  reports: "Rapports",
};

export function UsersPageContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function loadUsers() {
    const response = await fetch(`${API_URL}/api/v1/auth/users`, {
      headers: authHeaders(),
      credentials: "include",
    });
    if (response.status === 403) throw new Error("Cette page est réservée aux administrateurs.");
    if (!response.ok) throw new Error("Impossible de charger les utilisateurs.");
    return response.json() as Promise<User[]>;
  }

  useEffect(() => {
    let isMounted = true;

    const initializeUsers = async () => {
      try {
        const nextUsers = await loadUsers();
        if (!isMounted) return;
        setUsers(nextUsers);
        setError("");
      } catch (reason: unknown) {
        if (!isMounted) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger les utilisateurs."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initializeUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingUserId === null) {
      const response = await fetch(`${API_URL}/api/v1/auth/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        setError("Impossible de créer ce compte. Vérifiez l’email et le mot de passe.");
        return;
      }
    } else {
      const payload: Record<string, string> = {
        full_name: form.full_name,
        email: form.email,
        role: form.role,
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }
      payload.permissions = JSON.stringify(form.permissions);

      const response = await fetch(`${API_URL}/api/v1/auth/users/${editingUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError(
          "Impossible de modifier cet utilisateur. Vérifiez les informations saisies."
        );
        return;
      }
    }

    setForm(emptyForm);
    setShowForm(false);
    setEditingUserId(null);
    setError("");
    await loadUsers()
      .then((nextUsers) => setUsers(nextUsers))
      .catch(() => setError("Impossible de recharger les utilisateurs."));
  }

  function startEdit(user: User) {
    setEditingUserId(user.id);
    setForm({
      full_name: user.full_name,
      email: user.email,
      password: "",
      role: user.role,
      permissions: { ...defaultPermissions, ...(user.permissions ?? {}) },
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingUserId(null);
    setForm(emptyForm);
    setError("");
  }

  const submitCurrentUserForm = () => {
    const formElement = document.getElementById("user-form") as HTMLFormElement | null;
    if (formElement) {
      formElement.requestSubmit();
    }
  };

  /* ---------------------------------------------------------------------
     Titre de la page (breadcrumb)
     Liste → "Liste des utilisateurs" pour éviter la redondance
     "Utilisateurs › Utilisateurs"
  --------------------------------------------------------------------- */
  const pageTitle = showForm
    ? editingUserId !== null
      ? "Modifier utilisateur"
      : "Nouvel utilisateur"
    : "Liste des utilisateurs";

  /* ---------------------------------------------------------------------
     Actions de la barre supérieure :
     - Affichées uniquement dans le formulaire (création / édition)
     - Vidées sur la liste
  --------------------------------------------------------------------- */
  const layoutActions = showForm
    ? [
        { label: "Enregistrer", variant: "primary" as const, onClick: submitCurrentUserForm },
        { label: "Imprimer", onClick: () => undefined },
        { label: "Confirmer", onClick: () => undefined },
        { label: "Aperçu", onClick: () => undefined },
      ]
    : [];

  return (
    <OdooFormLayout
      category="Utilisateurs"
      title={pageTitle}
      actions={layoutActions}
      onNewClick={() => {
        if (showForm && editingUserId !== null) {
          cancelForm();
          return;
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        setShowForm(true);
        setEditingUserId(null);
        setForm(emptyForm);
      }}
      onSettingsClick={() => undefined}
      onCloudClick={submitCurrentUserForm}
      onCloseClick={cancelForm}
      /* Le bouton "Nouveau" reste visible partout :
         - sur la liste → ouvre le formulaire de création
         - sur le form d'édition → devient "Annuler" (via cancelForm ci-dessus)
         - sur le form de création → masqué pour éviter la redondance */
      showNewButton={!showForm || editingUserId !== null}
    >
      {showForm ? (
        <form id="user-form" className={styles.createForm} onSubmit={saveUser}>
          <div className={styles.formField}>
            <label>Nom complet</label>
            <input
              required
              value={form.full_name}
              onChange={(event) =>
                setForm({ ...form, full_name: event.target.value })
              }
            />
          </div>

          <fieldset className={styles.permissionsField}>
            <legend>Droits accordés</legend>
            <div className={styles.permissionsGrid}>
              {(Object.keys(permissionLabels) as PermissionKey[]).map((permission) => (
                <label key={permission} className={styles.permissionOption}>
                  <input
                    type="checkbox"
                    checked={form.permissions[permission]}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        permissions: {
                          ...form.permissions,
                          [permission]: event.target.checked,
                        },
                      })
                    }
                  />
                  <span>{permissionLabels[permission]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className={styles.formField}>
            <label>Email professionnel</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </div>

          <div className={styles.formField}>
            <label>
              {editingUserId !== null
                ? "Nouveau mot de passe (facultatif)"
                : "Mot de passe"}
            </label>
            <input
              minLength={8}
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              required={editingUserId === null}
            />
          </div>

          <div className={styles.formField}>
            <label>Rôle</label>
            <select
              value={form.role}
              onChange={(event) =>
                setForm({ ...form, role: event.target.value as "admin" | "seller" })
              }
            >
              <option value="seller">Vendeur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
        </form>
      ) : (
        <>
          {isLoading ? (
            <div className={styles.state}>Chargement des utilisateurs…</div>
          ) : null}
          {error ? <div className={styles.state}>{error}</div> : null}

          {!isLoading && !error ? (
            <div className={styles.table}>
              {users.map((user) => (
                <div className={styles.row} key={user.id}>
                  <div>
                    <strong>{user.full_name}</strong>
                    <small>{user.email}</small>
                  </div>
                  <span className={styles.role}>
                    {user.role === "admin" ? "Administrateur" : "Vendeur"}
                  </span>
                  <span className={user.is_active ? styles.active : styles.inactive}>
                    {user.is_active ? "Actif" : "Inactif"}
                  </span>
                  <button
                    type="button"
                    className={styles.secondaryAction}
                    onClick={() => startEdit(user)}
                  >
                    Modifier
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </OdooFormLayout>
  );
}

export default function UsersPage() {
  return (
    <AppShell>
      <UsersPageContent />
    </AppShell>
  );
}