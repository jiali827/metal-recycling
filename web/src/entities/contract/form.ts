import type {
  PurchaseContract,
  PurchaseContractLine,
  SaleContract,
  SaleContractLine,
  TicketDirection,
} from "@/entities/types";
import {
  purchaseMaterialSummary,
  purchasePriceSummary,
  saleLineAmount,
} from "@/entities/contract/summaries";

export function contractFieldsForPurchaseLine(
  contract: PurchaseContract,
  line: PurchaseContractLine,
): {
  direction: TicketDirection;
  customerName: string;
  materialSummary: string;
  unitPrice: string;
} {
  return {
    direction: "purchase",
    customerName: contract.customerName,
    materialSummary: line.materialName,
    /** 磅单单价按每 KG；合同单价按每吨 */
    unitPrice: String(Number((line.unitPrice / 1000).toFixed(6))),
  };
}

export function contractFieldsForSaleLine(
  contract: SaleContract,
  line: SaleContractLine,
): {
  direction: TicketDirection;
  customerName: string;
  materialSummary: string;
  unitPrice: string;
} {
  return {
    direction: "sale",
    customerName: contract.customerName,
    materialSummary: line.materialName,
    unitPrice: String(Number((line.unitPrice / 1000).toFixed(6))),
  };
}

/** 弱关联：仅有合同号时取首行回填 */
export function contractFieldsForWeighTicketFromPurchase(contract: PurchaseContract) {
  const line = contract.lines[0];
  if (!line) {
    return {
      direction: "purchase" as const,
      customerName: contract.customerName,
      materialSummary: purchaseMaterialSummary(contract.lines),
      unitPrice: "",
    };
  }
  return contractFieldsForPurchaseLine(contract, line);
}

export function contractFieldsForWeighTicketFromSale(contract: SaleContract) {
  const line = contract.lines[0];
  if (!line) {
    return {
      direction: "sale" as const,
      customerName: contract.customerName,
      materialSummary: "",
      unitPrice: "",
    };
  }
  return contractFieldsForSaleLine(contract, line);
}

export function ensureSaleLineAmounts(lines: SaleContractLine[]): SaleContractLine[] {
  return lines.map((l) => ({
    ...l,
    lineAmount: l.lineAmount ?? saleLineAmount(l.plannedQty, l.unitPrice),
  }));
}

export function purchaseListPriceSummary(contract: PurchaseContract): string {
  return purchasePriceSummary(contract.lines);
}
