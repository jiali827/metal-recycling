import { describe, expect, it } from "vitest";
import {
  buildSettlementDocInput,
  usedTicketIdsFromDocs,
} from "./build";
import {
  isTicketLinkedToContract,
  listEligibleContracts,
  listEligibleTickets,
  resolveContractFromTickets,
  ticketMatchesContract,
} from "./eligible";
import type {
  PurchaseContract,
  SaleContract,
  WeighTicket,
} from "@/entities/types";

function baseTicket(patch: Partial<WeighTicket> & Pick<WeighTicket, "id" | "bxNo">): WeighTicket {
  return {
    direction: "purchase",
    date: "2026-07-23T10:00",
    customerCategory: "customer",
    customerName: "客户甲",
    plate: "AA1111",
    materialSummary: "PNS",
    grossKg: 1000,
    tareKg: 200,
    deductionKg: 0,
    netKg: 800,
    amount: 1000,
    contractNo: "PO-001",
    status: "normal",
    createdAt: "2026-07-23T10:00:00.000Z",
    updatedAt: "2026-07-23T10:00:00.000Z",
    ...patch,
  };
}

const purchaseContract: PurchaseContract = {
  id: "pc1",
  no: "PO-001",
  customerId: "c1",
  customerName: "客户甲",
  status: "active",
  quotedOn: "2026-07-01",
  currency: "HKD",
  lines: [],
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

const saleContract: SaleContract = {
  id: "sc1",
  no: "SC-001",
  customerId: "c1",
  customerName: "客户甲",
  status: "active",
  signedOn: "2026-07-01",
  currency: "HKD",
  lines: [],
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

describe("isTicketLinkedToContract", () => {
  it("rejects purchase ticket without contract", () => {
    expect(
      isTicketLinkedToContract(
        baseTicket({ id: "t1", bxNo: "1", contractNo: "-" }),
        "purchase",
      ),
    ).toBe(false);
    expect(
      isTicketLinkedToContract(
        baseTicket({ id: "t2", bxNo: "2", contractNo: "" }),
        "purchase",
      ),
    ).toBe(false);
  });

  it("rejects sale ticket without saleContractId", () => {
    expect(
      isTicketLinkedToContract(
        baseTicket({
          id: "t3",
          bxNo: "3",
          direction: "sale",
          contractNo: "SC-001",
          saleContractId: undefined,
        }),
        "sale",
      ),
    ).toBe(false);
  });
});

describe("listEligibleTickets", () => {
  it("excludes void and already used", () => {
    const tickets = [
      baseTicket({ id: "ok", bxNo: "1" }),
      baseTicket({ id: "void", bxNo: "2", status: "void" }),
      baseTicket({ id: "used", bxNo: "3" }),
    ];
    const rows = listEligibleTickets({
      tickets,
      kind: "purchase",
      contract: purchaseContract,
      usedTicketIds: new Set(["used"]),
    });
    expect(rows.map((r) => r.id)).toEqual(["ok"]);
  });

  it("without contract filter returns all eligible tickets for kind", () => {
    const tickets = [
      baseTicket({ id: "t1", bxNo: "1", contractNo: "PO-001" }),
      baseTicket({
        id: "t2",
        bxNo: "2",
        contractNo: "PO-002",
        customerName: "客户乙",
      }),
    ];
    const rows = listEligibleTickets({
      tickets,
      kind: "purchase",
      usedTicketIds: new Set(),
    });
    expect(rows.map((r) => r.id)).toEqual(["t1", "t2"]);
  });
});

describe("resolveContractFromTickets", () => {
  it("resolves purchase contract from ticket contractNo", () => {
    const tickets = [baseTicket({ id: "t1", bxNo: "1", contractNo: "PO-001" })];
    const ref = resolveContractFromTickets(tickets, "purchase", [purchaseContract], []);
    expect(ref).toEqual({
      id: "pc1",
      no: "PO-001",
      customerName: "客户甲",
    });
  });
});

describe("listEligibleContracts", () => {
  it("only returns contracts with eligible tickets", () => {
    const other: PurchaseContract = {
      ...purchaseContract,
      id: "pc2",
      no: "PO-002",
    };
    const tickets = [baseTicket({ id: "t1", bxNo: "1", contractNo: "PO-001" })];
    const list = listEligibleContracts({
      kind: "purchase",
      purchaseContracts: [purchaseContract, other],
      saleContracts: [saleContract],
      tickets,
      usedTicketIds: new Set(),
    });
    expect(list.map((c) => c.no)).toEqual(["PO-001"]);
  });
});

describe("buildSettlementDocInput", () => {
  it("fails when tickets span contracts", () => {
    const tickets = [
      baseTicket({ id: "t1", bxNo: "1", contractNo: "PO-001" }),
      baseTicket({ id: "t2", bxNo: "2", contractNo: "PO-002" }),
    ];
    const built = buildSettlementDocInput(tickets, {
      docDate: "2026-08-07",
      existing: [],
      usedTicketIds: new Set(),
      kind: "purchase",
      contract: {
        id: purchaseContract.id,
        no: purchaseContract.no,
        customerName: purchaseContract.customerName,
      },
    });
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.error).toBe("mixed_contract");
  });

  it("succeeds for same contract and writes anchors", () => {
    const tickets = [
      baseTicket({ id: "t1", bxNo: "1", contractNo: "PO-001" }),
      baseTicket({ id: "t2", bxNo: "2", contractNo: "PO-001", date: "2026-07-24T09:00" }),
    ];
    const built = buildSettlementDocInput(tickets, {
      docDate: "2026-08-07",
      existing: [],
      usedTicketIds: new Set(),
      kind: "purchase",
      contract: {
        id: purchaseContract.id,
        no: purchaseContract.no,
        customerName: purchaseContract.customerName,
      },
    });
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.input.contractId).toBe("pc1");
      expect(built.input.contractNo).toBe("PO-001");
      expect(built.input.ticketIds).toEqual(["t1", "t2"]);
    }
  });

  it("ticketMatchesContract for sale uses saleContractId", () => {
    const ticket = baseTicket({
      id: "s1",
      bxNo: "9",
      direction: "sale",
      contractNo: "SC-001",
      saleContractId: "sc1",
    });
    expect(ticketMatchesContract(ticket, "sale", saleContract)).toBe(true);
    expect(usedTicketIdsFromDocs([{ ticketIds: ["s1"] }]).has("s1")).toBe(true);
  });
});
