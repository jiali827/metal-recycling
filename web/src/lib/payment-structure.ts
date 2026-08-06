import { isMiscPayment } from "./payment-meta";
import type { PaymentMiscKind, PaymentRecord } from "./types";

export type PaymentStructureStats = {
  settlementIn: number;
  settlementOut: number;
  miscIn: number;
  miscOut: number;
  miscByKind: { kind: PaymentMiscKind | "unknown"; amount: number }[];
};

/** 按当前列表口径汇总收付结构与杂项细项（金额取绝对值合计） */
export function aggregatePaymentStructure(
  payments: PaymentRecord[],
): PaymentStructureStats {
  let settlementIn = 0;
  let settlementOut = 0;
  let miscIn = 0;
  let miscOut = 0;
  const kindMap = new Map<PaymentMiscKind | "unknown", number>();

  for (const p of payments) {
    const amt = Math.abs(p.amount);
    if (isMiscPayment(p)) {
      if (p.type === "receipt") miscIn += amt;
      else miscOut += amt;
      const key = p.miscKind ?? "unknown";
      kindMap.set(key, (kindMap.get(key) ?? 0) + amt);
    } else if (p.type === "receipt") {
      settlementIn += amt;
    } else {
      settlementOut += amt;
    }
  }

  const miscByKind = [...kindMap.entries()]
    .map(([kind, amount]) => ({ kind, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { settlementIn, settlementOut, miscIn, miscOut, miscByKind };
}
