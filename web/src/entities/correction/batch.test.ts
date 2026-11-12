import { describe, expect, it } from "vitest";
import { nextCorrectionBatchNo } from "./batch";

describe("correction batch numbers", () => {
  it("increments by tenant execution date in the RB-YYYYMMDD-NNNN format", () => {
    const existing = [
      "RB-20260825-0003",
      "RB-20260825-0001",
      "RB-20260824-0009",
      "rb-mt80bq9p-3ob0",
    ];

    expect(nextCorrectionBatchNo(existing, "2026-08-25T10:20")).toBe("RB-20260825-0004");
    expect(nextCorrectionBatchNo(existing, "2026-08-26T09:00")).toBe("RB-20260826-0001");
  });

  it("rejects a date after 9999 batches", () => {
    expect(() => nextCorrectionBatchNo(["RB-20260825-9999"], "2026-08-25T23:59")).toThrow(
      "CORRECTION_BATCH_EXHAUSTED",
    );
  });
});
