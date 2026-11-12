import type {
  PurchaseContract,
  SaleContract,
  WeighSettlementKind,
  WeighTicket,
} from "@/entities/types";

export type SettlementContractRef = {
  id: string;
  no: string;
  customerName: string;
};

function ticketDateKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return "";
}

/** 磅单是否已挂合同（按结算方向） */
export function isTicketLinkedToContract(
  ticket: WeighTicket,
  kind: WeighSettlementKind,
): boolean {
  if (kind === "purchase") {
    if (ticket.direction !== "purchase") return false;
    const no = ticket.contractNo?.trim();
    return Boolean(no && no !== "-");
  }
  if (ticket.direction !== "sale") return false;
  return Boolean(ticket.saleContractId?.trim());
}

/** 磅单是否属于指定合同 */
export function ticketMatchesContract(
  ticket: WeighTicket,
  kind: WeighSettlementKind,
  contract: Pick<SettlementContractRef, "id" | "no">,
): boolean {
  if (!isTicketLinkedToContract(ticket, kind)) return false;
  if (kind === "purchase") {
    return ticket.contractNo.trim() === contract.no;
  }
  return ticket.saleContractId === contract.id;
}

function isEligibleBase(
  ticket: WeighTicket,
  kind: WeighSettlementKind,
  usedTicketIds: Set<string>,
): boolean {
  if (ticket.status !== "normal") return false;
  if (usedTicketIds.has(ticket.id)) return false;
  if (ticket.direction !== kind) return false;
  return isTicketLinkedToContract(ticket, kind);
}

/** 某合同下可勾选进结算单的磅单；未传 contract 时返回该方向全部可结算磅单 */
export function listEligibleTickets(opts: {
  tickets: WeighTicket[];
  kind: WeighSettlementKind;
  contract?: Pick<SettlementContractRef, "id" | "no"> | null;
  usedTicketIds: Set<string>;
  dateStart?: string;
  dateEnd?: string;
}): WeighTicket[] {
  const { tickets, kind, contract, usedTicketIds, dateStart, dateEnd } = opts;
  return tickets
    .filter((ticket) => {
      if (!isEligibleBase(ticket, kind, usedTicketIds)) return false;
      if (contract && !ticketMatchesContract(ticket, kind, contract)) return false;
      if (dateStart || dateEnd) {
        const day = ticketDateKey(ticket.date);
        if (!day) return false;
        if (dateStart && day < dateStart) return false;
        if (dateEnd && day > dateEnd) return false;
      }
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.bxNo.localeCompare(b.bxNo));
}

/** 仍有可结算磅单的合同列表 */
export function listEligibleContracts(opts: {
  kind: WeighSettlementKind;
  purchaseContracts: PurchaseContract[];
  saleContracts: SaleContract[];
  tickets: WeighTicket[];
  usedTicketIds: Set<string>;
}): SettlementContractRef[] {
  const { kind, purchaseContracts, saleContracts, tickets, usedTicketIds } = opts;

  if (kind === "purchase") {
    return purchaseContracts
      .filter((c) => c.status === "active" &&
        tickets.some(
          (t) =>
            isEligibleBase(t, "purchase", usedTicketIds) &&
            ticketMatchesContract(t, "purchase", c),
        ),
      )
      .map((c) => ({
        id: c.id,
        no: c.no,
        customerName: c.customerName,
      }))
      .sort((a, b) => a.no.localeCompare(b.no, "zh-HK"));
  }

  return saleContracts
    .filter((c) => c.status === "active" &&
        tickets.some(
          (t) =>
            isEligibleBase(t, "sale", usedTicketIds) &&
            ticketMatchesContract(t, "sale", c),
        ),
      )
      .map((c) => ({
        id: c.id,
        no: c.no,
        customerName: c.customerName,
      }))
      .sort((a, b) => a.no.localeCompare(b.no, "zh-HK"));
}

/** 从已选磅单解析结算单锚定合同（成单须同合同） */
export function resolveContractFromTickets(
  tickets: WeighTicket[],
  kind: WeighSettlementKind,
  purchaseContracts: PurchaseContract[],
  saleContracts: SaleContract[],
): SettlementContractRef | null {
  if (tickets.length === 0) return null;
  const ticket = tickets[0];
  if (kind === "purchase") {
    const no = ticket.contractNo?.trim();
    if (!no || no === "-") return null;
    const contract = purchaseContracts.find((row) => row.no === no);
    return contract
      ? { id: contract.id, no: contract.no, customerName: contract.customerName }
      : null;
  }
  const id = ticket.saleContractId?.trim();
  if (!id) return null;
  const contract = saleContracts.find((row) => row.id === id);
  return contract
    ? { id: contract.id, no: contract.no, customerName: contract.customerName }
    : null;
}
