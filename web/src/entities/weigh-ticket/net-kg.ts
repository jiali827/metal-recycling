/** 过磅净重计算（与业务规则 W01 对齐） */
export function calcNetKg(grossKg: number, tareKg: number, deductionKg: number): number {
  const net = Number(grossKg) - Number(tareKg) - Math.abs(Number(deductionKg) || 0);
  return net;
}

export function isNetKgValid(netKg: number): boolean {
  return Number.isFinite(netKg) && netKg >= 0;
}

/** 多货类行净重之和是否等于本单净重（容差默认 1e-6） */
export function lineWeightsMatchTicket(
  lineNetKgs: number[],
  ticketNetKg: number,
  epsilon = 1e-6,
): boolean {
  const sum = lineNetKgs.reduce((s, n) => s + (Number(n) || 0), 0);
  return Math.abs(sum - ticketNetKg) <= epsilon;
}
