import type { MessageKey } from "@/shared/i18n/types";
import type { ModuleId } from "@/shared/config/permissions";

export type MenuIconKey =
  | "house"
  | "fileText"
  | "scales"
  | "wallet"
  | "receipt"
  | "money"
  | "users"
  | "package"
  | "folders"
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

/** 一期：側欄按角色權限過濾；接 API 後仍由此開關或遠端配置控制 */
export const menuItems: MenuItem[] = [
  { href: "/dashboard", labelKey: "menu.dashboard", icon: "house", group: "main", moduleId: "dashboard" },
  { href: "/transactions", labelKey: "menu.transactions", icon: "trace", group: "main", moduleId: "transactions" },
  { href: "/contracts", labelKey: "menu.contracts", icon: "fileText", group: "main", moduleId: "contracts" },
  { href: "/weigh-tickets", labelKey: "menu.weighTickets", icon: "scales", group: "main", moduleId: "weighTickets" },
  { href: "/settlement-docs", labelKey: "menu.settlementDocs", icon: "receipt", group: "main", moduleId: "weighTickets" },
  // 应收/应付目标进度已并入结算单列表（已核销/余额/核销状态）；路由保留兼容跳转
  { href: "/payments", labelKey: "menu.payments", icon: "money", group: "main", moduleId: "payments" },
  { href: "/customers", labelKey: "menu.customers", icon: "users", group: "master", moduleId: "customers" },
  { href: "/material-types", labelKey: "menu.materialTypes", icon: "package", group: "master", moduleId: "materialTypes" },
  { href: "/project-types", labelKey: "menu.projectTypes", icon: "folders", group: "master", moduleId: "projectTypes" },
  { href: "/misc-categories", labelKey: "menu.miscCategories", icon: "receipt", group: "master", moduleId: "miscCategories" },
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
