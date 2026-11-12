import { describe, expect, test } from "vitest";
import { buildCorrectionImpact, applyCorrection } from "./reverse";
import type {
  ArApItem,
  PaymentRecord,
  PurchaseContract,
  WeighSettlementDoc,
  WeighTicket,
} from "@/entities/types";

const at = "2026-08-24T10:00";

const purchaseContract: PurchaseContract = {
  id: "pc-1",
  no: "Q-BX-2026-001",
  customerId: "c-1",
  customerName: "甲公司",
  status: "active",
  quotedOn: "2026-08-01",
  currency: "HKD",
  lines: [],
  createdAt: at,
  updatedAt: at,
};

const ticket: WeighTicket = {
  id: "wt-1",
  bxNo: "BX-001",
  direction: "purchase",
  date: at,
  customerCategory: "customer",
  customerName: "甲公司",
  plate: "AB1234",
  materialSummary: "铁料",
  grossKg: 1000,
  tareKg: 100,
  deductionKg: 0,
  netKg: 900,
  amount: 9000,
  contractNo: purchaseContract.no,
  status: "normal",
  createdAt: at,
  updatedAt: at,
};

const settlement: WeighSettlementDoc = {
  id: "ws-1",
  no: "PS-001",
  kind: "purchase",
  customerName: "甲公司",
  contractId: purchaseContract.id,
  contractNo: purchaseContract.no,
  docDate: "2026-08-02",
  status: "confirmed",
  ticketIds: [ticket.id],
  lines: [],
  totalNetKg: 900,
  totalAmount: 9000,
  createdAt: at,
  updatedAt: at,
};

const payable: ArApItem = {
  id: "ap-1",
  settlementDocId: settlement.id,
  settlementDocNo: settlement.no,
  customerName: "甲公司",
  contractId: purchaseContract.id,
  contractNo: purchaseContract.no,
  amount: 9000,
  settledAmount: 9000,
  balance: 0,
  status: "settled",
  date: "2026-08-02",
  createdAt: at,
  updatedAt: at,
};

const payment: PaymentRecord = {
  id: "p-1",
  date: at,
  category: "settlement",
  type: "payment",
  method: "现金",
  amount: 9000,
  counterparty: "甲公司",
  allocationSummary: "核销 PS-001",
  settlementDocId: settlement.id,
  settlementDocNo: settlement.no,
  contractNo: purchaseContract.no,
  createdAt: at,
  updatedAt: at,
};

const source = {
  purchaseContracts: [purchaseContract],
  saleContracts: [],
  weighTickets: [ticket],
  weighSettlementDocs: [settlement],
  receivables: [],
  payables: [payable],
  payments: [payment],
};

describe("correction reverse chain", () => {
  test("contract impact includes downstream ticket, settlement, payable, and payment", () => {
    const impact = buildCorrectionImpact(source, { type: "purchase-contract", id: "pc-1" });

    expect(impact.summary).toEqual({ tickets: 1, settlementDocs: 1, arApItems: 1, payments: 1 });
    expect(impact.actions.map((action) => action.action)).toEqual([
      "reverse_payment",
      "void_arap",
      "revoke_settlement",
      "void_ticket",
      "revoke_contract",
    ]);
  });

  test("reversing a settlement leaves its source ticket normal", () => {
    const result = applyCorrection(source, { type: "settlement-doc", id: "ws-1" }, {
      reason: "结算金额录入错误",
      batchId: "rb-1",
      actorName: "超级管理员",
      at,
    });

    expect(result.weighTickets[0].status).toBe("normal");
    expect(result.weighSettlementDocs[0].status).toBe("void");
    expect(result.weighSettlementDocs[0].voidReason).toBe("结算金额录入错误");
    expect(result.payables[0].status).toBe("void");
    expect(result.payments[0].correctionStatus).toBe("reversed");
    expect(result.payments[0].voidReason).toBe("结算金额录入错误");
  });

  test("reversing a settlement payment targets only its allocation chain", () => {
    const impact = buildCorrectionImpact(source, { type: "payment", id: "p-1" });
    expect(impact.actions.map((action) => action.action)).toEqual([
      "reverse_payment",
      "restore_arap",
    ]);
  });

  test("reversing a contract voids all affected business records without deleting history", () => {
    const result = applyCorrection(source, { type: "purchase-contract", id: "pc-1" }, {
      reason: "合同客户录入错误",
      batchId: "rb-1",
      actorName: "超级管理员",
      at,
    });

    expect(result.purchaseContracts).toHaveLength(1);
    expect(result.purchaseContracts[0].status).toBe("void");
    expect(result.purchaseContracts[0].voidReason).toBe("合同客户录入错误");
    expect(result.weighTickets[0].status).toBe("void");
    expect(result.weighTickets[0].voidReason).toBe("合同客户录入错误");
    expect(result.weighSettlementDocs[0].status).toBe("void");
    expect(result.payables[0].status).toBe("void");
    expect(result.payments[0].correctionStatus).toBe("reversed");
    expect(result.auditEvents).toHaveLength(5);
  });
});
