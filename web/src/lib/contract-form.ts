import type { Contract, TicketDirection } from "@/lib/types";

/** Parse first segment of unit price summary, e.g. "工字 $2.45" or "AA $2.30". */
export function parseContractPriceSummary(summary: string): {
  material: string;
  unitPrice: string;
} | null {
  const first = summary.split("/")[0]?.trim();
  if (!first) return null;
  const match = first.match(/^(.+?)\s+\$?([\d.]+)/);
  if (!match) return null;
  return { material: match[1].trim(), unitPrice: match[2] };
}

export function contractFieldsForWeighTicket(contract: Contract): {
  direction: TicketDirection;
  customerName: string;
  materialSummary: string;
  unitPrice: string;
} {
  const price = parseContractPriceSummary(contract.unitPriceSummary);
  return {
    direction: contract.type,
    customerName: contract.customerName,
    materialSummary: price?.material ?? "",
    unitPrice: price?.unitPrice ?? "",
  };
}
