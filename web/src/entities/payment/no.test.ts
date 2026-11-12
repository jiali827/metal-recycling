import { describe, expect, it } from "vitest";
import { ensurePaymentNos, nextPaymentNo } from "./no";

describe("payment numbering", () => {
  it("uses the business date and increments the same-day serial", () => {
    const rows = [
      { date: "2026-08-24T10:00", paymentNo: "202608240003" },
      { date: "2026-08-24T11:00", paymentNo: "202608240001" },
      { date: "2026-08-23T09:00", paymentNo: "202608230009" },
    ];

    expect(nextPaymentNo(rows, "2026-08-24T15:30")).toBe("202608240004");
    expect(nextPaymentNo(rows, "2026-08-25T09:00")).toBe("202608250001");
  });

  it("fills missing historical numbers without changing existing ones", () => {
    const rows = ensurePaymentNos([
      { id: "p1", date: "2026-08-24T10:00" },
      { id: "p2", date: "2026-08-24T11:00", paymentNo: "202608240005" },
      { id: "p3", date: "2026-08-24T12:00" },
    ]);

    expect(rows.map((row) => row.paymentNo)).toEqual([
      "202608240001",
      "202608240005",
      "202608240006",
    ]);
  });
});
