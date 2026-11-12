function dateKey(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}${match[2]}${match[3]}` : "00000000";
}

/** 生成纠错批次号：RB-YYYYMMDD-NNNN。 */
export function nextCorrectionBatchNo(existingBatchIds: readonly string[], executedAt: string): string {
  const date = dateKey(executedAt);
  const prefix = `RB-${date}-`;
  let max = 0;

  for (const batchId of existingBatchIds) {
    const match = batchId.match(new RegExp(`^${prefix}(\\d{4})$`));
    if (match) max = Math.max(max, Number(match[1]));
  }

  if (max >= 9999) throw new Error("CORRECTION_BATCH_EXHAUSTED");
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}
