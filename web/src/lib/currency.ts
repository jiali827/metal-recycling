export const CURRENCY_OPTIONS = [
  { value: "HKD", label: "HKD · 港币" },
  { value: "CNY", label: "CNY · 人民币" },
  { value: "USD", label: "USD · 美元" },
  { value: "EUR", label: "EUR · 欧元" },
  { value: "MOP", label: "MOP · 澳门元" },
] as const;

const SYMBOLS: Record<string, string> = {
  HKD: "HK$",
  CNY: "¥",
  USD: "US$",
  EUR: "€",
  MOP: "MOP$",
};

let activeCurrency = "HKD";

export function setActiveCurrency(code: string) {
  const normalized = code.trim().toUpperCase();
  activeCurrency = normalized || "HKD";
}

export function getActiveCurrency() {
  return activeCurrency;
}

export function getCurrencySymbol(code?: string) {
  const key = (code ?? activeCurrency).trim().toUpperCase();
  return SYMBOLS[key] ?? key;
}

export function formatMoneyValue(value: number, currency?: string) {
  const symbol = getCurrencySymbol(currency);
  return `${symbol} ${value.toLocaleString("zh-HK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
