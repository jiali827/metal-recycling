import type {
  ArApItem,
  Contract,
  Customer,
  PaymentRecord,
  WeighTicket,
} from "./types";

export type SettlementKind = "receivable" | "payable";

export interface ContractTrace {
  contract: Contract;
  customer: Customer | null;
  tickets: WeighTicket[];
  settlements: ArApItem[];
  settlementKind: SettlementKind;
  payments: PaymentRecord[];
  summary: {
    ticketCount: number;
    normalTicketCount: number;
    totalAmount: number;
    totalNetKg: number;
    settlementTotal: number;
    settledAmount: number;
    balance: number;
    fulfillmentPct: number;
  };
}

function paymentsForTicket(bxNo: string, payments: PaymentRecord[]): PaymentRecord[] {
  return payments.filter(
    (p) =>
      p.category === "settlement" &&
      (p.ticketBxNo === bxNo ||
        p.allocationSummary.toUpperCase().includes(`BX${bxNo}`.toUpperCase())),
  );
}

function paymentsForTickets(tickets: WeighTicket[], payments: PaymentRecord[]): PaymentRecord[] {
  const seen = new Set<string>();
  const result: PaymentRecord[] = [];
  for (const ticket of tickets) {
    for (const p of paymentsForTicket(ticket.bxNo, payments)) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        result.push(p);
      }
    }
  }
  return result.sort((a, b) => b.date.localeCompare(a.date));
}

export function buildContractTraces(input: {
  contracts: Contract[];
  customers: Customer[];
  weighTickets: WeighTicket[];
  receivables: ArApItem[];
  payables: ArApItem[];
  payments: PaymentRecord[];
}): ContractTrace[] {
  const { contracts, customers, weighTickets, receivables, payables, payments } = input;

  return contracts
    .map((contract) => {
      const tickets = weighTickets
        .filter((t) => t.contractNo === contract.no)
        .sort((a, b) => b.date.localeCompare(a.date) || b.bxNo.localeCompare(a.bxNo));

      const bxNos = new Set(tickets.map((t) => t.bxNo));
      const settlementKind: SettlementKind =
        contract.type === "sale" ? "receivable" : "payable";
      const pool = settlementKind === "receivable" ? receivables : payables;
      const settlements = pool.filter((s) => bxNos.has(s.ticketBxNo));

      const normalTickets = tickets.filter((t) => t.status === "normal");
      const totalAmount = normalTickets.reduce((s, t) => s + t.amount, 0);
      const totalNetKg = normalTickets.reduce((s, t) => s + t.netKg, 0);
      const settlementTotal = settlements.reduce((s, x) => s + x.amount, 0);
      const settledAmount = settlements.reduce((s, x) => s + x.settledAmount, 0);
      const balance = settlements.reduce((s, x) => s + x.balance, 0);
      const fulfillmentPct =
        contract.plannedKg > 0
          ? Math.min(100, (contract.fulfilledKg / contract.plannedKg) * 100)
          : 0;

      return {
        contract,
        customer: customers.find((c) => c.id === contract.customerId) ?? null,
        tickets,
        settlements,
        settlementKind,
        payments: paymentsForTickets(tickets, payments),
        summary: {
          ticketCount: tickets.length,
          normalTicketCount: normalTickets.length,
          totalAmount,
          totalNetKg,
          settlementTotal,
          settledAmount,
          balance,
          fulfillmentPct,
        },
      };
    })
    .sort((a, b) => {
      const createdCmp = b.contract.createdAt.localeCompare(a.contract.createdAt);
      if (createdCmp !== 0) return createdCmp;
      return b.contract.no.localeCompare(a.contract.no);
    });
}
