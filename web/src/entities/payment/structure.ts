import { isMiscPayment, isSalaryPayment } from "@/entities/payment/meta";
import { paymentMiscCategoryKey } from "@/entities/payment/misc-category";
import type { PaymentRecord } from "@/entities/types";

export type PaymentStructureStats = {
  settlementIn: number;
  settlementOut: number;
  miscIn: number;
  miscOut: number;
  /** 往来核销减免金额合计（抹零；不含待确认与已冲销） */
  waiverTotal: number;
  miscByKind: { kind: string; amount: number }[];
};

/** 按当前列表口径汇总收付结构与杂项细项（金额取绝对值合计） */
export function aggregatePaymentStructure(
  payments: PaymentRecord[],
): PaymentStructureStats {
  let settlementIn = 0;
  let settlementOut = 0;
  let miscIn = 0;
  let miscOut = 0;
  let waiverTotal = 0;
  const kindMap = new Map<string, number>();

  for (const p of payments) {
    if (p.status === "pending" || p.status === "reversed") continue;
    const amt = Math.abs(p.amount);
    if (isMiscPayment(p)) {
      if (p.type === "receipt") miscIn += amt;
      else miscOut += amt;
      const key = paymentMiscCategoryKey(p);
      kindMap.set(key, (kindMap.get(key) ?? 0) + amt);
    } else if (isSalaryPayment(p)) {
      miscOut += amt;
      kindMap.set("salary", (kindMap.get("salary") ?? 0) + amt);
    } else {
      if (p.type === "receipt") settlementIn += amt;
      else settlementOut += amt;
      waiverTotal += Math.max(0, p.waiverAmount ?? 0);
    }
  }

  const miscByKind = [...kindMap.entries()]
    .map(([kind, amount]) => ({ kind, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { settlementIn, settlementOut, miscIn, miscOut, waiverTotal, miscByKind };
}
