import type { StatusTone } from "@/shared/ui/StatusBadge";
import type {
  PurchaseValidity,
  SaleFulfillmentPhase,
} from "@/entities/types";

/** 手工「状态」字段色调 */
export const CONTRACT_STATUS_TONE: Record<string, StatusTone> = {
  draft: "muted",
  active: "info",
  completed: "success",
  closed: "default",
  void: "danger",
  // 兼容历史值展示
  fulfilling: "warning",
  expired: "danger",
};

export function contractStatusTone(status: string): StatusTone {
  return CONTRACT_STATUS_TONE[status] ?? "default";
}

export const PURCHASE_VALIDITY_TONE: Record<PurchaseValidity, StatusTone> = {
  in_force: "success",
  expired: "danger",
  no_expiry: "muted",
};

export function purchaseValidityTone(v: PurchaseValidity): StatusTone {
  return PURCHASE_VALIDITY_TONE[v];
}

export const SALE_FULFILLMENT_TONE: Record<SaleFulfillmentPhase, StatusTone> = {
  none: "muted",
  in_progress: "warning",
  ready: "info",
  over: "danger",
};

export function saleFulfillmentTone(phase: SaleFulfillmentPhase): StatusTone {
  return SALE_FULFILLMENT_TONE[phase];
}

/** 历史种子/本地数据：把已拆出的自动态映射回手工状态 */
export function normalizePurchaseStatus(status: string): "draft" | "active" | "closed" | "void" {
  if (status === "expired") return "active";
  if (status === "draft" || status === "active" || status === "closed" || status === "void") return status;
  return "active";
}

export function normalizeSaleStatus(
  status: string,
): "draft" | "active" | "completed" | "closed" | "void" {
  if (status === "fulfilling") return "active";
  if (
    status === "draft" ||
    status === "active" ||
    status === "completed" ||
    status === "closed" ||
    status === "void"
  ) {
    return status;
  }
  return "active";
}
