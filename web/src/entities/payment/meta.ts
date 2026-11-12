import type { PaymentMiscKind, PaymentRecord } from "@/entities/types";

export const MISC_KINDS: PaymentMiscKind[] = [
  "salary",
  "freight",
  "petty_cash",
  "utilities",
  "other_expense",
  "other_income",
  "deposit",
  "other",
];

export function isMiscPayment(p: PaymentRecord) {
  return p.category === "misc";
}

export function isSalaryPayment(p: PaymentRecord) {
  return p.category === "salary";
}

export function defaultTypeForMiscKind(kind: PaymentMiscKind): "receipt" | "payment" {
  if (kind === "other_income" || kind === "deposit") return "receipt";
  return "payment";
}
