"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bird,
  Boxes,
  CalendarDays,
  Calculator,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import { authHeaders, clearStoredAuth, getStoredUser } from "../../lib/auth";
import styles from "./page.module.css";

const modules = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, image: "https://i.pinimg.com/1200x/a8/13/3f/a8133f8bcfac2c7f80958f5aeb31c574.jpg" },
  { name: "Ventes", href: "/sales", icon: ShoppingCart, image: "https://i.pinimg.com/1200x/cf/f9/34/cff9349aa326663fdbff5b863c4c3a72.jpg" },
  { name: "Caisse", href: "/cash", icon: WalletCards, image: "https://i.pinimg.com/736x/8c/33/e3/8c33e3983e190056f12c75841a8ecdd0.jpg" },
  { name: "Finances", href: "/erp", icon: Calculator, image: "https://i.pinimg.com/1200x/98/ed/1c/98ed1c73a25c35145917f361dd010358.jpg", adminOnly: true },
  { name: "Produits", href: "/products", icon: Package, image: "https://i.pinimg.com/1200x/06/a0/80/06a080194e88100b55e25cdfdf51d7f4.jpg" },
  { name: "Clients", href: "/clients", icon: Users, image: "https://i.pinimg.com/1200x/6d/6e/98/6d6e98e8fd33d1b657418c65eb5600d0.jpg" },
  { name: "Stock", href: "/stock", icon: Boxes, image: "https://i.pinimg.com/736x/71/16/ba/7116bafcb4ae414d6fd8c74a8cd2a46b.jpg" },
  { name: "Élevage", href: "/farming", icon: Bird, image: "https://i.pinimg.com/originals/6e/cd/13/6ecd136e249649f0ba8452d13613bcfd.gif" },
  { name: "Admin", href: "/admin", icon: Settings, image: "https://i.pinimg.com/1200x/8b/a4/80/8ba4808a95e33280a92660249a971bbd.jpg", adminOnly: true },
];

type User = {
  full_name?: string;
  email?: string;
  role?: "admin" | "seller";
};

type OrganizationProfile = {
  name?: string;
  logo?: string | null;
};

export default function WorkspacePage() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const organizationQuery = useQuery<OrganizationProfile | null>({
    queryKey: ["organization", "profile"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/organization/profile`,
        {
          credentials: "include",
          headers: authHeaders(),
        }
      );
      return response.ok ? ((await response.json()) as OrganizationProfile) : null;
    },
  });

  const organization = organizationQuery.data ?? null;

  useEffect(() => {
    setUser((getStoredUser() as User | null) ?? null);
  }, []);


  /* Fermeture du menu : clic extérieur + touche Échap */
  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const displayName = user?.full_name ?? "Utilisateur";
  const userInitial = displayName.trim().charAt(0).toUpperCase() || "U";

  const visibleModules = modules.filter(
    (module) => !module.adminOnly || user?.role === "admin"
  );

  const moduleRows = [
    visibleModules.slice(0, 6),
    visibleModules.slice(6),
  ].filter((row) => row.length > 0);

  async function handleLogout() {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/auth/logout`,
        {
          method: "POST",
          credentials: "include",
          headers: authHeaders(),
        }
      );
    } catch {
      // Erreur API ignorée — on continue la déconnexion locale.
    }

    clearStoredAuth();
    setMenuOpen(false);
    window.sessionStorage.removeItem("quincaillerie_authenticated");
    router.replace("/");
  }

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }


  return (
    <AppShell hideSidebar hideTopbar hideContentPadding showBreadcrumbWhenHidden>
      <div className={styles.workspacePage}>
        <button
          type="button"
          className={styles.workspaceBackButton}
          onClick={handleBack}
          aria-label="Retour"
          title="Retour"
        >
          <span className={styles.workspaceBackIcon} aria-hidden="true">
            <ArrowLeft size={15} strokeWidth={2.2} />
          </span>
          <span className={styles.workspaceBackLabel}>Retour</span>
        </button>

        <div className={styles.topRightBar}>
          <div className={styles.companyBadge}>
            {organization?.logo ? (
              <img
                src={organization.logo}
                alt="Logo de la société"
                className={styles.companyLogo}
              />
            ) : null}
            <span>{organization?.name ?? "My Company"}</span>
          </div>

          <div className={styles.userMenuWrap} ref={menuRef}>
            <button
              type="button"
              className={styles.userTrigger}
              aria-label="Ouvrir le menu utilisateur"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className={styles.userAvatar}>{userInitial}</span>
            </button>

            {menuOpen && (
              <div
                className={styles.userDropdown}
                role="menu"
                aria-label="Menu utilisateur"
              >
                <div className={styles.userDropdownHeader}>
                  <span className={styles.userDropdownAvatar}>{userInitial}</span>
                  <div>
                    <strong>{displayName}</strong>
                    <small>{user?.email ?? "Aucun email"}</small>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.userDropdownAction}
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/profile");
                  }}
                >
                  <UserRound size={15} />
                  <span>Mon profil</span>
                </button>

                <button
                  type="button"
                  className={styles.userDropdownAction}
                  onClick={handleLogout}
                >
                  <LogOut size={15} />
                  <span>Se déconnecter</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.gridWrap}>
          <div className={styles.grid}>
            {moduleRows.map((row, rowIndex) => (
              <div
                key={`row-${rowIndex}`}
                className={`${styles.row} ${
                  rowIndex === 0 ? styles.rowWide : styles.rowNarrow
                }`}
              >
                {row.map((module) => {
                  const Icon = module.icon;

                  return (
                    <Link
                      key={module.name}
                      href={module.href}
                      className={styles.moduleTile}
                      aria-label={module.name}
                    >
                      <span className={styles.moduleIcon}>
                        {module.image ? (
                          <img
                            src={module.image}
                            alt={module.name}
                            className={styles.moduleImage}
                          />
                        ) : (
                          <Icon
                            size={32}
                            strokeWidth={1.75}
                            className={styles.moduleIconSvg}
                          />
                        )}
                      </span>

                      <span className={styles.moduleLabel}>
                        {module.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}