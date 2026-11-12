import type { RoleId } from "@/entities/types";

/** 菜单可见性：由功能权限勾选自动推导 */
export type PermissionLevel = "none" | "read" | "write";

export type ModuleId =
  | "dashboard"
  | "transactions"
  | "contracts"
  | "weighTickets"
  | "payments"
  | "customers"
  | "materialTypes"
  | "projectTypes"
  | "miscCategories"
  | "employees"
  | "roles"
  | "settings";

/** 页面级功能权限（与当前原型页面能力对齐） */
export type ButtonActionId = "view" | "create" | "edit" | "delete";

export interface ModuleAccess {
  menu: PermissionLevel;
  buttons: ButtonActionId[];
}

export type RoleAccessMap = Record<ModuleId, ModuleAccess>;

export interface PermissionModuleDef {
  id: ModuleId;
  group: "main" | "master" | "system";
  menuHref: string;
  menuLabelKey:
    | "menu.dashboard"
    | "menu.transactions"
    | "menu.contracts"
    | "menu.weighTickets"
    | "menu.payments"
    | "menu.customers"
    | "menu.materialTypes"
    | "menu.projectTypes"
    | "menu.miscCategories"
    | "menu.employees"
    | "menu.roles"
    | "menu.settings";
  actions: readonly ButtonActionId[];
}

export const PERMISSION_MODULES: readonly PermissionModuleDef[] = [
  {
    id: "dashboard",
    group: "main",
    menuHref: "/dashboard",
    menuLabelKey: "menu.dashboard",
    actions: ["view"],
  },
  {
    id: "transactions",
    group: "main",
    menuHref: "/transactions",
    menuLabelKey: "menu.transactions",
    actions: ["view"],
  },
  {
    id: "contracts",
    group: "main",
    menuHref: "/contracts",
    menuLabelKey: "menu.contracts",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    id: "weighTickets",
    group: "main",
    menuHref: "/weigh-tickets",
    menuLabelKey: "menu.weighTickets",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    id: "payments",
    group: "main",
    menuHref: "/payments",
    menuLabelKey: "menu.payments",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    id: "customers",
    group: "master",
    menuHref: "/customers",
    menuLabelKey: "menu.customers",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    id: "materialTypes",
    group: "master",
    menuHref: "/material-types",
    menuLabelKey: "menu.materialTypes",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    id: "projectTypes",
    group: "master",
    menuHref: "/project-types",
    menuLabelKey: "menu.projectTypes",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    id: "miscCategories",
    group: "master",
    menuHref: "/misc-categories",
    menuLabelKey: "menu.miscCategories",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    id: "employees",
    group: "system",
    menuHref: "/employees",
    menuLabelKey: "menu.employees",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    id: "roles",
    group: "system",
    menuHref: "/roles",
    menuLabelKey: "menu.roles",
    actions: ["view", "create", "edit", "delete"],
  },
  {
    id: "settings",
    group: "system",
    menuHref: "/settings/cash",
    menuLabelKey: "menu.settings",
    actions: ["view", "edit"],
  },
] as const;

const MODULE_IDS = PERMISSION_MODULES.map((m) => m.id);
const WRITE_ACTIONS: ButtonActionId[] = ["create", "edit", "delete"];

function sanitizeButtons(
  module: PermissionModuleDef,
  buttons: ButtonActionId[],
): ButtonActionId[] {
  const allowed = new Set(module.actions);
  return buttons.filter((b) => allowed.has(b));
}

/** 根据功能权限勾选推导菜单可见性 */
export function deriveMenuLevel(
  module: PermissionModuleDef,
  buttons: ButtonActionId[],
): PermissionLevel {
  const sanitized = sanitizeButtons(module, buttons);
  if (!sanitized.includes("view")) return "none";
  const hasWrite = sanitized.some((b) => WRITE_ACTIONS.includes(b));
  return hasWrite ? "write" : "read";
}

function buildModuleAccess(
  module: PermissionModuleDef,
  buttons: ButtonActionId[],
): ModuleAccess {
  const sanitized = sanitizeButtons(module, buttons);
  const menu = deriveMenuLevel(module, sanitized);
  return {
    menu,
    buttons: menu === "none" ? [] : sanitized,
  };
}

export function createEmptyAccess(): RoleAccessMap {
  const access = {} as RoleAccessMap;
  for (const id of MODULE_IDS) {
    access[id] = { menu: "none", buttons: [] };
  }
  return access;
}

export function createDefaultAccess(): RoleAccessMap {
  const access = createEmptyAccess();
  for (const mod of PERMISSION_MODULES) {
    access[mod.id] = buildModuleAccess(mod, ["view"]);
  }
  return access;
}

function defineAccess(partial: Partial<RoleAccessMap>): RoleAccessMap {
  const base = createEmptyAccess();
  for (const mod of PERMISSION_MODULES) {
    const entry = partial[mod.id];
    if (!entry) continue;
    base[mod.id] = buildModuleAccess(
      mod,
      entry.buttons.length > 0 ? entry.buttons : entry.menu === "none" ? [] : ["view"],
    );
  }
  return base;
}

/** 系统管理员：全部模块最高可用权限（按模块 actions 全集） */
function createAdminFullAccess(): RoleAccessMap {
  const access = createEmptyAccess();
  for (const mod of PERMISSION_MODULES) {
    access[mod.id] = buildModuleAccess(mod, [...mod.actions]);
  }
  return access;
}

