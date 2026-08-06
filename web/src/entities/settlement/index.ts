import type {
  ArApItem,
  PaymentRecord,
  PaymentType,
  SettlementStatus,
} from "@/entities/types";
import { stampOnUpdate } from "@/shared/lib/timestamps";

/** 从核销摘要中解析 BX 单号（兼容「核销 BX02513」「部分核销 BX02474」） */
export function extractBxNoFromAllocation(summary: string | undefined): string {
  if (!summary || summary === "-") return "";
  const match = summary.match(/BX\s*([0-9A-Za-z-]+)/i);
  return match?.[1] ?? "";
}

export function paymentTicketBxNo(payment: PaymentRecord): string {
  return payment.ticketBxNo || extractBxNoFromAllocation(payment.allocationSummary);
}

export function buildAllocationSummary(
  bxNo: string,
  payAmount: number,
  arApAmount: number,
): string {
  if (!bxNo) return "-";
  if (payAmount > 0 && payAmount < arApAmount) {
    return `部分核銷 BX${bxNo}`;
  }
  return `核銷 BX${bxNo}`;
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
 * receipt → 应收；payment → 应付。
 */
export function syncArApFromPayments(
  items: ArApItem[],
  payments: PaymentRecord[],
  bxNos: string[],
  paymentType: PaymentType,
): ArApItem[] {
  const targets = new Set(bxNos.map((b) => b.trim()).filter(Boolean));
  if (targets.size === 0) return items;

  return items.map((item) => {
    if (!targets.has(item.ticketBxNo)) return item;
    if (item.status === "void") return item;

    const settledRaw = payments
      .filter(
        (p) =>
          p.category === "settlement" &&
          p.type === paymentType &&
          paymentTicketBxNo(p) === item.ticketBxNo,
      )
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

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

export function paymentMatchesTicket(payment: PaymentRecord, bxNo: string): boolean {
  return paymentTicketBxNo(payment) === bxNo;
}
