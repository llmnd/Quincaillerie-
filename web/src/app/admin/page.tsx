"use client";

import { useState } from "react";
import AppShell from "../../components/AppShell";
import { AccountingPageContent } from "../accounting/page";
import { ReportsPageContent } from "../reports/page";
import { ModulesPageContent } from "../settings/modules/page";
import { UsersPageContent } from "../settings/users/page";
import styles from "./page.module.css";

type TabKey = "users" | "reports" | "accounting" | "applications";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("users");

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "users", label: "Utilisateurs" },
    { key: "reports", label: "Rapports" },
    { key: "accounting", label: "Comptabilité" },
    { key: "applications", label: "Applications" },
  ];

  return (
    <AppShell>
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Administration</p>
            <h1>Centre d’administration</h1>
            <p>Gérez les comptes, les rapports et la comptabilité depuis un seul espace.</p>
          </div>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Administration tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={activeTab === tab.key ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "users" && <UsersPageContent />}
        {activeTab === "reports" && <ReportsPageContent />}
        {activeTab === "accounting" && <AccountingPageContent />}
        {activeTab === "applications" && <ModulesPageContent />}
      </main>
    </AppShell>
  );
}
