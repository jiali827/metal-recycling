import type { StatusTone } from "@/shared/ui/StatusBadge";

/** 合同状态标签色调（采购含 expired，销售含 fulfilling/completed） */
export const CONTRACT_STATUS_TONE: Record<string, StatusTone> = {
  draft: "muted",
  active: "info",
  fulfilling: "warning",
  completed: "success",
  closed: "default",
  expired: "danger",
};

export function contractStatusTone(status: string): StatusTone {
  return CONTRACT_STATUS_TONE[status] ?? "default";
}
