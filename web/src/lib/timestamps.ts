/** ISO 8601，精確到秒 */
export interface RecordTimestamps {
  createdAt: string;
  updatedAt: string;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function stampOnCreate<T extends object>(input: T): T & RecordTimestamps {
  const now = nowISO();
  return { ...input, createdAt: now, updatedAt: now };
}

export function stampOnUpdate<T extends RecordTimestamps>(
  row: T,
  patch: Partial<T>,
): T {
  return { ...row, ...patch, updatedAt: nowISO() };
}

/** 演示種子數據：由業務日期生成可讀的創建/更新時間 */
export function seedTimestamps(day: string, slot: number): RecordTimestamps {
  const h = 8 + (slot % 10);
  const m = (slot * 7) % 60;
  const s = (slot * 13) % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const createdAt = `${day}T${pad(h)}:${pad(m)}:${pad(s)}+08:00`;
  const updatedAt = `${day}T${pad(Math.min(h + 1, 23))}:${pad((m + 17) % 60)}:${pad((s + 29) % 60)}+08:00`;
  return { createdAt, updatedAt };
}
