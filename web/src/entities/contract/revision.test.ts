import { describe, expect, it } from "vitest";
import {
  buildContractRevision,
  contractHasActiveWeighings,
  diffPurchaseContract,
  diffSaleContract,
} from "@/entities/contract/revision";
import { translate } from "@/shared/i18n/translate";
import type { MessageKey } from "@/shared/i18n/types";
import type { PurchaseContract, SaleContract, WeighTicket } from "@/entities/types";

const t = (key: MessageKey) => translate("zh-Hans", key);

function makePurchase(): PurchaseContract {
  return {
    id: "pc1",
    no: "Q-BX-2026-001",
    customerId: "c1",
    customerName: "甲公司",
    status: "active",
    quotedOn: "2026-11-01",
    validUntil: "2026-12-31",
    currency: "HKD",
    createdAt: "2026-11-01T09:00",
    updatedAt: "2026-11-01T09:00",
    lines: [
      { id: "l1", materialName: "紫铜", priceMode: "ex_yard", unitPrice: 2.3 },
      { id: "l2", materialName: "黄铜", priceMode: "ex_yard", unitPrice: 1.8 },
    ],
  };
}

function makeSale(): SaleContract {
  return {
    id: "sc1",
    no: "S-BX-2026-001",
    customerId: "c2",
    customerName: "乙公司",
    status: "active",
    signedOn: "2026-11-02",
    currency: "HKD",
    createdAt: "2026-11-02T09:00",
    updatedAt: "2026-11-02T09:00",
    lines: [
      {
        id: "s1",
        materialName: "铝料",
        plannedQty: 1000,
        qtyUnit: "kg",
        unitPrice: 5,
        fulfilledQty: 0,
      },
    ],
  };
}

describe("diffPurchaseContract", () => {
  it("detects line unit price change (PD10 改价主路径)", () => {
    const before = makePurchase();
    const changes = diffPurchaseContract(
      before,
      {
        customerName: before.customerName,
        contactName: "",
        project: "",
        quotedOn: before.quotedOn,
        validUntil: before.validUntil ?? "",
        remarks: "",
        lines: before.lines.map((l) =>
          l.id === "l1" ? { ...l, unitPrice: 2.25 } : { ...l },
        ),
      },
      t,
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe("line.l1.unitPrice");
    expect(changes[0].from).toBe("2.30");
    expect(changes[0].to).toBe("2.25");
    expect(changes[0].label).toContain("紫铜");
  });

  it("detects scalar change (有效期)", () => {
    const before = makePurchase();
    const changes = diffPurchaseContract(
      before,
      {
        customerName: before.customerName,
        contactName: "",
        project: "",
        quotedOn: before.quotedOn,
        validUntil: "2027-01-15",
        remarks: "",
        lines: before.lines.map((l) => ({ ...l })),
      },
      t,
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe("validUntil");
    expect(changes[0].from).toBe("2026-12-31");
    expect(changes[0].to).toBe("2027-01-15");
  });

  it("returns empty when nothing changed", () => {
    const before = makePurchase();
    const changes = diffPurchaseContract(
      before,
      {
        customerName: before.customerName,
        contactName: "",
        project: "",
        quotedOn: before.quotedOn,
        validUntil: before.validUntil ?? "",
        remarks: "",
        lines: before.lines.map((l) => ({ ...l })),
      },
      t,
    );
    expect(changes).toHaveLength(0);
  });
});

describe("diffSaleContract", () => {
  it("detects planned qty change", () => {
    const before = makeSale();
    const changes = diffSaleContract(
      before,
      {
        customerName: before.customerName,
        paymentTerms: "",
        fulfillBy: "",
        signedOn: before.signedOn,
        lines: before.lines.map((l) =>
          l.id === "s1" ? { ...l, plannedQty: 1200 } : { ...l },
        ),
      },
      t,
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe("line.s1.plannedQty");
    expect(changes[0].from).toBe("1000.00");
    expect(changes[0].to).toBe("1200.00");
  });

  it("formats empty values as —", () => {
    const before = makeSale();
    const changes = diffSaleContract(
      before,
      {
        customerName: before.customerName,
        paymentTerms: "月结30天",
        fulfillBy: "",
        signedOn: before.signedOn,
        lines: before.lines.map((l) => ({ ...l })),
      },
      t,
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe("paymentTerms");
    expect(changes[0].from).toBe("—");
    expect(changes[0].to).toBe("月结30天");
  });
});

describe("buildContractRevision", () => {
  it("trims reason and stamps operator/time (PD10 留痕)", () => {
    const rev = buildContractRevision(
      [{ field: "validUntil", label: "有效期至", from: "A", to: "B" }],
      "  单价按现场议价调整  ",
      "演示用户",
    );
    expect(rev.reason).toBe("单价按现场议价调整");
    expect(rev.revisedBy).toBe("演示用户");
    expect(rev.revisedAt).toBeTruthy();
    expect(rev.changes).toHaveLength(1);
    expect(rev.id).toMatch(/^rev-/);
  });
});

describe("contractHasActiveWeighings", () => {
  function makeTicket(overrides: Partial<WeighTicket> = {}): WeighTicket {
    return {
      id: "wt1",
      bxNo: "BX-001",
      direction: "purchase",
      date: "2026-11-10T10:00",
      customerCategory: "customer",
      customerName: "甲公司",
      plate: "KA1234",
      materialSummary: "紫铜",
      grossKg: 1000,
      tareKg: 200,
      deductionKg: 0,
      netKg: 800,
      amount: 1840,
      contractNo: "Q-BX-2026-001",
      status: "normal",
      createdAt: "2026-11-10T10:00",
      updatedAt: "2026-11-10T10:00",
      ...overrides,
    };
  }

  it("purchase: matches by contractNo text", () => {
    const tickets = [makeTicket()];
    expect(contractHasActiveWeighings(tickets, "purchase", { id: "pc1", no: "Q-BX-2026-001" })).toBe(true);
    expect(contractHasActiveWeighings(tickets, "purchase", { id: "pc1", no: " Q-BX-2026-001 " })).toBe(true);
    expect(contractHasActiveWeighings(tickets, "purchase", { id: "pc2", no: "Q-BX-2026-002" })).toBe(false);
  });

  it("sale: matches by saleContractId", () => {
    const tickets = [makeTicket({ saleContractId: "sc1" })];
    expect(contractHasActiveWeighings(tickets, "sale", { id: "sc1", no: "S-BX-2026-001" })).toBe(true);
    expect(contractHasActiveWeighings(tickets, "sale", { id: "sc2", no: "S-BX-2026-001" })).toBe(false);
  });

  it("ignores voided tickets", () => {
    const tickets = [
      makeTicket({ voidedAt: "2026-11-11T09:00", status: "void" }),
      makeTicket({ id: "wt2", voidedAt: "2026-11-11T09:05" }),
    ];
    expect(contractHasActiveWeighings(tickets, "purchase", { id: "pc1", no: "Q-BX-2026-001" })).toBe(false);
  });

  it("returns false for empty tickets", () => {
    expect(contractHasActiveWeighings([], "purchase", { id: "pc1", no: "Q-BX-2026-001" })).toBe(false);
  });
});
