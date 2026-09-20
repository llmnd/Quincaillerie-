"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Bird, Boxes, Calculator, LayoutDashboard, LayoutGrid, LogOut, Package, PanelLeftClose, PanelLeftOpen, Settings, ShoppingCart, UserRound, Users, WalletCards } from "lucide-react";
import { authHeaders, clearStoredAuth, getStoredUser, restoreAuthSession } from "../lib/auth";
import styles from "./AppShell.module.css";

type User = { full_name?: string; email?: string; role?: "admin" | "seller" };
type ModuleState = { key: string; enabled: boolean };
type OrganizationProfile = { name: string; logo?: string | null };
type Application = { label: string; description: string; href: string; icon: typeof ShoppingCart; roles: string[]; moduleKey?: string };
type BreadcrumbItem = { href: string; label: string };

const breadcrumbLabels: Record<string, string> = {
  "/": "Accueil",
  "/workspace": "Espace de travail",
  "/dashboard": "Tableau de bord",
  "/sales": "Ventes",
  "/orders": "Commandes",
  "/products": "Produits",
  "/stock": "Stock",
  "/cash": "Caisse",
  "/clients": "Clients",
  "/farming": "Élevage",
  "/calendar": "Calendrier",
  "/admin": "Administration",
  "/accounting": "Comptabilité",
  "/reports": "Rapports",
  "/profile": "Mon profil",
  "/settings/modules": "Modules",
  "/settings/support": "Support",
  "/settings/users": "Utilisateurs",
};

const breadcrumbStorageKey = "quincaillerie_breadcrumbs";

