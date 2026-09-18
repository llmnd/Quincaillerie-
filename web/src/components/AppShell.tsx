"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, Bell, Bird, Boxes, Calculator, Package, Search, Settings, ShoppingCart, Users, WalletCards } from "lucide-react";
import { authHeaders, getStoredUser, restoreAuthSession } from "../lib/auth";
import styles from "./AppShell.module.css";

type User = { full_name?: string; email?: string; role?: "admin" | "seller" };
type ModuleState = { key: string; enabled: boolean };
type OrganizationProfile = { name: string; logo?: string | null };
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
  const [organization, setOrganization] = useState<OrganizationProfile | null>(null);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      const storedUser = getStoredUser() as User | null;
      if (storedUser && isMounted) {
        setUser(storedUser);
      }

      const restoredUser = await restoreAuthSession();
      if (!isMounted) return;

      const nextUser = (restoredUser ?? storedUser) as User | null;
      setUser(nextUser);

      if (!nextUser) {
        router.replace("/login");
      }
    };

    void bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const allModuleKeys = new Set(sidebarItems.flatMap((item) => item.moduleKey ? [item.moduleKey] : []));
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/organization/modules`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...authHeaders(),
      },
    })
      .then((response) => {
        if (!response.ok) {
          setEnabledModules(allModuleKeys);
          return null;
        }
        return response.json() as Promise<ModuleState[]>;
      })
      .then((modules) => {
        if (!modules) return;
        setEnabledModules(new Set(modules.filter((module) => module.enabled).map((module) => module.key)));
      })
      .catch(() => setEnabledModules(allModuleKeys));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/organization/profile`, {
      credentials: "include",
      headers: authHeaders(),
    })
      .then((response) => response.ok ? response.json() as Promise<OrganizationProfile> : null)
      .then(setOrganization)
      .catch(() => setOrganization(null));
  }, [user]);

  const effectiveUser = user ?? { full_name: "Utilisateur", email: "", role: "seller" as const };
  const role: "admin" | "seller" = effectiveUser.role ?? "seller";
  const visibleSidebar = sidebarItems.filter((item) => {
    const allowedByRole = !item.roles || item.roles.includes(role);
    if (!allowedByRole) return false;
    const moduleKey = item.moduleKey ?? "";
    return enabledModules === null || moduleKey.length === 0 || enabledModules.has(moduleKey);
  });
  const safeUser = effectiveUser;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        {/* Bouton Hamburger style Zara */}
        <button
          type="button"
          className={`${styles.menuButton} ${menuOpen ? styles.menuOpen : ""}`}
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          <span className={styles.burgerLine}></span>
          <span className={styles.burgerLine}></span>
        </button>

        <nav className={menuOpen ? styles.sidebarNavOpen : styles.sidebarNav} aria-label="Navigation">
          <span className={styles.navLabel}>Espace de travail</span>
          {visibleSidebar.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={pathname === item.href ? styles.navActive : styles.navItem}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.userCard}>
          <button
            type="button"
            className={styles.avatarButton}
            onClick={() => router.push("/profile")}
            aria-label="Ouvrir mon profil"
            title="Mon profil"
          >
            {(safeUser.full_name ?? safeUser.email ?? "U").slice(0, 1).toUpperCase()}
          </button>
          <div>
            <strong>{safeUser.full_name ?? "Utilisateur"}</strong>
            <small>{role === "admin" ? "Administrateur" : "Vendeur"}</small>
          </div>
        </div>
      </aside>

      <main className={styles.mainArea}>
        {!hideTopbar && (
          <header className={styles.topbar}>
            <div className={styles.breadcrumb}>
              <span className={styles.breadcrumbBrand}>MIZAN ERP</span>
              <span className={styles.breadcrumbSep}>/</span>
              <strong>{pathname === "/dashboard" ? "Tableau de bord" : pathname.split("/").filter(Boolean).join(" / ")}</strong>
            </div>

            <div className={styles.topbarActions}>
              <div className={styles.globalSearch}>
                <Search size={14} aria-hidden="true" />
                <span>Rechercher…</span>
              </div>
              <button type="button" className={styles.notificationBtn} aria-label="Notifications">
                <Bell size={14} />
                <span className={styles.notificationDot} />
              </button>
              <span className={styles.company}>
                {organization?.logo ? <img src={organization.logo} alt="" className={styles.companyLogo} /> : null}
                {organization?.name ?? "Ma société"}
              </span>
            </div>
          </header>
        )}
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}

export { applications };