/** 内置五类角色的权限模板（对齐一期权限矩阵；管理员为全量可写） */
export const BUILTIN_ROLE_ACCESS: Record<RoleId, RoleAccessMap> = {
  admin: createAdminFullAccess(),
  contract: defineAccess({
    contracts: {
      menu: "write",
      buttons: ["view", "create", "edit", "delete"],
    },
    customers: { menu: "read", buttons: ["view"] },
    materialTypes: { menu: "read", buttons: ["view"] },
    projectTypes: { menu: "read", buttons: ["view"] },
  }),
  weigh: defineAccess({
    weighTickets: {
      menu: "write",
      buttons: ["view", "create", "edit", "delete"],
    },
    customers: { menu: "read", buttons: ["view"] },
    materialTypes: { menu: "read", buttons: ["view"] },
    projectTypes: { menu: "read", buttons: ["view"] },
  }),
  finance: defineAccess({
    dashboard: { menu: "read", buttons: ["view"] },
    transactions: { menu: "read", buttons: ["view"] },
    payments: {
      menu: "write",
      buttons: ["view", "create", "edit", "delete"],
    },
    miscCategories: {
      menu: "write",
      buttons: ["view", "create", "edit", "delete"],
    },
    settings: { menu: "write", buttons: ["view", "edit"] },
  }),
  boss: defineAccess({
    dashboard: { menu: "read", buttons: ["view"] },
    transactions: { menu: "read", buttons: ["view"] },
    contracts: { menu: "read", buttons: ["view"] },
    weighTickets: { menu: "read", buttons: ["view"] },
    payments: { menu: "read", buttons: ["view"] },
    customers: { menu: "read", buttons: ["view"] },
    materialTypes: { menu: "read", buttons: ["view"] },
    projectTypes: { menu: "read", buttons: ["view"] },
    miscCategories: { menu: "read", buttons: ["view"] },
    employees: { menu: "read", buttons: ["view"] },
    roles: { menu: "read", buttons: ["view"] },
    settings: { menu: "read", buttons: ["view"] },
  }),
};

export function normalizeAccess(access: RoleAccessMap): RoleAccessMap {
  const next = {} as RoleAccessMap;
  for (const mod of PERMISSION_MODULES) {
    next[mod.id] = buildModuleAccess(mod, access[mod.id]?.buttons ?? []);
  }
  return next;
}

export function resolveRoleAccess(
  role: { id: string; access?: RoleAccessMap },
): RoleAccessMap {
  if (role.access) return normalizeAccess(role.access);
  if (role.id in BUILTIN_ROLE_ACCESS) {
    return cloneAccess(BUILTIN_ROLE_ACCESS[role.id as RoleId]);
  }
  return createDefaultAccess();
}

export function cloneAccess(access: RoleAccessMap): RoleAccessMap {
  return normalizeAccess(access);
}

export function toggleModuleButton(
  access: RoleAccessMap,
  moduleId: ModuleId,
  button: ButtonActionId,
  enabled: boolean,
): RoleAccessMap {
  const mod = PERMISSION_MODULES.find((m) => m.id === moduleId);
  if (!mod || !mod.actions.includes(button)) return access;

  const next = cloneAccess(access);
  const set = new Set(next[moduleId].buttons);

  if (enabled) {
    set.add(button);
    if (button !== "view") set.add("view");
  } else {
    set.delete(button);
    if (button === "view") set.clear();
  }

  next[moduleId] = buildModuleAccess(mod, [...set]);
  return next;
}

export function accessToPermissionSummary(access: RoleAccessMap): string[] {
  const writeModules = PERMISSION_MODULES.filter((m) => access[m.id].menu === "write");
  const readModules = PERMISSION_MODULES.filter((m) => access[m.id].menu === "read");

  const parts: string[] = [];
  if (writeModules.length > 0) {
    parts.push(`${writeModules.length} 模块可操作`);
  }
  if (readModules.length > 0) {
    parts.push(`${readModules.length} 模块只读`);
  }
  if (parts.length === 0) return ["无菜单权限"];
  return parts;
}

export function formatAccessSummary(access: RoleAccessMap): string {
  return accessToPermissionSummary(access).join(" · ");
}

const MENU_RANK: Record<PermissionLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
};

/** 多角色权限并集：菜单取最高级别，按钮取并集 */
export function mergeAccessMaps(maps: RoleAccessMap[]): RoleAccessMap {
  if (maps.length === 0) return createEmptyAccess();
  if (maps.length === 1) return normalizeAccess(maps[0]);

  const merged = createEmptyAccess();
  for (const mod of PERMISSION_MODULES) {
    const buttons = new Set<ButtonActionId>();
    let menu: PermissionLevel = "none";
    for (const map of maps) {
      const entry = map[mod.id];
      if (!entry) continue;
      if (MENU_RANK[entry.menu] > MENU_RANK[menu]) menu = entry.menu;
      for (const b of entry.buttons) buttons.add(b);
    }
    merged[mod.id] = buildModuleAccess(mod, [...buttons]);
  }
  return merged;
}

export function canModuleAction(
  access: RoleAccessMap,
  moduleId: ModuleId,
  action: ButtonActionId,
): boolean {
  return access[moduleId]?.buttons.includes(action) ?? false;
}

export function getModuleMenuLevel(
  access: RoleAccessMap,
  moduleId: ModuleId,
): PermissionLevel {
  return access[moduleId]?.menu ?? "none";
}

export function getModuleDef(moduleId: ModuleId): PermissionModuleDef {
  return PERMISSION_MODULES.find((m) => m.id === moduleId)!;
}

export function hrefToModuleId(href: string): ModuleId | undefined {
  const item = PERMISSION_MODULES.find(
    (m) => href === m.menuHref || href.startsWith(`${m.menuHref}/`),
  );
  return item?.id;
}
