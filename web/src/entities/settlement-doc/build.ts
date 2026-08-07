import type {
  WeighSettlementDoc,
  WeighSettlementKind,
  WeighSettlementLine,
  WeighTicket,
} from "@/entities/types";
import {
  isTicketLinkedToContract,
  ticketMatchesContract,
  type SettlementContractRef,
} from "./eligible";

export type BuildSettlementError =
  | "empty"
  | "mixed_direction"
  | "mixed_customer"
  | "has_void"
  | "already_used"
  | "mixed_contract"
  | "unlinked_ticket"
  | "kind_mismatch";

export function ticketUnitPrice(ticket: WeighTicket): number {
  if (!ticket.netKg) return 0;
  return ticket.amount / ticket.netKg;
}

export function ticketDateOnly(ticket: WeighTicket): string {
  return ticket.date.slice(0, 10);
}

export function toSettlementLine(ticket: WeighTicket): WeighSettlementLine {
  return {
    ticketId: ticket.id,
    bxNo: ticket.bxNo,
    date: ticketDateOnly(ticket),
    plate: ticket.plate,
    materialSummary: ticket.materialSummary,
    grossKg: ticket.grossKg,
    deductionKg: ticket.deductionKg,
    netKg: ticket.netKg,
    unitPrice: ticketUnitPrice(ticket),
    amount: ticket.amount,
  };
}

export function validateTicketsForSettlement(
  tickets: WeighTicket[],
  usedTicketIds: Set<string>,
  opts: {
    kind: WeighSettlementKind;
    contract: SettlementContractRef;
  },
):
  | { ok: true; kind: WeighSettlementKind; customerName: string }
  | { ok: false; error: BuildSettlementError } {
  if (tickets.length === 0) return { ok: false, error: "empty" };
  if (tickets.some((t) => t.status === "void")) return { ok: false, error: "has_void" };
  if (tickets.some((t) => usedTicketIds.has(t.id))) {
    return { ok: false, error: "already_used" };
  }

  const { kind, contract } = opts;
  if (tickets.some((t) => t.direction !== kind)) {
    return { ok: false, error: "kind_mismatch" };
  }
  if (tickets.some((t) => t.direction !== tickets[0].direction)) {
    return { ok: false, error: "mixed_direction" };
  }

  const customerName = contract.customerName.trim();
  if (
    tickets.some((t) => t.customerName.trim() !== customerName) ||
    !customerName
  ) {
    return { ok: false, error: "mixed_customer" };
  }

  if (tickets.some((t) => !isTicketLinkedToContract(t, kind))) {
    return { ok: false, error: "unlinked_ticket" };
  }
  if (tickets.some((t) => !ticketMatchesContract(t, kind, contract))) {
    return { ok: false, error: "mixed_contract" };
  }

  return { ok: true, kind, customerName };
}

export function nextSettlementNo(
  kind: WeighSettlementKind,
  docDate: string,
  existing: Pick<WeighSettlementDoc, "no" | "kind">[],
): string {
  const prefix = kind === "purchase" ? "PO-BX" : "INV-BX";
  const day = docDate.replace(/-/g, "");
  const head = `${prefix}-${day}`;
  let max = 0;
  for (const row of existing) {
    if (row.kind !== kind) continue;
    if (!row.no.startsWith(head)) continue;
    const tail = row.no.slice(head.length);
    const n = Number(tail);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `${head}${String(max + 1).padStart(2, "0")}`;
}

export function buildSettlementDocInput(
  tickets: WeighTicket[],
  opts: {
    docDate: string;
    existing: Pick<WeighSettlementDoc, "no" | "kind">[];
    usedTicketIds: Set<string>;
    kind: WeighSettlementKind;
    contract: SettlementContractRef;
    /** 编辑时保留单号与状态，不重新编号 */
    preserve?: Pick<WeighSettlementDoc, "no" | "status">;
  },
):
  | {
      ok: true;
      input: Omit<WeighSettlementDoc, "id" | "createdAt" | "updatedAt">;
    }
  | { ok: false; error: BuildSettlementError } {
  const checked = validateTicketsForSettlement(tickets, opts.usedTicketIds, {
    kind: opts.kind,
    contract: opts.contract,
  });
  if (!checked.ok) return checked;

  const ordered = [...tickets].sort(
    (a, b) => a.date.localeCompare(b.date) || a.bxNo.localeCompare(b.bxNo),
  );
  const lines = ordered.map(toSettlementLine);
  const totalNetKg = lines.reduce((s, l) => s + l.netKg, 0);
  const totalAmount = lines.reduce((s, l) => s + l.amount, 0);

  return {
    ok: true,
    input: {
      no: opts.preserve?.no ?? nextSettlementNo(checked.kind, opts.docDate, opts.existing),
      kind: checked.kind,
      customerName: checked.customerName,
      contractId: opts.contract.id,
      contractNo: opts.contract.no,
      docDate: opts.docDate,
      status: opts.preserve?.status ?? "pending",
      ticketIds: ordered.map((t) => t.id),
      lines,
      totalNetKg,
      totalAmount,
    },
  };
}

export function usedTicketIdsFromDocs(
  docs: Pick<WeighSettlementDoc, "ticketIds">[],
  /** 编辑时排除本单据已占用的磅单，允许重新勾选 */
  excludeDocTicketIds?: Iterable<string>,
): Set<string> {
  const exclude = new Set(excludeDocTicketIds ?? []);
  const set = new Set<string>();
  for (const doc of docs) {
    for (const id of doc.ticketIds) {
      if (!exclude.has(id)) set.add(id);
    }
  }
  return set;
}
