"use client";

import { useMemo } from "react";
import { getCurrencySymbol } from "./currency";
import { useMockStore } from "./mock-store";

export function useMoneyUnits() {
  const { tenant } = useMockStore();
  return useMemo(() => {
    const symbol = getCurrencySymbol(tenant.currency);
    return {
      money: symbol,
      moneyPerKg: `${symbol}/KG`,
      code: tenant.currency,
    };
  }, [tenant.currency]);
}
