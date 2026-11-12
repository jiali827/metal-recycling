import type { WeighTicket } from "@/entities/types";

const BX_CUSTOMER_SERIAL_WIDTH = 5;
const BX_RETAIL_SERIAL_WIDTH = 4;
const BX_RETAIL_TOTAL_LENGTH = 12;

/** 客户大类「客户」：纯 5 位数字流水号 */
function isCustomerBxNo(bxNo: string): boolean {
  return /^\d{5}$/.test(bxNo.trim());
}

/** 散户：年月日 8 位 + 4 位流水，共 12 位数字 */
function isRetailBxNo(bxNo: string): boolean {
  const normalized = bxNo.trim();
  return /^\d{12}$/.test(normalized);
}

/** 从过磅时间解析 YYYYMMDD 前缀 */
export function weighDateBxPrefix(weighDate: string): string {
  const match = weighDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}${match[2]}${match[3]}`;
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** 客户大类「客户」：取当前最大 5 位流水 +1 */
export function nextWeighTicketBxNo(
  tickets: Pick<WeighTicket, "bxNo">[],
): string {
  let max = 0;
  for (const ticket of tickets) {
    const bx = ticket.bxNo.trim();
    if (!isCustomerBxNo(bx)) continue;
    const serial = Number.parseInt(bx, 10);
    if (serial > max) max = serial;
  }
  return String(max + 1).padStart(BX_CUSTOMER_SERIAL_WIDTH, "0");
}

/** 散户：按过磅日期的 YYYYMMDD + 4 位当日流水 +1 */
export function nextRetailWeighTicketBxNo(
  tickets: Pick<WeighTicket, "bxNo">[],
  weighDate: string,
): string {
  const prefix = weighDateBxPrefix(weighDate);
  let max = 0;
  for (const ticket of tickets) {
    const bx = ticket.bxNo.trim();
    if (!isRetailBxNo(bx) || !bx.startsWith(prefix)) continue;
    const serial = Number.parseInt(bx.slice(8), 10);
    if (Number.isFinite(serial) && serial > max) max = serial;
  }
  return `${prefix}${String(max + 1).padStart(BX_RETAIL_SERIAL_WIDTH, "0")}`;
}

export function isWeighBxNoTaken(
  tickets: Pick<WeighTicket, "id" | "bxNo">[],
  bxNo: string,
  excludeId?: string,
): boolean {
  const normalized = bxNo.trim();
  if (!normalized) return false;
  return tickets.some(
    (ticket) => ticket.id !== excludeId && ticket.bxNo.trim() === normalized,
  );
}
