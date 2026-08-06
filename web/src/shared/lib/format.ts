import { formatMoneyValue, getActiveCurrency } from "./currency";

export function formatKg(value: number): string {
  return value.toLocaleString("zh-HK", { maximumFractionDigits: 0 });
}

export function formatMoney(value: number, currency?: string): string {
  return formatMoneyValue(value, currency ?? getActiveCurrency());
}

export function formatDate(value: string): string {
  return value;
}

export function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("zh-HK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
