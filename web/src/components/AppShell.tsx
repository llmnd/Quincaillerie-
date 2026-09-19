"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Bird, Boxes, Calculator, LogOut, Package, PanelLeftClose, PanelLeftOpen, Settings, ShoppingCart, UserRound, Users, WalletCards } from "lucide-react";
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
  const queryClient = useQueryClient();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
    // Keep the first client render identical to the server before reading session-dependent data.
    useEffect(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsHydrated(true);
    }, []);

  const sessionQuery = useQuery<User | null>({
    queryKey: ["auth", "me"],
    queryFn: restoreAuthSession,
    placeholderData: () => getStoredUser() as User | null,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
  const user = sessionQuery.data ?? null;

  const effectiveUser = user ?? { full_name: "Utilisateur", email: "", role: undefined as "admin" | "seller" | undefined };
  const role: "admin" | "seller" | undefined = effectiveUser.role;
  const adminOnlyRoutes = ["/admin", "/accounting", "/reports", "/settings/users"];
  const isAdminOnlyRoute = adminOnlyRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const allModuleKeys = new Set(sidebarItems.flatMap((item) => item.moduleKey ? [item.moduleKey] : []));

  const modulesQuery = useQuery<ModuleState[]>({
    queryKey: ["organization", "modules"],
    enabled: Boolean(user),
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/organization/modules`, {
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      if (!response.ok) throw new Error("Impossible de charger les modules.");
      return response.json() as Promise<ModuleState[]>;
    },
  });

  const organizationQuery = useQuery<OrganizationProfile | null>({
    queryKey: ["organization", "profile"],
    enabled: Boolean(user),
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/organization/profile`, {
        credentials: "include",
        headers: authHeaders(),
      });
      if (!response.ok) return null;
      return response.json() as Promise<OrganizationProfile>;
    },
  });

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
    if (sessionQuery.isFetched && !user && !isLoggingOut) router.replace("/login");
  }, [isLoggingOut, router, sessionQuery.isFetched, user]);

  useEffect(() => {
    // Reset the visual route indicator once the new route is committed.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    if (isAdminOnlyRoute && role !== "admin") {
      router.replace("/workspace");
    }
  }, [isAdminOnlyRoute, role, router, user]);

  const shouldHideSidebar = hideSidebar || isSidebarCollapsed;
  const enabledModuleKeys = new Set((modulesQuery.data ?? []).filter((module) => module.enabled).map((module) => module.key));
  const safeEnabledModules = enabledModuleKeys.size > 0 ? enabledModuleKeys : allModuleKeys;
  const organization = isHydrated ? organizationQuery.data ?? null : null;
  let breadcrumbLabel = pathname.split("/").filter(Boolean).join(" / ");
  if (pathname === "/dashboard") {
    breadcrumbLabel = "Tableau de bord";
  } else if (pathname === "/workspace") {
    breadcrumbLabel = "Espace de travail";
  }
  const visibleSidebar = (isHydrated ? sidebarItems.filter((item) => {
    const allowedByRole = !item.roles || (role ? item.roles.includes(role) : false);
    if (!allowedByRole) return false;
    const moduleKey = item.moduleKey ?? "";
    return moduleKey.length === 0 || safeEnabledModules.has(moduleKey);
  }) : sidebarItems);
  const safeUser = isHydrated ? effectiveUser : { full_name: "Utilisateur", email: "", role: undefined };
  const userInitial = (safeUser.full_name ?? safeUser.email ?? "U").trim().charAt(0).toUpperCase();
  const roleLabel = !isHydrated ? "Utilisateur" : role === "admin" ? "Administrateur" : "Vendeur";

  function prefetchRoute(route: string) {
    router.prefetch(route);
  }

  function startNavigation(route: string) {
    if (route !== pathname) setIsNavigating(true);
  }

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      setIsNavigating(true);
      router.back();
      return;
    }

    setIsNavigating(true);
    router.push("/workspace");
  }

  function handleLogout() {
    setIsLoggingOut(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);

    clearStoredAuth();
    queryClient.setQueryData(["auth", "me"], null);
    queryClient.removeQueries({ queryKey: ["organization"] });
    setIsUserMenuOpen(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("quincaillerie_authenticated");
      window.sessionStorage.removeItem("quincaillerie_session_user");
    }
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/");
    }
    router.replace("/");
  }

  return (
    <div className={styles.shell} aria-busy={sessionQuery.isPending || isNavigating ? "true" : undefined}>
      {isNavigating && <output className={styles.navigationLoading} aria-label="Chargement de la page"><span /></output>}
      {!shouldHideSidebar && (
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTop}>
            <button type="button" className={`${styles.backButton} ${styles.backButtonPrimary}`} onClick={handleBack} aria-label="Retour" title="Retour">
              <span className={styles.backIcon} aria-hidden="true"><ArrowLeft size={15} strokeWidth={2.2} /></span>
              <span className={styles.backLabel}>Retour</span>
            </button>

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
          </div>

          <nav className={menuOpen ? styles.sidebarNavOpen : styles.sidebarNav} aria-label="Navigation">
            
            {visibleSidebar.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={() => { setMenuOpen(false); startNavigation(item.href); }}
                onMouseEnter={() => prefetchRoute(item.href)}
                onFocus={() => prefetchRoute(item.href)}
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
              <small>{roleLabel}</small>
            </div>
          </div>
        </aside>
      )}

      <main className={shouldHideSidebar ? styles.mainAreaFull : styles.mainArea}>
        {!hideTopbar && (
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
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