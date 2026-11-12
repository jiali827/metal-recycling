import { describe, expect, test } from "vitest";
import { confirmContractStatus, confirmPaymentStatus, confirmTicketStatus } from "./status";

describe("confirmation status transitions", () => {
  test("only draft contracts can be confirmed", () => {
    expect(confirmContractStatus("draft")).toBe("active");
    expect(confirmContractStatus("active")).toBeNull();
    expect(confirmContractStatus("void")).toBeNull();
  });

  test("pending tickets become normal and normal tickets stay locked", () => {
    expect(confirmTicketStatus("pending")).toBe("normal");
    expect(confirmTicketStatus("normal")).toBeNull();
    expect(confirmTicketStatus("void")).toBeNull();
  });

  test("only pending payments can be confirmed", () => {
    expect(confirmPaymentStatus("pending")).toBe("confirmed");
    expect(confirmPaymentStatus("confirmed")).toBeNull();
  });
});
