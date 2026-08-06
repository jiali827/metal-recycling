import type { StatusTone } from "@/shared/ui/StatusBadge";

/** 合同状态标签色调，与合同管理列表一致 */
export const CONTRACT_STATUS_TONE: Record<string, StatusTone> = {
  draft: "muted",
  active: "info",
  fulfilling: "warning",
  completed: "success",
  closed: "default",
};

export function contractStatusTone(status: string): StatusTone {
  return CONTRACT_STATUS_TONE[status] ?? "default";
}
