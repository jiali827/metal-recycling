import type { ModuleId, PermissionLevel } from "@/shared/config/permissions";

/**
 * 解析当前登录用户对某模块的菜单权限级别。
 * TODO: 接入员工角色权限并集后，在此返回真实级别。
 */
export function getMenuPermissionLevel(moduleId: ModuleId): PermissionLevel {
  void moduleId;
  return "write";
}

/** 是否启用侧边栏权限过滤（样式 + 隐藏不可见菜单） */
export function isMenuPermissionFilterEnabled(): boolean {
  return false;
}
