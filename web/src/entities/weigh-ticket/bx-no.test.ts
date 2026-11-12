import { describe, expect, it } from "vitest";
import {
  nextRetailWeighTicketBxNo,
  nextWeighTicketBxNo,
  weighDateBxPrefix,
} from "./bx-no";

describe("nextWeighTicketBxNo", () => {
  it("returns 00001 when no customer-format tickets", () => {
    expect(nextWeighTicketBxNo([])).toBe("00001");
  });

  it("ignores retail 12-digit bx numbers when computing customer serial", () => {
    expect(
      nextWeighTicketBxNo([
        { bxNo: "202612240001" },
        { bxNo: "02514" },
      ]),
    ).toBe("02515");
  });

  it("pads customer serial to 5 digits", () => {
    expect(nextWeighTicketBxNo([{ bxNo: "00009" }])).toBe("00010");
  });
});

describe("nextRetailWeighTicketBxNo", () => {
  it("starts at 0001 for a new date prefix", () => {
    expect(
      nextRetailWeighTicketBxNo([], "2026-12-24T10:30"),
    ).toBe("202612240001");
  });

  it("increments within the same date prefix", () => {
    expect(
      nextRetailWeighTicketBxNo(
        [{ bxNo: "202612240001" }, { bxNo: "202612240003" }],
        "2026-12-24",
      ),
    ).toBe("202612240004");
  });

  it("does not count other dates when computing retail serial", () => {
    expect(
      nextRetailWeighTicketBxNo(
        [{ bxNo: "202612240099" }],
        "2026-12-25T08:00",
      ),
    ).toBe("202612250001");
  });
});

describe("weighDateBxPrefix", () => {
  it("parses ISO datetime", () => {
    expect(weighDateBxPrefix("2026-08-11T12:45")).toBe("20260811");
  });

  it("parses date-only string", () => {
    expect(weighDateBxPrefix("2026-08-11")).toBe("20260811");
  });
});
