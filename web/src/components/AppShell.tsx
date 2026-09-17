"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, Bell, Bird, Boxes, Calculator, LogOut, Menu, Package, Search, Settings, ShoppingCart, Users, WalletCards, X } from "lucide-react";
import styles from "./AppShell.module.css";

type User = { full_name?: string; email?: string; role?: "admin" | "seller" };
type ModuleState = { key: string; enabled: boolean };
type Application = { label: string; description: string; href: string; icon: typeof ShoppingCart; roles: string[]; moduleKey?: string };

const applications: Application[] = [
  { label: "Ventes", description: "Devis et commandes", href: "/sales", icon: ShoppingCart, roles: ["admin", "seller"], moduleKey: "sales" },
  { label: "Caisse", description: "Sessions et clôtures", href: "/cash", icon: WalletCards, roles: ["admin", "seller"], moduleKey: "cash" },
  { label: "Comptabilité", description: "Taxes, factures et journaux", href: "/accounting", icon: Calculator, roles: ["admin", "seller"], moduleKey: "accounting" },
  { label: "Produits", description: "Catalogue et tarifs", href: "/products", icon: Package, roles: ["admin", "seller"], moduleKey: "products" },
  { label: "Clients", description: "Contacts et comptes", href: "/clients", icon: Users, roles: ["admin", "seller"], moduleKey: "customers" },
  { label: "Stock", description: "Inventaire et mouvements", href: "/stock", icon: Boxes, roles: ["admin"], moduleKey: "stock" },
  { label: "Rapports", description: "Analyse de l’activité", href: "/reports", icon: BarChart3, roles: ["admin"], moduleKey: "reports" },
  { label: "Élevage", description: "Lots et suivi sanitaire", href: "/farming", icon: Bird, roles: ["admin", "seller"], moduleKey: "farming" },
  { label: "Administration", description: "Utilisateurs et droits", href: "/settings/users", icon: Settings, roles: ["admin"], moduleKey: "users" },
  { label: "Applications", description: "Modules de l’organisation", href: "/settings/modules", icon: Settings, roles: ["admin"], moduleKey: "users" },
];

const sidebarItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Ventes", href: "/sales", moduleKey: "sales" },
  { label: "Caisse", href: "/cash", moduleKey: "cash" },
  { label: "Comptabilité", href: "/accounting", moduleKey: "accounting" },
  { label: "Produits", href: "/products", moduleKey: "products" },
  { label: "Clients", href: "/clients", moduleKey: "customers" },
  { label: "Stock", href: "/stock", roles: ["admin"], moduleKey: "stock" },
  { label: "Rapports", href: "/reports", roles: ["admin"], moduleKey: "reports" },
  { label: "Élevage", href: "/farming", moduleKey: "farming" },
  { label: "Utilisateurs", href: "/settings/users", roles: ["admin"], moduleKey: "users" },
  { label: "Applications", href: "/settings/modules", roles: ["admin"], moduleKey: "users" },
];

export default function AppShell({ children, hideTopbar = false }: { children: React.ReactNode; hideTopbar?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [enabledModules, setEnabledModules] = useState<Set<string> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const storedUser = window.localStorage.getItem("quincaillerie_user");
    if (!storedUser) {
      router.replace("/login");
      return;
    }

    setUser(JSON.parse(storedUser) as User);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const storedUser = window.localStorage.getItem("quincaillerie_user");
    const accessToken = storedUser ? (JSON.parse(storedUser) as User & { access_token?: string }).access_token : undefined;
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/organization/modules`, {
      credentials: "include",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })
      .then((response) => response.ok ? response.json() : [])
      .then((modules: ModuleState[]) => setEnabledModules(new Set(modules.filter((module) => module.enabled).map((module) => module.key))))
      .catch(() => setEnabledModules(new Set(sidebarItems.flatMap((item) => item.moduleKey ? [item.moduleKey] : []))));
  }, [user]);

  const role = user?.role ?? "seller";
  const visibleApps = applications.filter((application) => application.roles.includes(role) && (!application.moduleKey || enabledModules === null || enabledModules.has(application.moduleKey)));
  const visibleSidebar = sidebarItems.filter((item) => (!item.roles || item.roles.includes(role)) && (!item.moduleKey || enabledModules === null || enabledModules.has(item.moduleKey)));

  function logout() {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/auth/logout`, { method: "POST", credentials: "include" }).catch(() => undefined);
    window.localStorage.removeItem("quincaillerie_access_token");
    window.localStorage.removeItem("quincaillerie_user");
    router.replace("/");
  }

  if (!user) return null;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <button type="button" className={styles.menuButton} onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={menuOpen ? "Fermer la navigation" : "Ouvrir la navigation"}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
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
          <button type="button" onClick={logout} className={styles.logoutButton} aria-label="Se déconnecter" title="Se déconnecter"><LogOut size={17} /><span className={styles.logoutText}>Déconnexion</span></button>
        </div>
      </aside>

      <main className={styles.mainArea}>
        {!hideTopbar && <header className={styles.topbar}>
          <div className={styles.breadcrumb}><span className={styles.breadcrumbBrand}>Studio ERP</span><b>/</b><strong>{pathname === "/dashboard" ? "Tableau de bord" : pathname.split("/").filter(Boolean).join(" / ")}</strong></div>
          <div className={styles.topbarActions}><div className={styles.globalSearch}><Search size={15} aria-hidden="true" /><span>Rechercher…</span></div><span className={styles.notification} aria-label="Notifications"><Bell size={15} /></span><span className={styles.company}>Ma société</span></div>
        </header>}
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}

export { applications };