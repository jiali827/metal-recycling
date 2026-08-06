import type { ArApItem } from "./types";

export type CustomerSettleStatus = "none" | "open" | "partial" | "settled";

export type CustomerSettlement = {
  arBalance: number;
  apBalance: number;
  arAmount: number;
  apAmount: number;
  arSettled: number;
  apSettled: number;
  status: CustomerSettleStatus;
};

function activeItems(list: ArApItem[]) {
  return list.filter((item) => item.status !== "void");
}

/** 按客户名汇总应收/应付余额与结清状态 */
export function buildCustomerSettlementMap(
  receivables: ArApItem[],
  payables: ArApItem[],
): Map<string, CustomerSettlement> {
  const map = new Map<string, CustomerSettlement>();

  function ensure(name: string): CustomerSettlement {
    let row = map.get(name);
    if (!row) {
      row = {
        arBalance: 0,
        apBalance: 0,
        arAmount: 0,
        apAmount: 0,
        arSettled: 0,
        apSettled: 0,
        status: "none",
      };
      map.set(name, row);
    }
    return row;
  }

  for (const item of activeItems(receivables)) {
    const row = ensure(item.customerName);
    row.arBalance += item.balance;
    row.arAmount += item.amount;
    row.arSettled += item.settledAmount;
  }
  for (const item of activeItems(payables)) {
    const row = ensure(item.customerName);
    row.apBalance += item.balance;
    row.apAmount += item.amount;
    row.apSettled += item.settledAmount;
  }

  for (const row of map.values()) {
    const hasItems = row.arAmount > 0 || row.apAmount > 0;
    if (!hasItems) {
      row.status = "none";
      continue;
    }
    const openBal = row.arBalance + row.apBalance;
    const settled = row.arSettled + row.apSettled;
    if (openBal <= 1e-9) row.status = "settled";
    else if (settled <= 1e-9) row.status = "open";
    else row.status = "partial";
  }

  return map;
}

export function getCustomerSettlement(
  map: Map<string, CustomerSettlement>,
  customerName: string,
): CustomerSettlement {
  return (
    map.get(customerName) ?? {
      arBalance: 0,
      apBalance: 0,
      arAmount: 0,
      apAmount: 0,
      arSettled: 0,
      apSettled: 0,
      status: "none",
    }
  );
}

export function summarizeSettlements(
  map: Map<string, CustomerSettlement>,
  customerNames: string[],
) {
  let arBalance = 0;
  let apBalance = 0;
  let unsettledCustomers = 0;
  let settledCustomers = 0;
  let openCustomers = 0;
  let partialCustomers = 0;
  let noneCustomers = 0;
  for (const name of customerNames) {
    const row = getCustomerSettlement(map, name);
    arBalance += row.arBalance;
    apBalance += row.apBalance;
    if (row.status === "open" || row.status === "partial") {
      unsettledCustomers += 1;
    }
    if (row.status === "settled") settledCustomers += 1;
    else if (row.status === "open") openCustomers += 1;
    else if (row.status === "partial") partialCustomers += 1;
    else noneCustomers += 1;
  }
  return {
    arBalance,
    apBalance,
    unsettledCustomers,
    settledCustomers,
    openCustomers,
    partialCustomers,
    noneCustomers,
  };
}
