/** Dashboard date-range helpers (pure). */

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toDateKey(iso: string) {
  return iso.slice(0, 10);
}

export function parseDate(iso: string) {
  const [y, m, d] = toDateKey(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatIso(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function addDays(d: Date, n: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function startOfLocalToday() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/** 周一为一周起始 */
export function startOfWeekMon(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), diff);
}

export function endOfWeekMon(d: Date) {
  return addDays(startOfWeekMon(d), 6);
}

export function startOfMonthDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonthDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function eachDayKeys(startKey: string, endKey: string): string[] {
  let start = parseDate(startKey);
  let end = parseDate(endKey);
  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  const keys: string[] = [];
  let cur = start;
  // 防超长区间拖垮图表
  for (let i = 0; i < 93 && cur <= end; i += 1) {
    keys.push(formatIso(cur));
    cur = addDays(cur, 1);
  }
  return keys;
}

export function inDateRange(iso: string, startKey: string, endKey: string) {
  const key = toDateKey(iso);
  return key >= startKey && key <= endKey;
}

/** 日期整体平移 N 年（同比用） */
export function shiftYears(iso: string, years: number) {
  const d = parseDate(iso.slice(0, 10));
  d.setFullYear(d.getFullYear() + years);
  return formatIso(d);
}

export function pctChange(now: number, prev: number) {
  if (prev === 0) return now > 0 ? 100 : 0;
  return ((now - prev) / prev) * 100;
}

/** 由種子產生穩定的 0–1 偽隨機，避免每次渲染跳動 */
export function seededUnit(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}
