"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Bird, Boxes, Calculator, LogOut, Package, PanelLeftClose, PanelLeftOpen, Search, Settings, ShoppingCart, UserRound, Users, WalletCards } from "lucide-react";
import { authHeaders, clearStoredAuth, getStoredUser, restoreAuthSession } from "../lib/auth";
import styles from "./AppShell.module.css";

type User = { full_name?: string; email?: string; role?: "admin" | "seller" };
type ModuleState = { key: string; enabled: boolean };
type OrganizationProfile = { name: string; logo?: string | null };
type Application = { label: string; description: string; href: string; icon: typeof ShoppingCart; roles: string[]; moduleKey?: string };

const applications: Application[] = [
  { label: "Ventes", description: "Devis et commandes", href: "/sales", icon: ShoppingCart, roles: ["admin", "seller"], moduleKey: "sales" },
  { label: "Caisse", description: "Sessions et clôtures", href: "/cash", icon: WalletCards, roles: ["admin", "seller"], moduleKey: "cash" },
  { label: "Comptabilité", description: "Taxes, factures et journaux", href: "/accounting", icon: Calculator, roles: ["admin"], moduleKey: "accounting" },
  { label: "Produits", description: "Catalogue et tarifs", href: "/products", icon: Package, roles: ["admin", "seller"], moduleKey: "products" },
  { label: "Clients", description: "Contacts et comptes", href: "/clients", icon: Users, roles: ["admin", "seller"], moduleKey: "customers" },
  { label: "Stock", description: "Inventaire et mouvements", href: "/stock", icon: Boxes, roles: ["admin"], moduleKey: "stock" },
  { label: "Élevage", description: "Lots et suivi sanitaire", href: "/farming", icon: Bird, roles: ["admin", "seller"], moduleKey: "farming" },
  { label: "Administration", description: "Utilisateurs, rapports et comptabilité", href: "/admin", icon: Settings, roles: ["admin"], moduleKey: "users" },
];

