import type {
  PaymentMiscCategory,
  PaymentMiscKind,
  PaymentRecord,
  PaymentType,
} from "@/entities/types";
import { localizeMiscKind } from "@/shared/i18n/labels";
import type { Locale } from "@/shared/i18n/types";

const LEGACY_MISC_KIND_IDS: Record<PaymentMiscKind, string> = {
  salary: "pmc-salary",
  freight: "pmc-freight",
  petty_cash: "pmc-petty-cash",
  utilities: "pmc-utilities",
  other_expense: "pmc-other-expense",
  other_income: "pmc-other-income",
  deposit: "pmc-deposit",
  other: "pmc-other",
};

export function legacyMiscKindId(kind: PaymentMiscKind): string {
  return LEGACY_MISC_KIND_IDS[kind];
}

/** 统计与分组用的稳定键（含已删除类别） */
export function paymentMiscCategoryKey(payment: PaymentRecord): string {
  if (payment.miscKindId?.trim()) return payment.miscKindId.trim();
  if (payment.miscKind) return legacyMiscKindId(payment.miscKind);
  return "unknown";
}

/** 展示杂项类别名称：优先记录快照，再查主数据，最后兼容旧枚举 */
export function paymentMiscCategoryLabel(
  payment: PaymentRecord,
  categories: PaymentMiscCategory[],
  locale?: Locale,
): string {
  const snapshot = payment.miscKindName?.trim();
  if (snapshot) return snapshot;
  const id = payment.miscKindId?.trim();
  if (id) {
    const cat = categories.find((row) => row.id === id);
    if (cat) return cat.name;
  }
  if (payment.miscKind) return localizeMiscKind(payment.miscKind, locale);
  return "—";
}

export function defaultTypeForMiscCategory(cat: PaymentMiscCategory): PaymentType {
  return cat.defaultType;
}

/** 杂项登记表单下拉：仅启用项；编辑时可包含已删除/停用的当前值 */
export function miscCategorySelectOptions(
  categories: PaymentMiscCategory[],
  opts?: { currentId?: string; currentName?: string },
): { value: string; label: string }[] {
  const options = categories
    .filter((row) => row.enabled)
    .map((row) => ({ value: row.id, label: row.name }));

  const currentId = opts?.currentId?.trim();
  if (currentId && !options.some((row) => row.value === currentId)) {
    const fromCatalog = categories.find((row) => row.id === currentId);
    const label = opts?.currentName?.trim() || fromCatalog?.name || currentId;
    options.unshift({ value: currentId, label });
  }
  return options;
}

export function resolveMiscCategoryForSave(
  miscKindId: string,
  categories: PaymentMiscCategory[],
  fallbackName?: string,
): { miscKindId: string; miscKindName: string } | null {
  const id = miscKindId.trim();
  if (!id) return null;
  const cat = categories.find((row) => row.id === id);
  const name = cat?.name ?? fallbackName?.trim();
  if (!name) return null;
  return { miscKindId: id, miscKindName: name };
}
