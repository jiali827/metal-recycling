import type {
  PurchaseContract,
  PurchaseContractLine,
  PurchasePriceMode,
  SaleContract,
  SaleContractLine,
  WeighTicket,
} from "@/entities/types";

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
 * 按磅单全量重算销售合同各行已履约；可选：首笔关联后 active → fulfilling。
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

  let status = contract.status;
  const hasLinked = tickets.some(
    (t) =>
      t.status === "normal" &&
      t.saleContractId === contract.id &&
      Boolean(t.saleContractLineId),
  );
  if (status === "active" && hasLinked) {
    status = "fulfilling";
  }

  return { ...contract, lines, status };
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
