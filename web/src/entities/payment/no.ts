import type { PaymentRecord } from "@/entities/types";

function dateKey(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}${match[2]}${match[3]}` : "00000000";
}

/** 收付款编号：业务日期 YYYYMMDD + 当日四位流水号。 */
export function nextPaymentNo(payments: Pick<PaymentRecord, "paymentNo" | "date">[], date: string): string {
  const prefix = dateKey(date);
  let max = 0;
  for (const payment of payments) {
    if (!payment.paymentNo?.startsWith(prefix)) continue;
    const serial = Number(payment.paymentNo.slice(prefix.length));
    if (Number.isInteger(serial)) max = Math.max(max, serial);
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

/** 为历史数据补齐编号，同时保留已有编号。 */
export function ensurePaymentNos<T extends Pick<PaymentRecord, "paymentNo" | "date">>(rows: T[]): T[] {
  const assigned = [...rows];
  for (let i = 0; i < assigned.length; i += 1) {
    if (assigned[i].paymentNo) continue;
    assigned[i] = { ...assigned[i], paymentNo: nextPaymentNo(assigned.slice(0, i), assigned[i].date) };
  }
  return assigned;
}
