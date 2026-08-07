import type { PurchaseContract } from "@/entities/types";
import { normalizeCompanyAbbr } from "@/entities/tenant/company-profile";

const SERIAL_WIDTH = 3;
const PREFIX = "Q";

export { normalizeCompanyAbbr };

/**
 * 解析符合 `Q-{缩写}-{年份}-{流水}` 的采购合同编号流水号。
 * 仅当缩写与年份完全匹配时返回流水；否则返回 null。
 */
export function parsePurchaseContractSerial(
  no: string,
  abbr: string,
  year: string,
): number | null {
  const normalized = normalizeCompanyAbbr(abbr);
  if (!normalized || !/^\d{4}$/.test(year)) return null;
  const head = `${PREFIX}-${normalized}-${year}-`;
  if (!no.startsWith(head)) return null;
  const tail = no.slice(head.length);
  if (!/^\d{1,6}$/.test(tail)) return null;
  const n = Number.parseInt(tail, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * 下一采购合同编号：`Q-{公司缩写}-{年份}-{3位流水}`。
 * 流水按同缩写、同年份的现有编号最大值 +1；无匹配时从 001 起。
 */
export function nextPurchaseContractNo(
  existing: Pick<PurchaseContract, "no">[],
  opts: { abbr: string; year: string },
): string {
  const abbr = normalizeCompanyAbbr(opts.abbr);
  const year = opts.year.trim();
  if (!abbr || !/^\d{4}$/.test(year)) {
    return "";
  }
  let max = 0;
  for (const row of existing) {
    const serial = parsePurchaseContractSerial(row.no, abbr, year);
    if (serial !== null && serial > max) max = serial;
  }
  return `${PREFIX}-${abbr}-${year}-${String(max + 1).padStart(SERIAL_WIDTH, "0")}`;
}

/** 从报价日期取四位年份；无效时回退当天年份 */
export function yearFromQuotedOn(quotedOn: string, fallbackToday = ""): string {
  const y = quotedOn.trim().slice(0, 4);
  if (/^\d{4}$/.test(y)) return y;
  const fb = fallbackToday.trim().slice(0, 4);
  if (/^\d{4}$/.test(fb)) return fb;
  return String(new Date().getFullYear());
}
