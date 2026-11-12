import type {
  ArApItem,
  CorrectionAuditEvent,
  CorrectionTargetType,
  PaymentRecord,
  PurchaseContract,
  SaleContract,
  WeighSettlementDoc,
  WeighTicket,
} from "@/entities/types";

export type CorrectionSource = {
  purchaseContracts: PurchaseContract[];
  saleContracts: SaleContract[];
  weighTickets: WeighTicket[];
  weighSettlementDocs: WeighSettlementDoc[];
  receivables: ArApItem[];
  payables: ArApItem[];
  payments: PaymentRecord[];
};

export type CorrectionTarget = {
  type: CorrectionTargetType;
  id: string;
};

export type CorrectionAction = {
  action:
    | "reverse_payment"
    | "restore_arap"
    | "void_arap"
    | "revoke_settlement"
    | "void_ticket"
    | "revoke_contract";
  objectType: CorrectionTargetType;
  objectId: string;
  label: string;
  previousStatus: string;
  nextStatus: string;
};

export type CorrectionImpact = {
  target: CorrectionTarget;
  actions: CorrectionAction[];
  summary: { tickets: number; settlementDocs: number; arApItems: number; payments: number };
};

export type CorrectionMeta = {
  reason: string;
  batchId: string;
  actorName: string;
  at: string;
};

export type CorrectionResult = CorrectionSource & { auditEvents: CorrectionAuditEvent[] };

function targetContract(target: CorrectionTarget, source: CorrectionSource) {
  if (target.type === "purchase-contract") {
    return source.purchaseContracts.find((row) => row.id === target.id);
  }
  if (target.type === "sale-contract") {
    return source.saleContracts.find((row) => row.id === target.id);
  }
  return undefined;
}

function contractMatchesTicket(target: CorrectionTarget, ticket: WeighTicket, source: CorrectionSource) {
  const contract = targetContract(target, source);
  if (!contract) return false;
  if (target.type === "purchase-contract") return ticket.contractNo === contract.no;
  return ticket.saleContractId === contract.id || ticket.contractNo === contract.no;
}

function contractIdForTarget(target: CorrectionTarget, source: CorrectionSource): string | undefined {
  return targetContract(target, source)?.id;
}

function collectRelated(source: CorrectionSource, target: CorrectionTarget) {
  const contractId = contractIdForTarget(target, source);
  const ticketIds = new Set<string>();
  const settlementIds = new Set<string>();

  if (target.type === "weigh-ticket") ticketIds.add(target.id);
  if (target.type === "settlement-doc") {
    const doc = source.weighSettlementDocs.find((row) => row.id === target.id);
    doc?.ticketIds.forEach((id) => ticketIds.add(id));
    settlementIds.add(target.id);
  }
  if (target.type === "payment") {
    const payment = source.payments.find((row) => row.id === target.id);
    if (payment?.settlementDocId) settlementIds.add(payment.settlementDocId);
  }
  if (target.type === "purchase-contract" || target.type === "sale-contract") {
    source.weighTickets
      .filter((row) => contractMatchesTicket(target, row, source))
      .forEach((row) => ticketIds.add(row.id));
    source.weighSettlementDocs
      .filter((row) => row.contractId === contractId)
      .forEach((row) => settlementIds.add(row.id));
  }
  source.weighSettlementDocs
    .filter((row) => row.ticketIds.some((id) => ticketIds.has(id)))
    .forEach((row) => settlementIds.add(row.id));

  const arApIds = new Set<string>();
  [...source.receivables, ...source.payables]
    .filter((row) => settlementIds.has(row.settlementDocId))
    .forEach((row) => arApIds.add(row.id));
  const paymentIds = new Set<string>();
  source.payments
    .filter((row) => row.category === "settlement" && row.settlementDocId && settlementIds.has(row.settlementDocId))
    .forEach((row) => paymentIds.add(row.id));

  return { ticketIds, settlementIds, arApIds, paymentIds };
}

function actionFor(
  action: CorrectionAction["action"],
  objectType: CorrectionTargetType,
  objectId: string,
  label: string,
  previousStatus: string,
  nextStatus: string,
): CorrectionAction {
  return { action, objectType, objectId, label, previousStatus, nextStatus };
}

