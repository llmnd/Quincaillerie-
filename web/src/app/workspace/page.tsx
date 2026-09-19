"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bird,
  Boxes,
  CalendarDays,
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
  {
    name: "Tableau de bord",
    href: "/dashboard",
    icon: LayoutDashboard,
    image:
      "https://i.pinimg.com/736x/6c/da/36/6cda36aa648c1e4b2dbfb443bc55ead2.jpg",
  },
  {
    name: "Ventes",
    href: "/sales",
    icon: ShoppingCart,
    image:
      "https://i.pinimg.com/1200x/cf/f9/34/cff9349aa326663fdbff5b863c4c3a72.jpg",
  },
  {
    name: "Caisse",
    href: "/cash",
    icon: WalletCards,
    image:
      "https://i.pinimg.com/736x/8c/33/e3/8c33e3983e190056f12c75841a8ecdd0.jpg",
  },
  {
    name: "Produits",
    href: "/products",
    icon: Package,
    image:
      "https://i.pinimg.com/1200x/06/a0/80/06a080194e88100b55e25cdfdf51d7f4.jpg",
  },
  {
    name: "Clients",
    href: "/clients",
    icon: Users,
    image:
      "https://i.pinimg.com/736x/5e/97/c1/5e97c160d37c1e422df3dea82e47c5ff.jpg",
  },
  {
    name: "Stock",
    href: "/stock",
    icon: Boxes,
    image:
      "https://i.pinimg.com/1200x/d8/43/df/d843df2ec1fa940efc4834eb655777d8.jpg",
  },
  {
    name: "Élevage",
    href: "/farming",
    icon: Bird,
    image:
      "https://i.pinimg.com/736x/ed/f6/91/edf69125695ac5b4e1e50cbaabfe0d9f.jpg",
  },
  {
    name: "Calendrier",
    href: "/calendar",
    icon: CalendarDays,
    image:
      "https://i.pinimg.com/736x/40/fb/de/40fbdea1fa846b0a4b9b18a66bdce9d8.jpg",
  },
  {
    name: "Administration",
    href: "/admin",
    icon: Settings,
    image:
      "https://i.pinimg.com/736x/e6/fa/db/e6fadb6a12a89f4d4e7ad0c2694c742c.jpg",
    adminOnly: true,
  },
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

  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] =
    useState<OrganizationProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUser((getStoredUser() as User | null) ?? null);
  }, []);

  useEffect(() => {
    fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
      }/api/v1/organization/profile`,
      {
        credentials: "include",
        headers: authHeaders(),
      }
    )
      .then((response) =>
        response.ok
          ? (response.json() as Promise<OrganizationProfile>)
          : null
      )
      .then((profile) => setOrganization(profile ?? null))
      .catch(() => setOrganization(null));
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const menuWrapper = document.querySelector(
        `.${styles.userMenuWrap}`
      );

      if (menuWrapper && !menuWrapper.contains(target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [menuOpen]);

  const displayName = user?.full_name ?? "Utilisateur";
  const userInitial =
    displayName.trim().charAt(0).toUpperCase() || "U";
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
        `${
          process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
        }/api/v1/auth/logout`,
        {
          method: "POST",
          credentials: "include",
          headers: authHeaders(),
        }
      );
    } catch {
      // Ignore API error and continue logout locally.
    }

    clearStoredAuth();
    setMenuOpen(false);
    router.replace("/login");
  }

  return (
    <AppShell hideSidebar hideTopbar hideContentPadding>
      <div className={styles.workspacePage}>
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

          <div className={styles.userMenuWrap}>
            <button
              type="button"
              className={styles.userTrigger}
              aria-label="Ouvrir le menu utilisateur"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className={styles.userAvatar}>
                {userInitial}
              </span>
            </button>

            {menuOpen && (
              <div
                className={styles.userDropdown}
                role="menu"
                aria-label="Menu utilisateur"
              >
                <div className={styles.userDropdownHeader}>
                  <span className={styles.userDropdownAvatar}>
                    {userInitial}
                  </span>

                  <div>
                    <strong>{displayName}</strong>
                    <small>
                      {user?.email ?? "Aucun email"}
                    </small>
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