import type { WeighTicket } from "@/entities/types";

const BX_SERIAL_WIDTH = 5;

function parseBxSerial(bxNo: string): number | null {
  const digits = bxNo.replace(/\D/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : null;
}

/** 取当前磅单最大流水号 +1，格式化为 5 位数字（如 02514） */
export function nextWeighTicketBxNo(
  tickets: Pick<WeighTicket, "bxNo">[],
): string {
  let max = 0;
  for (const ticket of tickets) {
    const serial = parseBxSerial(ticket.bxNo);
    if (serial !== null && serial > max) max = serial;
  }
  return String(max + 1).padStart(BX_SERIAL_WIDTH, "0");
}
