import { localizeRoleName } from "@/shared/i18n";
import type { Locale } from "@/shared/i18n";
import type { RoleDef, RoleId, User } from "@/entities/types";

/** Legacy session / seed may still carry single roleId. */
export type UserRoleSource = Pick<User, "roleIds"> & {
  roleId?: RoleId;
};

export function getUserRoleIds(user: UserRoleSource): RoleId[] {
  if (user.roleIds?.length) return user.roleIds;
  if (user.roleId) return [user.roleId];
  return ["admin"];
}

export function roleIdsEqual(a: RoleId[], b: RoleId[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, i) => id === right[i]);
}

export function formatUserRoleLabels(
  user: UserRoleSource,
  roles: RoleDef[],
  locale?: Locale,
): string {
  return getUserRoleIds(user)
    .map((id) => {
      const role = roles.find((r) => r.id === id);
      return localizeRoleName(id, role?.name, locale);
    })
    .join(" · ");
}

export function userHasEnabledRole(user: UserRoleSource, roles: RoleDef[]): boolean {
  const ids = getUserRoleIds(user);
  return ids.some((id) => roles.find((r) => r.id === id)?.enabled);
}

export function buildEmployeeRoles(
  roleIds: RoleId[],
  roles: RoleDef[],
): RoleId[] {
  const unique = [...new Set(roleIds)];
  return unique.filter((id) => roles.some((r) => r.id === id));
}

export function normalizeStoredUser(raw: unknown): User | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const roleIds = Array.isArray(record.roleIds)
    ? (record.roleIds as RoleId[])
    : record.roleId
      ? [record.roleId as RoleId]
      : (["admin"] as RoleId[]);

  const { roleId: _, roleName: __, ...rest } = record;
  void _;
  void __;

  return {
    ...(rest as unknown as User),
    roleIds,
  };
}
