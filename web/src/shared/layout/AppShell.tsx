"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/provider";
import { useI18n } from "@/shared/i18n";
import {
  isMenuPermissionFilterEnabled,
  resolveModuleIdFromPath,
  useDefaultAppPath,
  useResolvedAccess,
} from "@/shared/config/menu-permissions";
import { getModuleMenuLevel } from "@/shared/config/permissions";
import { RoutePrefetch } from "./RoutePrefetch";
import { Sidebar } from "./Sidebar";

function ModuleAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { logout } = useAuth();
  const access = useResolvedAccess();
  const fallback = useDefaultAppPath();
  const filterOn = isMenuPermissionFilterEnabled();
  const moduleId = resolveModuleIdFromPath(pathname);
  const allowed =
    !filterOn || !moduleId || getModuleMenuLevel(access, moduleId) !== "none";
  /** 无任何菜单权限时 fallback 为 /login，需登出避免与登录页互跳死循环 */
  const noMenuAccess = filterOn && fallback === "/login";

  useEffect(() => {
    if (noMenuAccess) {
      logout();
      router.replace("/login");
      return;
    }
    if (!allowed && fallback && fallback !== pathname) {
      router.replace(fallback);
    }
  }, [allowed, fallback, logout, noMenuAccess, pathname, router]);

  if (noMenuAccess || !allowed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted">
        <p>{noMenuAccess ? t("permissions.noMenuAccess") : t("permissions.forbidden")}</p>
        <p className="text-xs">{t("permissions.redirecting")}</p>
      </div>
    );
  }

  return <>{children}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  /** 结算单打印预览：主区无 padding，顶栏可贴顶 */
  const isSettlementPrint = /^\/settlement-docs\/[^/]+$/.test(pathname);

  useEffect(() => {
    if (ready && !user) {
      router.replace("/login");
    }
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        {t("app.loading")}
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background print:block print:h-auto print:overflow-visible">
      <RoutePrefetch />
      <Sidebar />
      <main
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden print:overflow-visible print:p-0 ${
          isSettlementPrint ? "p-0" : "p-6"
        }`}
      >
        <ModuleAccessGuard>{children}</ModuleAccessGuard>
      </main>
    </div>
  );
}
