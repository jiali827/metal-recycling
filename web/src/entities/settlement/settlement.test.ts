import { describe, expect, it } from "vitest";
import {
  buildAllocationSummary,
  settlementStatusFromAmounts,
  extractBxNoFromAllocation,
  syncArApFromPayments,
} from "@/entities/settlement";
import { calcNetKg, isNetKgValid, lineWeightsMatchTicket } from "@/entities/weigh-ticket/net-kg";
import { mergeAccessMaps, BUILTIN_ROLE_ACCESS, getModuleMenuLevel } from "@/shared/config/permissions";
import type { ArApItem, PaymentRecord } from "@/entities/types";

describe("settlement", () => {
  it("builds partial vs full allocation summary", () => {
    expect(buildAllocationSummary("INV-1", 100, 200)).toContain("部分");
    expect(buildAllocationSummary("INV-1", 200, 200)).not.toContain("部分");
  });

  it("derives settlement status", () => {
    expect(settlementStatusFromAmounts(100, 0, "open")).toBe("open");
    expect(settlementStatusFromAmounts(100, 40, "open")).toBe("partial");
    expect(settlementStatusFromAmounts(100, 100, "open")).toBe("settled");
    expect(settlementStatusFromAmounts(100, 50, "void")).toBe("void");
  });

  it("extracts BX from allocation text", () => {
    expect(extractBxNoFromAllocation("核銷 BX02513")).toBe("02513");
    expect(extractBxNoFromAllocation("部分核銷 BX02474")).toBe("02474");
  });

  it("syncs AR/AP by settlementDocId", () => {
    const items: ArApItem[] = [
      {
        id: "ar1",
        settlementDocId: "wsd1",
        settlementDocNo: "INV-1",
        customerName: "A",
        amount: 100,
        settledAmount: 0,
        balance: 100,
        status: "open",
        date: "2026-08-01",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const payments: PaymentRecord[] = [
      {
        id: "p1",
        date: "2026-08-02T10:00",
        category: "settlement",
        type: "receipt",
        method: "現金",
        amount: 40,
        counterparty: "A",
        allocationSummary: "部分核销 INV-1",
        settlementDocId: "wsd1",
        settlementDocNo: "INV-1",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const next = syncArApFromPayments(items, payments, ["wsd1"], "receipt");
    expect(next[0].settledAmount).toBe(40);
    expect(next[0].balance).toBe(60);
    expect(next[0].status).toBe("partial");
  });
});

describe("net kg", () => {
  it("calculates net weight", () => {
    expect(calcNetKg(1000, 200, 10)).toBe(790);
    expect(isNetKgValid(calcNetKg(100, 200, 0))).toBe(false);
  });

  it("checks line weight sum", () => {
    expect(lineWeightsMatchTicket([100, 200], 300)).toBe(true);
    expect(lineWeightsMatchTicket([100, 200], 301)).toBe(false);
  });
});

describe("permission merge", () => {
  it("unions write over read", () => {
    const merged = mergeAccessMaps([
      BUILTIN_ROLE_ACCESS.contract,
      BUILTIN_ROLE_ACCESS.weigh,
    ]);
    expect(getModuleMenuLevel(merged, "contracts")).toBe("write");
    expect(getModuleMenuLevel(merged, "weighTickets")).toBe("write");
    expect(getModuleMenuLevel(merged, "dashboard")).toBe("none");
  });

  it("admin has write on all business modules", () => {
    const admin = BUILTIN_ROLE_ACCESS.admin;
    expect(getModuleMenuLevel(admin, "contracts")).toBe("write");
    expect(getModuleMenuLevel(admin, "weighTickets")).toBe("write");
    expect(getModuleMenuLevel(admin, "payments")).toBe("write");
    expect(getModuleMenuLevel(admin, "dashboard")).toBe("read");
    expect(getModuleMenuLevel(admin, "transactions")).toBe("read");
  });
});
