import type { Customer } from "@/entities/types";

const CUSTOMER_NO_WIDTH = 5;
const CUSTOMER_NO_PREFIX = "C-";

function parseCustomerSerial(customerNo: string): number | null {
  const digits = customerNo.replace(/\D/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : null;
}

/** 取当前客户最大流水号 +1，格式化为 C-00001 */
export function nextCustomerNo(customers: Pick<Customer, "customerNo">[]): string {
  let max = 0;
  for (const customer of customers) {
    const serial = parseCustomerSerial(customer.customerNo);
    if (serial !== null && serial > max) max = serial;
  }
  return `${CUSTOMER_NO_PREFIX}${String(max + 1).padStart(CUSTOMER_NO_WIDTH, "0")}`;
}
