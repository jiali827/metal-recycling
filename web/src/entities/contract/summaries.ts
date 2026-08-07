import type {
  PurchaseContract,
  PurchaseContractLine,
  PurchasePriceMode,
  PurchaseValidity,
  SaleContract,
  SaleContractLine,
  SaleFulfillmentPhase,
  WeighTicket,
} from "@/entities/types";
import { normalizeSaleStatus } from "@/entities/contract/status";

export const PRICE_MODE_LABEL: Record<PurchasePriceMode, string> = {
  ex_yard: "到场价",
  collect: "派车价",
  other: "其他",
};

export function purchaseMaterialSummary(lines: PurchaseContractLine[]): string {
  return lines.map((l) => l.materialName).filter(Boolean).join("；") || "—";
}

export function purchasePriceSummary(
  lines: PurchaseContractLine[],
  priceModeLabel: (mode: PurchasePriceMode) => string = (m) => PRICE_MODE_LABEL[m],
): string {
  return (
    lines
      .map((l) => `${priceModeLabel(l.priceMode)} $${l.unitPrice.toLocaleString("en-US")}`)
      .join(" / ") || "—"
  );
}

export function saleMaterialSummary(lines: SaleContractLine[]): string {
  return lines.map((l) => l.materialName).filter(Boolean).join("；") || "—";
}

export function salePlannedKgTotal(lines: SaleContractLine[]): number {
  return lines.reduce((s, l) => s + (l.plannedQty || 0), 0);
}

export function saleFulfilledKgTotal(lines: SaleContractLine[]): number {
  return lines.reduce((s, l) => s + (l.fulfilledQty || 0), 0);
}

export function saleLineAmount(plannedQtyKg: number, unitPricePerTon: number): number {
  return (plannedQtyKg / 1000) * unitPricePerTon;
}

export function saleTotalAmount(contract: Pick<SaleContract, "totalAmount" | "lines">): number {
  if (contract.totalAmount != null && !Number.isNaN(contract.totalAmount)) {
    return contract.totalAmount;
  }
  return contract.lines.reduce(
    (s, l) => s + (l.lineAmount ?? saleLineAmount(l.plannedQty, l.unitPrice)),
    0,
  );
}

export function saleProgressPercent(lines: SaleContractLine[]): number {
  const planned = salePlannedKgTotal(lines);
  if (planned <= 0) return 0;
  return Math.min(100, (saleFulfilledKgTotal(lines) / planned) * 100);
}

/** 吨 ↔ KG */
export function tonsToKg(tons: number): number {
  return Math.round(tons * 1000);
}

export function kgToTons(kg: number): number {
  return kg / 1000;
}

export function formatTonsFromKg(kg: number, digits = 3): string {
  const tons = kgToTons(kg);
  return Number.isInteger(tons) ? String(tons) : tons.toFixed(digits).replace(/\.?0+$/, "");
}

/**
 * 按磅单全量重算销售合同各行已履约。
 * 不再改写手工「状态」；履约情况由 saleFulfillmentPhase 派生。
 */
export function recomputeSaleContractFulfillment(
  contract: SaleContract,
  tickets: WeighTicket[],
): SaleContract {
  const lines = contract.lines.map((line) => {
    const fulfilledQty = tickets
      .filter(
        (t) =>
          t.status === "normal" &&
          t.saleContractLineId === line.id &&
          (t.saleContractId === contract.id || t.contractNo === contract.no),
      )
      .reduce((s, t) => s + t.netKg, 0);
    return { ...line, fulfilledQty };
  });

  return {
    ...contract,
    status: normalizeSaleStatus(contract.status),
    lines,
  };
}

export function saleLineOverTolerance(
  line: SaleContractLine,
  tolerancePercent?: number,
): boolean {
  const upper =
    tolerancePercent == null
      ? line.plannedQty
      : line.plannedQty * (1 + tolerancePercent / 100);
  return line.fulfilledQty > upper;
}

export function saleLineReadyToComplete(
  line: SaleContractLine,
  tolerancePercent?: number,
): boolean {
  const lower =
    tolerancePercent == null
      ? line.plannedQty
      : line.plannedQty * (1 - tolerancePercent / 100);
  return line.fulfilledQty >= lower;
}

export function saleContractReadyToComplete(contract: SaleContract): boolean {
  if (contract.lines.length === 0) return false;
  return contract.lines.every((l) => saleLineReadyToComplete(l, contract.tolerancePercent));
}

export function purchaseValidUntilPassed(contract: PurchaseContract, todayISO: string): boolean {
  return Boolean(contract.validUntil && contract.validUntil < todayISO);
}

/** 采购有效性（只读派生） */
export function purchaseValidity(
  contract: Pick<PurchaseContract, "validUntil">,
  todayISO: string,
): PurchaseValidity {
  if (!contract.validUntil) return "no_expiry";
  if (contract.validUntil < todayISO) return "expired";
  return "in_force";
}

/** 销售履约情况（只读派生）；优先级：超容差 > 已达约量 > 履约中 > 未履约 */
export function saleFulfillmentPhase(contract: SaleContract): SaleFulfillmentPhase {
  const anyOver = contract.lines.some((l) =>
    saleLineOverTolerance(l, contract.tolerancePercent),
  );
  if (anyOver) return "over";
  if (saleContractReadyToComplete(contract) && saleFulfilledKgTotal(contract.lines) > 0) {
    return "ready";
  }
  if (saleFulfilledKgTotal(contract.lines) > 0) return "in_progress";
  return "none";
}