export function buildCorrectionImpact(source: CorrectionSource, target: CorrectionTarget): CorrectionImpact {
  const related = collectRelated(source, target);
  const actions: CorrectionAction[] = [];
  const addPayment = (id: string) => {
    const row = source.payments.find((item) => item.id === id);
    if (row && !row.correctionStatus) {
      actions.push(actionFor("reverse_payment", "payment", id, row.settlementDocNo || row.id, "active", "reversed"));
    }
  };
  const addArAp = (id: string) => {
    const row = [...source.receivables, ...source.payables].find((item) => item.id === id);
    if (row && row.status !== "void") {
      actions.push(actionFor("void_arap", row.id.startsWith("ar") ? "receivable" : "payable", id, row.settlementDocNo, row.status, "void"));
    }
  };
  const addSettlement = (id: string) => {
    const row = source.weighSettlementDocs.find((item) => item.id === id);
    if (row && row.status !== "void") actions.push(actionFor("revoke_settlement", "settlement-doc", id, row.no, row.status, "void"));
  };
  const addTicket = (id: string) => {
    const row = source.weighTickets.find((item) => item.id === id);
    if (row && row.status !== "void") actions.push(actionFor("void_ticket", "weigh-ticket", id, `BX${row.bxNo}`, row.status, "void"));
  };

  related.paymentIds.forEach(addPayment);
  if (target.type === "payment") {
    related.arApIds.forEach((id) => {
      const row = [...source.receivables, ...source.payables].find((item) => item.id === id);
      if (row && row.status !== "void") {
        actions.push(actionFor("restore_arap", row.id.startsWith("ar") ? "receivable" : "payable", id, row.settlementDocNo, row.status, "open"));
      }
    });
  } else {
    related.arApIds.forEach(addArAp);
  }
  if (target.type !== "payment") related.settlementIds.forEach(addSettlement);
  if (target.type === "purchase-contract" || target.type === "sale-contract" || target.type === "weigh-ticket") {
    related.ticketIds.forEach(addTicket);
  }
  const contract = targetContract(target, source);
  if (contract && (contract.status as string) !== "void") {
    actions.push(actionFor("revoke_contract", target.type, contract.id, contract.no, contract.status, "void"));
  }
  return {
    target,
    actions,
    summary: {
      tickets: actions.filter((row) => row.action === "void_ticket").length,
      settlementDocs: actions.filter((row) => row.action === "revoke_settlement").length,
      arApItems: actions.filter((row) => row.action === "void_arap").length,
      payments: actions.filter((row) => row.action === "reverse_payment").length,
    },
  };
}

export function applyCorrection(source: CorrectionSource, target: CorrectionTarget, meta: CorrectionMeta): CorrectionResult {
  const impact = buildCorrectionImpact(source, target);
  const auditEvents: CorrectionAuditEvent[] = [];
  const record = (action: CorrectionAction) => {
    auditEvents.push({
      id: `${meta.batchId}-${auditEvents.length + 1}`,
      reversalBatchId: meta.batchId,
      actorName: meta.actorName,
      reason: meta.reason,
      action: action.action,
      objectType: action.objectType,
      objectId: action.objectId,
      previousStatus: action.previousStatus,
      nextStatus: action.nextStatus,
      createdAt: meta.at,
      updatedAt: meta.at,
    });
  };
  let result: CorrectionSource = {
    purchaseContracts: source.purchaseContracts.map((row) => ({ ...row })),
    saleContracts: source.saleContracts.map((row) => ({ ...row })),
    weighTickets: source.weighTickets.map((row) => ({ ...row })),
    weighSettlementDocs: source.weighSettlementDocs.map((row) => ({ ...row })),
    receivables: source.receivables.map((row) => ({ ...row })),
    payables: source.payables.map((row) => ({ ...row })),
    payments: source.payments.map((row) => ({ ...row })),
  };
  for (const action of impact.actions) {
    if (action.action === "reverse_payment") {
      result = { ...result, payments: result.payments.map((row) => row.id === action.objectId ? { ...row, correctionStatus: "reversed", voidedAt: meta.at, voidedBy: meta.actorName, voidReason: meta.reason, reversalBatchId: meta.batchId, updatedAt: meta.at } : row) };
    } else if (action.action === "restore_arap") {
      const update = (row: ArApItem) => row.id === action.objectId ? { ...row, status: "open" as const, settledAmount: 0, balance: row.amount, updatedAt: meta.at } : row;
      result = { ...result, receivables: result.receivables.map(update), payables: result.payables.map(update) };
    } else if (action.action === "void_arap") {
      const update = (row: ArApItem) => row.id === action.objectId ? { ...row, status: "void" as const, balance: 0, updatedAt: meta.at } : row;
      result = { ...result, receivables: result.receivables.map(update), payables: result.payables.map(update) };
    } else if (action.action === "revoke_settlement") {
      result = { ...result, weighSettlementDocs: result.weighSettlementDocs.map((row) => row.id === action.objectId ? { ...row, status: "void" as const, voidedAt: meta.at, voidedBy: meta.actorName, voidReason: meta.reason, reversalBatchId: meta.batchId, updatedAt: meta.at } : row) };
    } else if (action.action === "void_ticket") {
      result = { ...result, weighTickets: result.weighTickets.map((row) => row.id === action.objectId ? { ...row, status: "void" as const, voidedAt: meta.at, voidedBy: meta.actorName, voidReason: meta.reason, reversalBatchId: meta.batchId, updatedAt: meta.at } : row) };
    } else if (action.action === "revoke_contract") {
      if (action.objectType === "purchase-contract") result = { ...result, purchaseContracts: result.purchaseContracts.map((row) => row.id === action.objectId ? { ...row, status: "void" as const, voidedAt: meta.at, voidedBy: meta.actorName, voidReason: meta.reason, reversalBatchId: meta.batchId, updatedAt: meta.at } : row) };
      if (action.objectType === "sale-contract") result = { ...result, saleContracts: result.saleContracts.map((row) => row.id === action.objectId ? { ...row, status: "void" as const, voidedAt: meta.at, voidedBy: meta.actorName, voidReason: meta.reason, reversalBatchId: meta.batchId, updatedAt: meta.at } : row) };
    }
    record(action);
  }
  return { ...result, auditEvents };
}
