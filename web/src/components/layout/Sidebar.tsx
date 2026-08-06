"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CaretRight,
  CaretUpDown,
  Check,
  FileText,
  GearSix,
  Globe,
  House,
  IdentificationCard,
  Key,
  Package,
  Receipt,
  Scales,
  ShieldCheck,
  SignOut,
  TreeStructure,
  Translate,
  UserCircle,
  Users,
  Wallet,
  CurrencyCircleDollar,
  type Icon,
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth-mock";
import { useI18n, type Locale } from "@/lib/i18n";
import { getMenuPermissionLevel, isMenuPermissionFilterEnabled } from "@/lib/menu-permissions";
import { menuGroups, menuItems, type MenuIconKey } from "@/lib/menu";
import { ProfileEditModal, PasswordChangeModal } from "@/components/entity/AccountModals";
import { UserAvatar } from "@/components/ui/AvatarUploadField";
import { ThemeColorPicker } from "./ThemeColorPicker";

const iconMap: Record<MenuIconKey, Icon> = {
  house: House,
  fileText: FileText,
  scales: Scales,
  wallet: Wallet,
  receipt: Receipt,
  money: CurrencyCircleDollar,
  users: Users,
  package: Package,
  idCard: IdentificationCard,
  shield: ShieldCheck,
  gear: GearSix,
  trace: TreeStructure,
};

const localeOptions: { id: Locale; labelKey: "language.zhHant" | "language.zhHans" | "language.en" }[] = [
  { id: "zh-Hant", labelKey: "language.zhHant" },
  { id: "zh-Hans", labelKey: "language.zhHans" },
  { id: "en", labelKey: "language.en" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, tenant, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
        setLangOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLangOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="shrink-0 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-brand text-sm font-bold text-white">
            BX
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">
              {t("app.name")}
            </div>
            <div className="truncate text-[11px] text-muted" title={tenant.name}>
              {tenant.name}
            </div>
          </div>
          <ThemeColorPicker />
        </div>
      </div>

      <nav
        className={`min-h-0 flex-1 overflow-y-auto px-3 pb-4${isMenuPermissionFilterEnabled() ? " ui-nav--perm-filtered" : ""}`}
      >
        {menuGroups.map((group, groupIndex) => {
          const items = menuItems.filter((item) => item.group === group.id);
          if (items.length === 0) return null;
          const visibleItems = isMenuPermissionFilterEnabled()
            ? items.filter((item) => getMenuPermissionLevel(item.moduleId) !== "none")
            : items;
          if (visibleItems.length === 0) return null;
          return (
            <div
              key={group.id}
              className={
                groupIndex > 0
                  ? "mt-4 border-t border-border/70 pt-4"
                  : "pt-1"
              }
            >
              <div className="mb-2.5 px-3 text-[10px] font-semibold tracking-[0.14em] text-muted/80 uppercase">
                {t(group.labelKey)}
              </div>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  const ItemIcon = iconMap[item.icon];
                  const permLevel = getMenuPermissionLevel(item.moduleId);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={process.env.NODE_ENV === "production"}
                      data-perm-level={permLevel}
                      data-module-id={item.moduleId}
                      className={`ui-nav-link flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-sm transition ${
                        active
                          ? "bg-sidebar-active font-medium text-brand"
                          : "text-foreground/75 hover:bg-chip hover:text-foreground"
                      }${permLevel === "read" ? " is-read" : ""}`}
                    >
                      <ItemIcon
                        size={18}
                        weight={active ? "fill" : "regular"}
                        className="shrink-0"
                      />
                      <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
                      {permLevel === "read" ? (
                        <span className="ui-nav-perm-badge">{t("permissions.levelRead")}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="relative shrink-0 border-t border-border p-3" ref={menuRef}>
        <button
          type="button"
          onClick={() => {
            setMenuOpen((v) => !v);
            setLangOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-[8px] px-2 py-2 text-left transition hover:bg-chip"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center">
            <UserAvatar
              name={user?.name ?? "U"}
              avatarUrl={user?.avatarUrl}
              size={36}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-foreground">
              {user?.name}
            </div>
            <div className="truncate text-xs text-muted">{user?.email}</div>
          </div>
          <CaretUpDown size={16} className="shrink-0 text-muted" />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="ui-panel ui-panel--flyout-host absolute bottom-[calc(100%+6px)] left-3 right-3 py-1"
          >
            <div className="relative">
              <button
                type="button"
                role="menuitem"
                className={`ui-panel-option${langOpen ? " is-highlighted" : ""}`}
                onClick={() => setLangOpen((v) => !v)}
                aria-expanded={langOpen}
                aria-haspopup="menu"
              >
                <Translate size={16} className="text-muted" />
                <span className="flex-1 text-left">{t("language.switch")}</span>
                <CaretRight
                  size={14}
                  className={`text-muted transition-transform${langOpen ? " translate-x-0.5" : ""}`}
                />
              </button>
              {langOpen ? (
                <div
                  role="menu"
                  className="ui-panel ui-panel-flyout absolute left-[calc(100%+4px)] top-0 z-[70] min-w-[9.5rem] py-1"
                >
                  {localeOptions.map((opt) => {
                    const selected = locale === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={selected}
                        className={`ui-panel-option${selected ? " is-selected" : ""}`}
                        onClick={() => {
                          setLocale(opt.id);
                          setLangOpen(false);
                          setMenuOpen(false);
                        }}
                      >
                        <Globe size={14} className="text-muted" />
                        <span className="flex-1 text-left">{t(opt.labelKey)}</span>
                        {selected ? (
                          <Check size={14} className="text-brand" weight="bold" />
                        ) : (
                          <span className="w-3.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              role="menuitem"
              className="ui-panel-option"
              onClick={() => {
                setMenuOpen(false);
                setProfileOpen(true);
              }}
            >
              <UserCircle size={16} className="text-muted" />
              {t("userMenu.profile")}
            </button>
            <button
              type="button"
              role="menuitem"
              className="ui-panel-option"
              onClick={() => {
                setMenuOpen(false);
                setPasswordOpen(true);
              }}
            >
              <Key size={16} className="text-muted" />
              {t("userMenu.password")}
            </button>
            <div className="my-1 border-t border-border" />
            <button
              type="button"
              role="menuitem"
              className="ui-panel-option text-danger hover:!bg-red-50"
              onClick={() => {
                setMenuOpen(false);
                logout();
                router.push("/login");
              }}
            >
              <SignOut size={16} />
              {t("userMenu.logout")}
            </button>
          </div>
        ) : null}
      </div>
      <ProfileEditModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <PasswordChangeModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </aside>
  );
}
