import type { RoleId, PaymentMiscKind } from "@/entities/types";
import type { RoleAccessMap } from "@/shared/config/permissions";
import { PERMISSION_MODULES } from "@/shared/config/permissions";
import { catalogs } from "./messages";
import { getActiveMessages } from "./provider";
import type { Locale } from "./types";

export function getFieldLabels(locale?: Locale) {
  return (locale ? catalogs[locale] : getActiveMessages()).fields;
}

/** @deprecated Prefer useI18n().t('fields.*') */
export const fieldLabels = new Proxy({} as Record<string, string>, {
  get(_t, prop: string) {
    const fields = getActiveMessages().fields as Record<string, string>;
    return fields[prop] ?? prop;
  },
});

export function getRoleNames(locale?: Locale): Record<RoleId, string> {
  return { ...(locale ? catalogs[locale] : getActiveMessages()).roles_names };
}

const BUILTIN_ROLE_IDS: RoleId[] = [
  "admin",
  "contract",
  "weigh",
  "finance",
  "boss",
];

export function isBuiltinRoleId(id: string): id is RoleId {
  return (BUILTIN_ROLE_IDS as string[]).includes(id);
}

/** Localized display name for a role id (falls back to stored name). */
export function localizeRoleName(
  roleId: string,
  fallback?: string,
  locale?: Locale,
): string {
  if (isBuiltinRoleId(roleId)) {
    return getRoleNames(locale)[roleId];
  }
  return fallback ?? roleId;
}

/** Localized permission summary for built-in roles; otherwise derive from access map. */
export function localizeRolePermissions(
  roleId: string,
  permissions: string[],
  locale?: Locale,
  access?: RoleAccessMap,
): string {
  if (isBuiltinRoleId(roleId)) {
    const dict = locale ? catalogs[locale] : getActiveMessages();
    return dict.roles_permissions[roleId];
  }
  if (access) {
    return formatAccessSummaryLocalized(access, locale);
  }
  return permissions.join(" · ");
}

export function formatAccessSummaryLocalized(
  access: RoleAccessMap,
  locale?: Locale,
): string {
  const dict = locale ? catalogs[locale] : getActiveMessages();
  let write = 0;
  let read = 0;
  for (const mod of PERMISSION_MODULES) {
    if (access[mod.id].menu === "write") write += 1;
    else if (access[mod.id].menu === "read") read += 1;
  }
  const parts: string[] = [];
  if (write > 0) {
    parts.push(dict.permissions.summaryWrite.replace("{count}", String(write)));
  }
  if (read > 0) {
    parts.push(dict.permissions.summaryRead.replace("{count}", String(read)));
  }
  if (parts.length === 0) return dict.permissions.summaryNone;
  return parts.join(" · ");
}

/** Display payment allocation summaries that were seeded in Traditional Chinese. */
export function localizeAllocationSummary(
  text: string,
  locale?: Locale,
): string {
  const form = (locale ? catalogs[locale] : getActiveMessages()).form;
  const trimmed = text.trim();
  const partial = trimmed.match(/^(部分核銷|部分核销)\s*(.+)$/);
  if (partial) return `${form.allocationPartialPrefix} ${partial[2]}`;
  const full = trimmed.match(/^(核銷|核销)\s*(.+)$/);
  if (full) return `${form.allocationPrefix} ${full[2]}`;
  return text;
}

const MISC_KIND_KEYS: Record<PaymentMiscKind, keyof import("./types").MessageDict["form"]> = {
  salary: "miscKindSalary",
  freight: "miscKindFreight",
  petty_cash: "miscKindPettyCash",
  utilities: "miscKindUtilities",
  other_expense: "miscKindOtherExpense",
  other_income: "miscKindOtherIncome",
  deposit: "miscKindDeposit",
  other: "miscKindOther",
};

export function localizeMiscKind(kind: PaymentMiscKind, locale?: Locale): string {
  const form = (locale ? catalogs[locale] : getActiveMessages()).form;
  const key = MISC_KIND_KEYS[kind];
  return form[key] ?? kind;
}

/** @deprecated Prefer getRoleNames() / t('roles_names.*') */
export const roleNames = new Proxy({} as Record<RoleId, string>, {
  get(_t, prop: string) {
    return getRoleNames()[prop as RoleId] ?? prop;
  },
});

export function getContractStatusLabel(
  locale?: Locale,
): Record<string, string> {
  const s = (locale ? catalogs[locale] : getActiveMessages()).status;
  return {
    draft: s.draft,
    active: s.active,
    fulfilling: s.fulfilling,
    completed: s.completed,
    closed: s.closed,
    expired: s.expired,
  };
}

/** @deprecated Prefer getContractStatusLabel() */
export const contractStatusLabel = new Proxy({} as Record<string, string>, {
  get(_t, prop: string) {
    return getContractStatusLabel()[prop] ?? prop;
  },
});

export function getTicketStatusLabel(locale?: Locale): Record<string, string> {
  const s = (locale ? catalogs[locale] : getActiveMessages()).status;
  return { normal: s.normal, void: s.void };
}

/** @deprecated Prefer getTicketStatusLabel() */
export const ticketStatusLabel = new Proxy({} as Record<string, string>, {
  get(_t, prop: string) {
    return getTicketStatusLabel()[prop] ?? prop;
  },
});

export function getSettlementStatusLabel(
  locale?: Locale,
): Record<string, string> {
  const s = (locale ? catalogs[locale] : getActiveMessages()).status;
  return {
    open: s.open,
    partial: s.partial,
    settled: s.settled,
    void: s.void,
  };
}

/** @deprecated Prefer getSettlementStatusLabel() */
export const settlementStatusLabel = new Proxy({} as Record<string, string>, {
  get(_t, prop: string) {
    return getSettlementStatusLabel()[prop] ?? prop;
  },
});
