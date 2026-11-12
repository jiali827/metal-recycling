import type { PurchaseContract, SaleContract, ContractChange, ContractRevision, WeighTicket } from "@/entities/types";
import { nowLocalDateTime } from "@/shared/lib/date";
import type { I18nContextValue, MessageKey } from "@/shared/i18n";

type TFn = I18nContextValue["t"];

/**
 * 合同是否已产生有效（未作废）过磅记录。
 * 采购按合同编号文本弱关联；销售按结构化 saleContractId。
 * 有过磅记录的合同禁止变更（价格正源已落磅单，改合同会造成合同与过磅记录不一致）。
 */
export function contractHasActiveWeighings(
  tickets: Pick<WeighTicket, "contractNo" | "saleContractId" | "voidedAt" | "status">[],
  kind: "purchase" | "sale",
  contract: { id: string; no: string },
): boolean {
  const no = contract.no.trim();
  return tickets.some((tk) => {
    if (tk.voidedAt || tk.status === "void") return false;
    if (kind === "purchase") {
      return !!no && tk.contractNo.trim() === no;
    }
    return !!tk.saleContractId && tk.saleContractId === contract.id;
  });
}

/** 新建合同变更记录的 id */
function newRevisionId(): string {
  return `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** 统一格式化：空值 → 「—」，数字 → 两位小数 */
function fmt(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "number") return Number.isFinite(v) ? v.toFixed(2) : "—";
  return String(v);
}

interface ScalarSpec {
  key: string;
  /** i18n key（复用现有 contracts 文案，避免新增大量字段文案） */
  labelKey: MessageKey;
}

interface LineSpec {
  key: string;
  labelKey: MessageKey;
  get: (l: { materialName?: string; [k: string]: unknown }) => unknown;
}

function diffScalars(before: Record<string, unknown>, after: Record<string, unknown>, specs: ScalarSpec[], t: TFn): ContractChange[] {
  const out: ContractChange[] = [];
  for (const s of specs) {
    const from = fmt(before[s.key]);
    const to = fmt(after[s.key]);
    if (from !== to) {
      out.push({ field: s.key, label: t(s.labelKey), from, to });
    }
  }
  return out;
}

function diffLines(
  beforeLines: { id: string; materialName?: string; [k: string]: unknown }[],
  afterLines: { id: string; materialName?: string; [k: string]: unknown }[],
  specs: LineSpec[],
  t: TFn,
): ContractChange[] {
  const out: ContractChange[] = [];
  for (const al of afterLines) {
    const bl = beforeLines.find((x) => x.id === al.id);
    if (!bl) continue;
    for (const spec of specs) {
      const from = fmt(spec.get(bl));
      const to = fmt(spec.get(al));
      if (from !== to) {
        const material = (al.materialName || bl.materialName || t("contracts.lines")) as string;
        out.push({
          field: `line.${al.id}.${spec.key}`,
          label: `${material} · ${t(spec.labelKey)}`,
          from,
          to,
        });
      }
    }
  }
  return out;
}

/** 采购合同：可变更字段（确认后允许改价/改其他信息，PD10/PD11） */
const PURCHASE_SCALARS: ScalarSpec[] = [
  { key: "customerName", labelKey: "contracts.colCounterparty" },
  { key: "contactName", labelKey: "contracts.contactName" },
  { key: "project", labelKey: "contracts.project" },
  { key: "quotedOn", labelKey: "contracts.quotedOn" },
  { key: "validUntil", labelKey: "contracts.validUntil" },
  { key: "remarks", labelKey: "contracts.remarks" },
];

const PURCHASE_LINE_SPECS: LineSpec[] = [
  { key: "unitPrice", labelKey: "contracts.unitPrice", get: (l) => l.unitPrice },
  { key: "materialName", labelKey: "contracts.materialName", get: (l) => l.materialName },
  { key: "lineRemark", labelKey: "contracts.remarks", get: (l) => l.lineRemark },
  { key: "priceMode", labelKey: "contracts.priceMode", get: (l) => l.priceMode },
];

/** 销售合同：可变更字段 */
const SALE_SCALARS: ScalarSpec[] = [
  { key: "customerName", labelKey: "contracts.colCounterparty" },
  { key: "paymentTerms", labelKey: "contracts.paymentTerms" },
  { key: "fulfillBy", labelKey: "contracts.fulfillBy" },
  { key: "tolerancePercent", labelKey: "contracts.tolerancePercent" },
  { key: "totalAmount", labelKey: "contracts.totalAmount" },
  { key: "signedOn", labelKey: "contracts.colSignedDate" },
];

const SALE_LINE_SPECS: LineSpec[] = [
  { key: "unitPrice", labelKey: "contracts.unitPrice", get: (l) => l.unitPrice },
  { key: "materialName", labelKey: "contracts.materialName", get: (l) => l.materialName },
  { key: "plannedQty", labelKey: "contracts.plannedTons", get: (l) => l.plannedQty },
  { key: "lineRemark", labelKey: "contracts.remarks", get: (l) => l.lineRemark },
];

export interface PurchaseRevisionInput {
  customerName: string;
  contactName: string;
  project: string;
  quotedOn: string;
  validUntil: string;
  remarks: string;
  lines: { id: string; materialName?: string; unitPrice: number; priceMode?: string; lineRemark?: string }[];
}

export interface SaleRevisionInput {
  customerName: string;
  paymentTerms: string;
  fulfillBy: string;
  tolerancePercent?: number;
  totalAmount?: number;
  signedOn: string;
  lines: { id: string; materialName?: string; unitPrice: number; plannedQty: number; lineRemark?: string }[];
}

/** 计算采购合同字段级差异 */
export function diffPurchaseContract(before: PurchaseContract, after: PurchaseRevisionInput, t: TFn): ContractChange[] {
  return [
    ...diffScalars(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>, PURCHASE_SCALARS, t),
    ...diffLines(before.lines as unknown as { id: string; materialName?: string; [k: string]: unknown }[], after.lines as unknown as { id: string; materialName?: string; [k: string]: unknown }[], PURCHASE_LINE_SPECS, t),
  ];
}

/** 计算销售合同字段级差异 */
export function diffSaleContract(before: SaleContract, after: SaleRevisionInput, t: TFn): ContractChange[] {
  return [
    ...diffScalars(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>, SALE_SCALARS, t),
    ...diffLines(before.lines as unknown as { id: string; materialName?: string; [k: string]: unknown }[], after.lines as unknown as { id: string; materialName?: string; [k: string]: unknown }[], SALE_LINE_SPECS, t),
  ];
}

/** 生成一条合同变更记录（含字段差异、操作人、时间、原因，PD10） */
export function buildContractRevision(
  changes: ContractChange[],
  reason: string,
  revisedBy?: string,
): ContractRevision {
  return {
    id: newRevisionId(),
    revisedAt: nowLocalDateTime(),
    revisedBy,
    reason: reason.trim(),
    changes,
  };
}
