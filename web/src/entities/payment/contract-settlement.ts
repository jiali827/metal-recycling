import type {
  ArApItem,
  Customer,
  PaymentType,
  PurchaseContract,
  SaleContract,
  WeighTicket,
} from "@/entities/types";

type ContractWithCustomer = {
  customerId: string;
  customerName: string;
};

export function paymentContractsForType(
  type: PaymentType,
  saleContracts: SaleContract[],
  purchaseContracts: PurchaseContract[],
): Array<SaleContract | PurchaseContract> {
  return type === "receipt" ? saleContracts : purchaseContracts;
}

export function contractOptionLabel(contract: { no: string; customerName: string }): string {
  return `${contract.no} · ${contract.customerName}`;
}

export function customerIdFromName(
  customerName: string,
  customers: Customer[],
): string | undefined {
  const name = customerName.trim();
  if (!name) return undefined;
  return customers.find((c) => c.name === name)?.id;
}

/** 客户主档名称 + 合同冗余名称，用于往来筛选 */
export function customerNameAliases(
  customerName: string,
  customers: Customer[],
  contracts: ContractWithCustomer[],
): Set<string> {
  const aliases = new Set<string>();
  const name = customerName.trim();
  if (!name) return aliases;
  aliases.add(name);
  const customer = customers.find((c) => c.name === name);
  if (customer) {
    aliases.add(customer.name);
    for (const contract of contracts) {
      if (contract.customerId === customer.id) aliases.add(contract.customerName);
    }
  }
  return aliases;
}

export function counterpartyForContract(
  contract: ContractWithCustomer,
  customers: Customer[],
): string {
  return customers.find((c) => c.id === contract.customerId)?.name ?? contract.customerName;
}

export function weighTicketsForContract(
  contractNo: string,
  type: PaymentType,
  tickets: WeighTicket[],
  saleContracts: SaleContract[],
): WeighTicket[] {
  if (!contractNo) return [];
  const saleContract = saleContracts.find((c) => c.no === contractNo);
  return tickets.filter((ticket) => {
    if (ticket.status !== "normal") return false;
    if (type === "receipt") {
      return (
        ticket.direction === "sale" &&
        (ticket.contractNo === contractNo ||
          (saleContract ? ticket.saleContractId === saleContract.id : false))
      );
    }
    return ticket.direction === "purchase" && ticket.contractNo === contractNo;
  });
}

export function contractNoFromTicket(
  bxNo: string,
  type: PaymentType,
  tickets: WeighTicket[],
  saleContracts: SaleContract[],
): string {
  const ticket = tickets.find((row) => row.bxNo === bxNo);
  if (!ticket) return "";
  if (type === "receipt") {
    if (ticket.contractNo && ticket.contractNo !== "-") return ticket.contractNo;
    const saleContract = saleContracts.find((c) => c.id === ticket.saleContractId);
    return saleContract?.no ?? "";
  }
  return ticket.contractNo && ticket.contractNo !== "-" ? ticket.contractNo : "";
}

export function customerNameForContract(
  contractNo: string,
  type: PaymentType,
  saleContracts: SaleContract[],
  purchaseContracts: PurchaseContract[],
): string {
  const pool = paymentContractsForType(type, saleContracts, purchaseContracts);
  return pool.find((c) => c.no === contractNo)?.customerName ?? "";
}

export function filterContractsByCustomer<T extends ContractWithCustomer>(
  contracts: T[],
  customerName: string,
  customers: Customer[],
): T[] {
  const name = customerName.trim();
  if (!name) return contracts;
  const customerId = customerIdFromName(name, customers);
  if (customerId) {
    return contracts.filter((c) => c.customerId === customerId);
  }
  return contracts.filter((c) => c.customerName === name);
}

export function contractMatchesCustomer(
  contractNo: string,
  customerName: string,
  type: PaymentType,
  saleContracts: SaleContract[],
  purchaseContracts: PurchaseContract[],
  customers: Customer[],
): boolean {
  if (!customerName.trim() || !contractNo) return true;
  const pool = paymentContractsForType(type, saleContracts, purchaseContracts);
  const contract = pool.find((c) => c.no === contractNo);
  if (!contract) return false;
  const customerId = customerIdFromName(customerName, customers);
  if (customerId) return contract.customerId === customerId;
  return contract.customerName === customerName.trim();
}

export function filterSettlementsByCustomer(
  items: ArApItem[],
  customerName: string,
  customers: Customer[],
  contracts: ContractWithCustomer[],
): ArApItem[] {
  const name = customerName.trim();
  if (!name) return items;
  const aliases = customerNameAliases(name, customers, contracts);
  return items.filter((item) => aliases.has(item.customerName));
}

export function filterSettlementsByContract(
  items: ArApItem[],
  contractNo: string,
): ArApItem[] {
  if (!contractNo) return items;
  return items.filter((item) => item.contractNo === contractNo);
}

/** 已选合同时，磅单须属于该合同；未选合同时恒为 true */
export function ticketMatchesContract(
  bxNo: string,
  contractNo: string,
  type: PaymentType,
  tickets: WeighTicket[],
  saleContracts: SaleContract[],
): boolean {
  if (!contractNo || !bxNo) return true;
  return weighTicketsForContract(contractNo, type, tickets, saleContracts).some(
    (ticket) => ticket.bxNo === bxNo,
  );
}

export function buildSettlementAllocationSummary(input: {
  settlementDocNo?: string;
  contractNo?: string;
  payAmount: number;
  arApAmount?: number;
}): string {
  const { settlementDocNo, contractNo, payAmount, arApAmount } = input;
  if (settlementDocNo) {
    const total = arApAmount ?? payAmount;
    if (payAmount > 0 && payAmount < total) {
      return `部分核销 ${settlementDocNo}`;
    }
    return `核销 ${settlementDocNo}`;
  }
  if (contractNo) return `合同 ${contractNo}`;
  return "-";
}