function BreadcrumbTrail({ items, className = "", compact = true }: Readonly<{ items: BreadcrumbItem[]; className?: string; compact?: boolean }>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLSpanElement>(null);
  const isCompact = compact && items.length > 3;
  const visibleItems = isCompact ? [items[0], items.at(-1)!] : items;
  const hiddenItems = isCompact ? items.slice(1, -1) : [];

  useEffect(() => {
    if (!menuOpen) return;

    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <nav className={`${styles.breadcrumbTrail} ${className}`} aria-label="Fil d’Ariane">
      {visibleItems.map((item, index) => (
        <span key={`${item.href}-${index}`} className={styles.breadcrumbItem}>
          {index > 0 && <span className={styles.breadcrumbSep}>/</span>}
          {isCompact && index === 1 && (
            <span ref={menuRef} className={styles.breadcrumbMoreWrap}>
              <button
                type="button"
                className={styles.breadcrumbMore}
                aria-label="Afficher les niveaux intermédiaires"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMenuOpen((open) => !open);
                }}
              >
                …
              </button>
              {menuOpen && (
                <span className={styles.breadcrumbMenu} role="menu">
                  {hiddenItems.map((hiddenItem) => (
                    <Link key={hiddenItem.href} href={hiddenItem.href} className={styles.breadcrumbMenuLink} role="menuitem" onClick={() => setMenuOpen(false)}>
                      {hiddenItem.label}
                    </Link>
                  ))}
                </span>
              )}
              <span className={styles.breadcrumbSep}>/</span>
            </span>
          )}
          {index === visibleItems.length - 1 ? (
            <strong className={styles.breadcrumbCurrent} aria-current="page">{item.label}</strong>
          ) : (
            <Link href={item.href} className={styles.breadcrumbLink}>{item.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}

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
  { label: "Apps", href: "/workspace", icon: LayoutGrid, image: "https://i.pinimg.com/1200x/98/ed/1c/98ed1c73a25c35145917f361dd010358.jpg" },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, image: "https://i.pinimg.com/736x/6c/da/36/6cda36aa648c1e4b2dbfb443bc55ead2.jpg" },
  { label: "Ventes", href: "/sales", icon: ShoppingCart, image: "https://i.pinimg.com/1200x/cf/f9/34/cff9349aa326663fdbff5b863c4c3a72.jpg", moduleKey: "sales" },
  { label: "Caisse", href: "/cash", icon: WalletCards, image: "https://i.pinimg.com/736x/8c/33/e3/8c33e3983e190056f12c75841a8ecdd0.jpg", moduleKey: "cash" },
  { label: "Produits", href: "/products", icon: Package, image: "https://i.pinimg.com/1200x/06/a0/80/06a080194e88100b55e25cdfdf51d7f4.jpg", moduleKey: "products" },
  { label: "Clients", href: "/clients", icon: Users, image: "https://i.pinimg.com/736x/24/93/ec/2493ec2ab1a2f4dab8989b1ad23762db.jpg", moduleKey: "customers" },
  { label: "Stock", href: "/stock", icon: Boxes, image: "https://i.pinimg.com/736x/71/16/ba/7116bafcb4ae414d6fd8c74a8cd2a46b.jpg", roles: ["admin"], moduleKey: "stock" },
  { label: "Élevage", href: "/farming", icon: Bird, image: "https://i.pinimg.com/originals/6e/cd/13/6ecd136e249649f0ba8452d13613bcfd.gif", moduleKey: "farming" },
  { label: "Admin", href: "/admin", icon: Settings, image: "https://i.pinimg.com/1200x/8b/a4/80/8ba4808a95e33280a92660249a971bbd.jpg", roles: ["admin"], moduleKey: "users" },
];

export default function AppShell({
  children,
  hideTopbar = false,
  hideSidebar = false,
  hideContentPadding = false,
  showBreadcrumbWhenHidden = false,
}: Readonly<{ children: React.ReactNode; hideTopbar?: boolean; hideSidebar?: boolean; hideContentPadding?: boolean; showBreadcrumbWhenHidden?: boolean }>) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(() => [{ href: pathname, label: breadcrumbLabels[pathname] ?? pathname }]);
  const [breadcrumbsReady, setBreadcrumbsReady] = useState(false);
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    navigationTimerRef.current = null;
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => () => {
    if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
  }, []);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(breadcrumbStorageKey);
    let parsed: BreadcrumbItem[] = [];

    if (stored) {
      try {
        const saved = JSON.parse(stored) as BreadcrumbItem[];
        if (Array.isArray(saved)) parsed = saved;
      } catch {
        window.sessionStorage.removeItem(breadcrumbStorageKey);
      }
    }

    const currentIndex = parsed.findIndex((item) => item.href === pathname);
    const nextBreadcrumbs = currentIndex >= 0
      ? parsed.slice(0, currentIndex + 1)
      : [...parsed, { href: pathname, label: breadcrumbLabels[pathname] ?? pathname.split("/").filter(Boolean).pop() ?? "Page" }];

    setBreadcrumbs(nextBreadcrumbs.length > 0 ? nextBreadcrumbs : [{ href: pathname, label: breadcrumbLabels[pathname] ?? pathname }]);
    setBreadcrumbsReady(true);
  }, []);

  useEffect(() => {
    if (!breadcrumbsReady) return;

    setBreadcrumbs((current) => {
      const existingIndex = current.findIndex((item) => item.href === pathname);
      if (existingIndex >= 0) return current.slice(0, existingIndex + 1);

      return [
        ...current,
        { href: pathname, label: breadcrumbLabels[pathname] ?? pathname.split("/").filter(Boolean).pop() ?? "Page" },
      ];
    });
  }, [breadcrumbsReady, pathname]);

  useEffect(() => {
    if (!breadcrumbsReady) return;
    window.sessionStorage.setItem(breadcrumbStorageKey, JSON.stringify(breadcrumbs));
  }, [breadcrumbs, breadcrumbsReady]);

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
  const visibleBreadcrumbs = breadcrumbs.length > 0 ? breadcrumbs : [{ href: pathname, label: breadcrumbLabels[pathname] ?? pathname }];
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
    if (route === pathname) return;
    if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    navigationTimerRef.current = setTimeout(() => setIsNavigating(true), 250);
  }

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      startNavigation("history");
      router.back();
      return;
    }

    startNavigation("/workspace");
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
                {item.image ? <img src={item.image} alt="" className={styles.navImage} onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <item.icon size={17} strokeWidth={1.8} aria-hidden="true" />}
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
        {hideTopbar && showBreadcrumbWhenHidden && (
          <BreadcrumbTrail items={visibleBreadcrumbs} className={styles.breadcrumbOverlay} />
        )}
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

              <BreadcrumbTrail items={visibleBreadcrumbs} className={styles.breadcrumb} compact={false} />
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