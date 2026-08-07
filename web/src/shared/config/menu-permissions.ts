"use client";

import { useMemo } from "react";
import { useAuth } from "@/features/auth/provider";
import { getUserRoleIds } from "@/entities/employee/roles";
import { useMockStore } from "@/data/mock/store";
import { menuItems } from "@/shared/config/menu";
import {
  canModuleAction,
  createEmptyAccess,
  getModuleMenuLevel,
  mergeAccessMaps,
  resolveRoleAccess,
  type ButtonActionId,
  type ModuleId,
  type PermissionLevel,
  type RoleAccessMap,
} from "@/shared/config/permissions";

/**
 * Mock 阶段启用侧栏权限过滤。接 API 后仍由此开关或远端配置控制。
 */
export function isMenuPermissionFilterEnabled(): boolean {
  return true;
}

/** 解析当前登录用户合并后的权限图（多角色并集，仅启用中的角色） */
export function useResolvedAccess(): RoleAccessMap {
  const { user } = useAuth();
  const { roles } = useMockStore();

  return useMemo(() => {
    if (!user) return createEmptyAccess();
    const roleIds = getUserRoleIds(user);
    const maps = roleIds
      .map((id) => roles.find((r) => r.id === id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r?.enabled))
      .map((r) => resolveRoleAccess(r));
    return mergeAccessMaps(maps);
  }, [user, roles]);
}

/**
 * @deprecated 请改用 useMenuPermissionLevel / useResolvedAccess
 * 无 React 上下文时的兜底（不应在组件外依赖）。
 */
export function getMenuPermissionLevel(moduleId: ModuleId): PermissionLevel {
  void moduleId;
  return "write";
}

export function useMenuPermissionLevel(moduleId: ModuleId): PermissionLevel {
  const access = useResolvedAccess();
  return getModuleMenuLevel(access, moduleId);
}

export function useModulePermission(moduleId: ModuleId) {
  const access = useResolvedAccess();
  return {
    access,
    menu: getModuleMenuLevel(access, moduleId),
    can: (action: ButtonActionId) => canModuleAction(access, moduleId, action),
    canView: canModuleAction(access, moduleId, "view"),
    canCreate: canModuleAction(access, moduleId, "create"),
    canEdit: canModuleAction(access, moduleId, "edit"),
    canDelete: canModuleAction(access, moduleId, "delete"),
  };
}

/** 用户可访问的第一个菜单路径（登录落地用） */
export function getDefaultAppPathForUser(
  user: { roleIds?: string[]; roleId?: string } | null | undefined,
  roles: { id: string; enabled: boolean; access?: RoleAccessMap }[],
): string {
  if (!user) return "/login";
  const roleIds = getUserRoleIds(user as Parameters<typeof getUserRoleIds>[0]);
  const maps = roleIds
    .map((id) => roles.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r?.enabled))
    .map((r) => resolveRoleAccess(r));
  const access = mergeAccessMaps(maps);
  for (const item of menuItems) {
    if (getModuleMenuLevel(access, item.moduleId) !== "none") {
      return item.href;
    }
  }
  return "/login";
}

export function useDefaultAppPath(): string {
  const { user } = useAuth();
  const { roles } = useMockStore();
  return useMemo(
    () => getDefaultAppPathForUser(user, roles),
    [user, roles],
  );
}

/** 根据路径解析模块 ID（最长前缀匹配） */
export function resolveModuleIdFromPath(pathname: string): ModuleId | null {
  const sorted = [...menuItems].sort((a, b) => b.href.length - a.href.length);
  for (const item of sorted) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.moduleId;
    }
  }
  // 隐藏菜单但仍存在的路由
  if (pathname.startsWith("/settlement-docs")) return "weighTickets";
  if (pathname.startsWith("/receivables")) return "payments";
  if (pathname.startsWith("/payables")) return "payments";
  return null;
}
