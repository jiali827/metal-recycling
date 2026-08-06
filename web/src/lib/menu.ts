import type { MessageKey } from "./i18n/types";
import type { ModuleId } from "./permissions";

export type MenuIconKey =
  | "house"
  | "fileText"
  | "scales"
  | "wallet"
  | "receipt"
  | "money"
  | "users"
  | "package"
  | "idCard"
  | "shield"
  | "gear"
  | "trace";

export interface MenuItem {
  href: string;
  /** i18n key under menu.* */
  labelKey: Extract<MessageKey, `menu.${string}`>;
  icon: MenuIconKey;
  group?: "main" | "master" | "system";
  /** 权限矩阵模块 ID，用于菜单过滤与按钮级 RBAC */
  moduleId: ModuleId;
}

/** 一期演示：登錄後展示全部模塊；後續由管理員配置角色權限再做菜單過濾 */
export const menuItems: MenuItem[] = [
  { href: "/dashboard", labelKey: "menu.dashboard", icon: "house", group: "main", moduleId: "dashboard" },
  { href: "/transactions", labelKey: "menu.transactions", icon: "trace", group: "main", moduleId: "transactions" },
  { href: "/contracts", labelKey: "menu.contracts", icon: "fileText", group: "main", moduleId: "contracts" },
  { href: "/weigh-tickets", labelKey: "menu.weighTickets", icon: "scales", group: "main", moduleId: "weighTickets" },
  // 应收/应付：后台仍保留数据与路由，菜单暂隐藏（往来由过磅生成，核销在收付款）
  // { href: "/receivables", labelKey: "menu.receivables", icon: "wallet", group: "main" },
  // { href: "/payables", labelKey: "menu.payables", icon: "receipt", group: "main" },
  { href: "/payments", labelKey: "menu.payments", icon: "money", group: "main", moduleId: "payments" },
  { href: "/customers", labelKey: "menu.customers", icon: "users", group: "master", moduleId: "customers" },
  { href: "/material-types", labelKey: "menu.materialTypes", icon: "package", group: "master", moduleId: "materialTypes" },
  { href: "/employees", labelKey: "menu.employees", icon: "idCard", group: "system", moduleId: "employees" },
  { href: "/roles", labelKey: "menu.roles", icon: "shield", group: "system", moduleId: "roles" },
  { href: "/settings/cash", labelKey: "menu.settings", icon: "gear", group: "system", moduleId: "settings" },
];

export const menuGroups: {
  id: MenuItem["group"];
  labelKey: Extract<MessageKey, `menuGroup.${string}`>;
}[] = [
  { id: "main", labelKey: "menuGroup.main" },
  { id: "master", labelKey: "menuGroup.master" },
  { id: "system", labelKey: "menuGroup.system" },
];
