import { describe, expect, it } from "vitest";
import {
  buildAllocationSummary,
  settlementStatusFromAmounts,
  extractBxNoFromAllocation,
  formatWaiverMoney,
  paymentEffectiveSettled,
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

  // WV02/WV03/WV04：减免计入有效核销额，实收+减免达账面即结清，不产生残差
  it("counts waiver into effective settled amount (WV03/WV04)", () => {
    const items: ArApItem[] = [
      {
        id: "ar1",
        settlementDocId: "wsd1",
        settlementDocNo: "INV-1",
        customerName: "A",
        amount: 1000.4,
        settledAmount: 0,
        balance: 1000.4,
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
        amount: 1000,
        waiverAmount: 0.4,
        waiverReason: "抹零",
        counterparty: "A",
        allocationSummary: "核销 INV-1（减免 0.4）",
        settlementDocId: "wsd1",
        settlementDocNo: "INV-1",
        createdAt: "",
        updatedAt: "",
      },
    ];
    expect(paymentEffectiveSettled(payments[0])).toBe(1000.4);
    const next = syncArApFromPayments(items, payments, ["wsd1"], "receipt");
    expect(next[0].settledAmount).toBeCloseTo(1000.4, 6);
    expect(next[0].balance).toBe(0);
    expect(next[0].status).toBe("settled");
  });

  // WV08：删除/冲销核销时减免随记录回退（重新同步即回滚）
  it("rolls back waiver when payment removed (WV08)", () => {
    const items: ArApItem[] = [
      {
        id: "ar1",
        settlementDocId: "wsd1",
        settlementDocNo: "INV-1",
        customerName: "A",
        amount: 1000.4,
        settledAmount: 1000.4,
        balance: 0,
        status: "settled",
        date: "2026-08-01",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const next = syncArApFromPayments(items, [], ["wsd1"], "receipt");
    expect(next[0].settledAmount).toBe(0);
    expect(next[0].balance).toBeCloseTo(1000.4, 6);
    expect(next[0].status).toBe("open");
  });

  it("summarizes waiver in allocation text", () => {
    // 实收+减免 足额 → 核销 + 减免后缀
    expect(buildAllocationSummary("INV-1", 1000, 1000.4, 0.4)).toBe(
      "核销 INV-1（减免 0.4）",
    );
    // 部分核销（含减免仍不足额）
    expect(buildAllocationSummary("INV-1", 100, 1000.4, 0.4)).toContain("部分核销");
    // 无减免不加后缀
    expect(buildAllocationSummary("INV-1", 1000.4, 1000.4, 0)).not.toContain("减免");
  });

  it("formats waiver money without trailing zeros", () => {
    expect(formatWaiverMoney(0.4)).toBe("0.4");
    expect(formatWaiverMoney(1)).toBe("1");
    expect(formatWaiverMoney(1.25)).toBe("1.25");
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
