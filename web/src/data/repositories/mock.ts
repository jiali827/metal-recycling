/**
 * Mock Repository 适配：字段名对齐 `useMockStore()`（采购/销售合同分拆）。
 * 业务联动仍由 store 内部处理；本层不改变行为。
 *
 * 注意：页面尚未注入/使用本层；仅作接 API 前的骨架，避免误用旧 `contracts` 假字段。
 */

import type { AppRepositories } from "./types";

/** 与 useMockStore() 返回值结构兼容的最小类型 */
export type MockStoreSlice = {
  purchaseContracts: ReturnType<AppRepositories["contracts"]["listPurchase"]>;
  saleContracts: ReturnType<AppRepositories["contracts"]["listSale"]>;
  weighTickets: ReturnType<AppRepositories["weighTickets"]["list"]>;
  payments: ReturnType<AppRepositories["payments"]["list"]>;
  receivables: ReturnType<AppRepositories["settlements"]["listReceivables"]>;
  payables: ReturnType<AppRepositories["settlements"]["listPayables"]>;
  customers: ReturnType<AppRepositories["customers"]["list"]>;
  materialTypes: ReturnType<AppRepositories["materialTypes"]["list"]>;
  employees: ReturnType<AppRepositories["employees"]["list"]>;
  roles: ReturnType<AppRepositories["roles"]["list"]>;
  addPurchaseContract: AppRepositories["contracts"]["createPurchase"];
  addSaleContract: AppRepositories["contracts"]["createSale"];
  updatePurchaseContract: AppRepositories["contracts"]["updatePurchase"];
  updateSaleContract: AppRepositories["contracts"]["updateSale"];
  removePurchaseContract: AppRepositories["contracts"]["removePurchase"];
  removeSaleContract: AppRepositories["contracts"]["removeSale"];
  addWeighTicket: AppRepositories["weighTickets"]["create"];
  updateWeighTicket: AppRepositories["weighTickets"]["update"];
  removeWeighTicket: AppRepositories["weighTickets"]["remove"];
  addPayment: AppRepositories["payments"]["create"];
  updatePayment: AppRepositories["payments"]["update"];
  removePayment: AppRepositories["payments"]["remove"];
  addCustomer: AppRepositories["customers"]["create"];
  updateCustomer: AppRepositories["customers"]["update"];
  removeCustomer: AppRepositories["customers"]["remove"];
  addMaterialType: AppRepositories["materialTypes"]["create"];
  updateMaterialType: AppRepositories["materialTypes"]["update"];
  removeMaterialType: AppRepositories["materialTypes"]["remove"];
  addEmployee: AppRepositories["employees"]["create"];
  updateEmployee: AppRepositories["employees"]["update"];
  removeEmployee: AppRepositories["employees"]["remove"];
  addRole: AppRepositories["roles"]["create"];
  updateRole: AppRepositories["roles"]["update"];
  removeRole: AppRepositories["roles"]["remove"];
};

export function createMockRepositories(store: MockStoreSlice): AppRepositories {
  return {
    contracts: {
      listPurchase: () => store.purchaseContracts,
      listSale: () => store.saleContracts,
      getPurchaseById: (id) => store.purchaseContracts.find((c) => c.id === id),
      getSaleById: (id) => store.saleContracts.find((c) => c.id === id),
      createPurchase: (input) => store.addPurchaseContract(input),
      createSale: (input) => store.addSaleContract(input),
      updatePurchase: (id, patch) => store.updatePurchaseContract(id, patch),
      updateSale: (id, patch) => store.updateSaleContract(id, patch),
      removePurchase: (id) => store.removePurchaseContract(id),
      removeSale: (id) => store.removeSaleContract(id),
    },
    weighTickets: {
      list: () => store.weighTickets,
      getById: (id) => store.weighTickets.find((t) => t.id === id),
      create: (input) => store.addWeighTicket(input),
      update: (id, patch) => store.updateWeighTicket(id, patch),
      remove: (id) => store.removeWeighTicket(id),
    },
    payments: {
      list: () => store.payments,
      create: (input) => store.addPayment(input),
      update: (id, patch) => store.updatePayment(id, patch),
      remove: (id) => store.removePayment(id),
    },
    settlements: {
      listReceivables: () => store.receivables,
      listPayables: () => store.payables,
    },
    customers: {
      list: () => store.customers,
      create: (input) => store.addCustomer(input),
      update: (id, patch) => store.updateCustomer(id, patch),
      remove: (id) => store.removeCustomer(id),
    },
    materialTypes: {
      list: () => store.materialTypes,
      create: (input) => store.addMaterialType(input),
      update: (id, patch) => store.updateMaterialType(id, patch),
      remove: (id) => store.removeMaterialType(id),
    },
    employees: {
      list: () => store.employees,
      create: (input) => store.addEmployee(input),
      update: (id, patch) => store.updateEmployee(id, patch),
      remove: (id) => store.removeEmployee(id),
    },
    roles: {
      list: () => store.roles,
      create: (input) => store.addRole(input),
      update: (id, patch) => store.updateRole(id, patch),
      remove: (id) => store.removeRole(id),
    },
  };
}
