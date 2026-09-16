"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./AppShell.module.css";

type User = { full_name?: string; email?: string; role?: "admin" | "seller" };

const applications = [
  { label: "Ventes", description: "Devis et commandes", href: "/sales", icon: "↗", roles: ["admin", "seller"] },
  { label: "Caisse", description: "Sessions et clôtures", href: "/cash", icon: "▣", roles: ["admin", "seller"] },
  { label: "Produits", description: "Catalogue et tarifs", href: "/products", icon: "□", roles: ["admin", "seller"] },
  { label: "Clients", description: "Contacts et comptes", href: "/clients", icon: "◎", roles: ["admin", "seller"] },
  { label: "Stock", description: "Inventaire et mouvements", href: "/stock", icon: "▦", roles: ["admin"] },
  { label: "Rapports", description: "Analyse de l’activité", href: "/reports", icon: "⌁", roles: ["admin"] },
  { label: "Administration", description: "Utilisateurs et droits", href: "/settings/users", icon: "⚙", roles: ["admin"] },
];

const sidebarItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Ventes", href: "/sales" },
  { label: "Caisse", href: "/cash" },
  { label: "Produits", href: "/products" },
  { label: "Clients", href: "/clients" },
  { label: "Stock", href: "/stock", roles: ["admin"] },
  { label: "Rapports", href: "/reports", roles: ["admin"] },
  { label: "Utilisateurs", href: "/settings/users", roles: ["admin"] },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem("quincaillerie_access_token");
    const storedUser = window.localStorage.getItem("quincaillerie_user");
    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }

    setUser(JSON.parse(storedUser) as User);
  }, [router]);

  const role = user?.role ?? "seller";
  const visibleApps = applications.filter((application) => application.roles.includes(role));
  const visibleSidebar = sidebarItems.filter((item) => !item.roles || item.roles.includes(role));

  function logout() {
    window.localStorage.removeItem("quincaillerie_access_token");
    window.localStorage.removeItem("quincaillerie_user");
    router.replace("/");
  }

  if (!user) return null;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/dashboard" className={styles.brand}>
          <span className={styles.brandMark}>Q</span>
          <span><small>Quincaillerie</small><strong>Studio ERP</strong></span>
        </Link>

        <button type="button" className={styles.menuButton} onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Ouvrir la navigation">
          <span />
          <span />
          <span />
        </button>

        <nav className={menuOpen ? styles.sidebarNavOpen : styles.sidebarNav} aria-label="Navigation de l’espace de travail">
          <span className={styles.navLabel}>Espace de travail</span>
          {visibleSidebar.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={pathname === item.href ? styles.navActive : styles.navItem}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.userCard}>
          <span className={styles.avatar}>{(user.full_name ?? user.email ?? "U").slice(0, 1).toUpperCase()}</span>
          <div><strong>{user.full_name ?? "Utilisateur"}</strong><small>{role === "admin" ? "Administrateur" : "Vendeur"}</small></div>
          <button type="button" onClick={logout} className={styles.logoutButton} aria-label="Se déconnecter">↪</button>
        </div>
      </aside>

      <main className={styles.mainArea}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}><span>Studio ERP</span><b>/</b><strong>{pathname === "/dashboard" ? "Tableau de bord" : pathname.split("/").filter(Boolean).join(" / ")}</strong></div>
          <div className={styles.topbarActions}><div className={styles.globalSearch}>⌕ <span>Rechercher…</span></div><span className={styles.notification}>●</span><span className={styles.company}>Ma société</span></div>
        </header>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}

export { applications };