import type {
  ArApItem,
  PaymentRecord,
  PaymentType,
  SettlementStatus,
} from "@/entities/types";
import { stampOnUpdate } from "@/shared/lib/timestamps";

/** @deprecated 兼容旧核销摘要中的 BX；新流程以 settlementDocId 为准 */
export function extractBxNoFromAllocation(summary: string | undefined): string {
  if (!summary || summary === "-") return "";
  const match = summary.match(/BX\s*([0-9A-Za-z-]+)/i);
  return match?.[1] ?? "";
}

export function paymentSettlementDocId(payment: PaymentRecord): string {
  return payment.settlementDocId?.trim() || "";
}

export function paymentSettlementDocNo(payment: PaymentRecord): string {
  return payment.settlementDocNo?.trim() || "";
}

/** @deprecated 旧磅单核销字段；保留给迁移期摘要解析 */
export function paymentTicketBxNo(payment: PaymentRecord): string {
  const legacy = (payment as PaymentRecord & { ticketBxNo?: string }).ticketBxNo;
  return legacy || extractBxNoFromAllocation(payment.allocationSummary);
}

export function buildAllocationSummary(
  settlementDocNo: string,
  payAmount: number,
  arApAmount: number,
  waiverAmount = 0,
): string {
  if (!settlementDocNo) return "-";
  const effective = payAmount + waiverAmount;
  const suffix = waiverAmount > 0 ? `（减免 ${formatWaiverMoney(waiverAmount)}）` : "";
  if (effective > 0 && effective < arApAmount - 1e-9) {
    return `部分核销 ${settlementDocNo}${suffix}`;
  }
  return `核销 ${settlementDocNo}${suffix}`;
}

/** 减免金额展示：2 位小数，去掉多余的尾零 */
export function formatWaiverMoney(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toFixed(2).replace(/\.?0+$/, "");
}

/** 往来核销的有效核销额 = 实收实付 + 减免（抹零）；其他类别恒为 amount */
export function paymentEffectiveSettled(payment: PaymentRecord): number {
  if (payment.category !== "settlement") return Number(payment.amount) || 0;
  const waiver = Math.max(0, Number(payment.waiverAmount) || 0);
  return (Number(payment.amount) || 0) + waiver;
}

export function settlementStatusFromAmounts(
  amount: number,
  settledAmount: number,
  current: SettlementStatus,
): SettlementStatus {
  if (current === "void") return "void";
  if (settledAmount <= 0) return "open";
  if (settledAmount >= amount - 1e-9) return "settled";
  return "partial";
}

/**
 * 按收付款合计回写往来已核销 / 余额 / 状态。
 * receipt → 应收；payment → 应付。按 settlementDocId 匹配。
 */
export function syncArApFromPayments(
  items: ArApItem[],
  payments: PaymentRecord[],
  settlementDocIds: string[],
  paymentType: PaymentType,
): ArApItem[] {
  const targets = new Set(settlementDocIds.map((b) => b.trim()).filter(Boolean));
  if (targets.size === 0) return items;

  return items.map((item) => {
    if (!targets.has(item.settlementDocId)) return item;
    if (item.status === "void") return item;

    const settledRaw = payments
      .filter(
      (p) =>
          p.category === "settlement" &&
          p.status !== "pending" &&
          p.status !== "reversed" &&
          p.type === paymentType &&
          paymentSettlementDocId(p) === item.settlementDocId,
      )
      .reduce((sum, p) => sum + paymentEffectiveSettled(p), 0);

    const settledAmount = Math.min(Math.max(0, settledRaw), item.amount);
    const balance = Math.max(0, item.amount - settledAmount);
    const status = settlementStatusFromAmounts(item.amount, settledAmount, item.status);

    if (
      settledAmount === item.settledAmount &&
      balance === item.balance &&
      status === item.status
    ) {
      return item;
    }

    return stampOnUpdate(item, { settledAmount, balance, status });
  });
}

export function paymentMatchesSettlementDoc(
  payment: PaymentRecord,
  settlementDocId: string,
): boolean {
  return paymentSettlementDocId(payment) === settlementDocId;
}

/** 某结算目标是否已有往来核销收付款 */
export function hasSettlementPayments(
  payments: PaymentRecord[],
  settlementDocId: string,
): boolean {
  return payments.some(
    (p) =>
      p.category === "settlement" &&
      p.status !== "pending" &&
      p.status !== "reversed" &&
      paymentSettlementDocId(p) === settlementDocId,
  );
}
