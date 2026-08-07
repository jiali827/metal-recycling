/**
 * 数据访问边界（Mock 阶段预留骨架）
 *
 * 目标：features / app 日后不直接依赖 MockStore 细节，
 * 将 `createMockRepositories(store)` 换成 `createHttpRepositories(client)`。
 *
 * 当前状态：
 * - 接口字段已对齐 store（采购/销售合同分拆）
 * - **页面尚未切换到 Repository**，仍直接 `useMockStore()`
 * - 请勿在未完成接入前把页面改成调用本层（避免半接入状态）
 */

import type {
  ArApItem,
  Customer,
  MaterialType,
  PaymentRecord,
  PurchaseContract,
  RoleDef,
  SaleContract,
  User,
  WeighTicket,
} from "@/entities/types";

export type CreateInput<T extends { id: string; createdAt: string; updatedAt: string }> = Omit<
  T,
  "id" | "createdAt" | "updatedAt"
>;

export interface ListQuery {
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface ContractsRepository {
  listPurchase(): PurchaseContract[];
  listSale(): SaleContract[];
  getPurchaseById(id: string): PurchaseContract | undefined;
  getSaleById(id: string): SaleContract | undefined;
  createPurchase(input: CreateInput<PurchaseContract>): PurchaseContract;
  createSale(input: CreateInput<SaleContract>): SaleContract;
  updatePurchase(id: string, patch: Partial<PurchaseContract>): void;
  updateSale(id: string, patch: Partial<SaleContract>): void;
  removePurchase(id: string): void;
  removeSale(id: string): void;
}

export interface WeighTicketsRepository {
  list(): WeighTicket[];
  getById(id: string): WeighTicket | undefined;
  create(input: CreateInput<WeighTicket>): WeighTicket;
  update(id: string, patch: Partial<WeighTicket>): void;
  remove(id: string): void;
}

export interface PaymentsRepository {
  list(): PaymentRecord[];
  create(input: CreateInput<PaymentRecord>): PaymentRecord;
  update(id: string, patch: Partial<PaymentRecord>): void;
  remove(id: string): void;
}

export interface SettlementsRepository {
  listReceivables(): ArApItem[];
  listPayables(): ArApItem[];
}

export interface CustomersRepository {
  list(): Customer[];
  create(input: CreateInput<Customer>): Customer;
  update(id: string, patch: Partial<Customer>): void;
  remove(id: string): void;
}

export interface MaterialTypesRepository {
  list(): MaterialType[];
  create(input: CreateInput<MaterialType>): MaterialType;
  update(id: string, patch: Partial<MaterialType>): void;
  remove(id: string): void;
}

export interface EmployeesRepository {
  list(): User[];
  create(input: CreateInput<User>): User;
  update(id: string, patch: Partial<User>): void;
  remove(id: string): void;
}

export interface RolesRepository {
  list(): RoleDef[];
  create(input: CreateInput<RoleDef> & { id?: string }): RoleDef;
  update(id: string, patch: Partial<RoleDef>): void;
  remove(id: string): void;
}

export interface AppRepositories {
  contracts: ContractsRepository;
  weighTickets: WeighTicketsRepository;
  payments: PaymentsRepository;
  settlements: SettlementsRepository;
  customers: CustomersRepository;
  materialTypes: MaterialTypesRepository;
  employees: EmployeesRepository;
  roles: RolesRepository;
}