const sidebarItems = [
  { label: "Apps", href: "/workspace" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Ventes", href: "/sales", moduleKey: "sales" },
  { label: "Caisse", href: "/cash", moduleKey: "cash" },
  { label: "Produits", href: "/products", moduleKey: "products" },
  { label: "Clients", href: "/clients", moduleKey: "customers" },
  { label: "Stock", href: "/stock", roles: ["admin"], moduleKey: "stock" },
  { label: "Élevage", href: "/farming", moduleKey: "farming" },
  { label: "Administration", href: "/admin", roles: ["admin"], moduleKey: "users" },
];

export default function AppShell({
  children,
  hideTopbar = false,
  hideSidebar = false,
  hideContentPadding = false,
}: Readonly<{ children: React.ReactNode; hideTopbar?: boolean; hideSidebar?: boolean; hideContentPadding?: boolean }>) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [enabledModules, setEnabledModules] = useState<Set<string> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [organization, setOrganization] = useState<OrganizationProfile | null>(null);

  const effectiveUser = user ?? { full_name: "Utilisateur", email: "", role: undefined as "admin" | "seller" | undefined };
  const role: "admin" | "seller" | undefined = effectiveUser.role;
  const adminOnlyRoutes = ["/admin", "/accounting", "/reports", "/settings/users"];
  const isAdminOnlyRoute = adminOnlyRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  useEffect(() => {
    const updateViewportHeight = () => {
      const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${height}px`);
    };

    updateViewportHeight();
    window.addEventListener("resize", updateViewportHeight);
    window.addEventListener("orientationchange", updateViewportHeight);
    window.visualViewport?.addEventListener("resize", updateViewportHeight);

    return () => {
      window.removeEventListener("resize", updateViewportHeight);
      window.removeEventListener("orientationchange", updateViewportHeight);
      window.visualViewport?.removeEventListener("resize", updateViewportHeight);
    };
  }, []);

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
        if (!modules || !Array.isArray(modules)) {
          setEnabledModules(allModuleKeys);
          return;
        }

        const enabledKeys = new Set(
          modules.filter((module) => module?.enabled).map((module) => module.key)
        );
        setEnabledModules(enabledKeys.size > 0 ? enabledKeys : allModuleKeys);
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

  useEffect(() => {
    if (!user) return;
    if (isAdminOnlyRoute && role !== "admin") {
      router.replace("/workspace");
    }
  }, [isAdminOnlyRoute, role, router, user]);

  const shouldHideSidebar = hideSidebar || isSidebarCollapsed;
  const safeEnabledModules = enabledModules && enabledModules.size > 0 ? enabledModules : new Set(sidebarItems.flatMap((item) => item.moduleKey ? [item.moduleKey] : []));
  let breadcrumbLabel = pathname.split("/").filter(Boolean).join(" / ");
  if (pathname === "/dashboard") {
    breadcrumbLabel = "Tableau de bord";
  } else if (pathname === "/workspace") {
    breadcrumbLabel = "Espace de travail";
  }
  const visibleSidebar = sidebarItems.filter((item) => {
    const allowedByRole = !item.roles || (role ? item.roles.includes(role) : false);
    if (!allowedByRole) return false;
    const moduleKey = item.moduleKey ?? "";
    return moduleKey.length === 0 || safeEnabledModules.has(moduleKey);
  });
  const safeUser = effectiveUser;
  const userInitial = (safeUser.full_name ?? safeUser.email ?? "U").trim().charAt(0).toUpperCase();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/workspace");
  }

  function handleLogout() {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);

    clearStoredAuth();
    setIsUserMenuOpen(false);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/login");
    }
    router.replace("/login");
  }

  return (
    <div className={styles.shell}>
      {!shouldHideSidebar && (
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
      )}

      <main className={shouldHideSidebar ? styles.mainAreaFull : styles.mainArea}>
        {!hideTopbar && (
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <button type="button" className={styles.backButton} onClick={handleBack} aria-label="Retour">
                <ArrowLeft size={14} />
                <span>Retour</span>
              </button>

              {!hideSidebar && (
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => setIsSidebarCollapsed((value) => !value)}
                  aria-label={isSidebarCollapsed ? "Afficher le menu" : "Masquer le menu"}
                >
                  {isSidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                  <span>{isSidebarCollapsed ? "Menu" : "Masquer"}</span>
                </button>
              )}

              <div className={styles.breadcrumb}>
                <span className={styles.breadcrumbSep}>/</span>
                <strong>{breadcrumbLabel}</strong>
              </div>
            </div>

            <div className={styles.topbarActions}>
              <button type="button" className={styles.notificationBtn} aria-label="Notifications">
                <Bell size={14} />
                <span className={styles.notificationDot} />
              </button>

              <div className={styles.userMenuWrap}>
                <span className={styles.company}>
                  {organization?.logo ? (
                    <img src={organization.logo} alt="Logo de l'entreprise" className={styles.companyLogo} />
                  ) : null}
                  {organization?.name ?? "Ma société"}
                </span>

                <button
                  type="button"
                  className={styles.userMenuButton}
                  onClick={() => setIsUserMenuOpen((open) => !open)}
                  aria-expanded={isUserMenuOpen}
                  aria-label="Ouvrir le menu utilisateur"
                >
                  <span className={styles.userAvatar}>{userInitial}</span>
                </button>

                {isUserMenuOpen && (
                  <div className={styles.userDropdown} role="menu" aria-label="Menu utilisateur">
                    <div className={styles.userDropdownHeader}>
                      <span className={styles.userDropdownAvatar}>{userInitial}</span>
                      <div>
                        <strong>{safeUser.full_name ?? "Utilisateur"}</strong>
                        <small>{safeUser.email ?? "Aucun email"}</small>
                      </div>
                    </div>

                    <button type="button" className={styles.userDropdownAction} onClick={() => {
                      setIsUserMenuOpen(false);
                      router.push("/profile");
                    }}>
                      <UserRound size={15} />
                      <span>Mon profil</span>
                    </button>

                    <button type="button" className={styles.userDropdownAction} onClick={handleLogout}>
                      <LogOut size={15} />
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}
        <div className={hideContentPadding ? styles.contentFullBleed : styles.content}>{children}</div>
      </main>
    </div>
  );
}

export { applications };