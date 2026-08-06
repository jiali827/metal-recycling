"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  customerCategories as seedCustomerCategories,
  customers as seedCustomers,
  materialTypes as seedMaterials,
  projectTypes as seedProjectTypes,
  payables as seedPayables,
  payments as seedPayments,
  purchaseContracts as seedPurchaseContracts,
  receivables as seedReceivables,
  roles as seedRoles,
  saleContracts as seedSaleContracts,
  tenant as seedTenant,
  users as seedUsers,
  weighTickets as seedTickets,
} from "@/data/mock/seed";
import type {
  ArApItem,
  Customer,
  CustomerCategory,
  MaterialType,
  PaymentRecord,
  ProjectType,
  PurchaseContract,
  RoleDef,
  SaleContract,
  Tenant,
  User,
  WeighTicket,
} from "@/entities/types";
import { recomputeSaleContractFulfillment } from "@/entities/contract/summaries";
import { stampOnCreate, stampOnUpdate } from "@/shared/lib/timestamps";
import { setActiveCurrency } from "@/shared/lib/currency";
import { accessToPermissionSummary, createDefaultAccess, normalizeAccess } from "@/shared/config/permissions";
import {
  paymentTicketBxNo,
  syncArApFromPayments,
} from "@/entities/settlement";

type CreateInput<T extends { id: string; createdAt: string; updatedAt: string }> = Omit<
  T,
  "id" | "createdAt" | "updatedAt"
>;

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function arApPayloadFromTicket(ticket: WeighTicket): CreateInput<ArApItem> {
  const amount = ticket.amount;
  return {
    ticketBxNo: ticket.bxNo,
    customerName: ticket.customerName,
    amount,
    settledAmount: 0,
    balance: amount,
    status: "open",
    date: ticket.date.slice(0, 10) || ticket.date,
  };
}

function syncOpenArApFromTicket(
  list: ArApItem[],
  ticket: WeighTicket,
  matchBxNo: string,
): ArApItem[] {
  return list.map((item) => {
    if (item.ticketBxNo !== matchBxNo) return item;
    if (item.status === "void") return item;
    if (item.settledAmount > 0) {
      return stampOnUpdate(item, {
        ticketBxNo: ticket.bxNo,
        customerName: ticket.customerName,
        date: ticket.date.slice(0, 10) || ticket.date,
      });
    }
    const amount = ticket.amount;
    return stampOnUpdate(item, {
      ticketBxNo: ticket.bxNo,
      customerName: ticket.customerName,
      amount,
      settledAmount: 0,
      balance: amount,
      status: "open",
      date: ticket.date.slice(0, 10) || ticket.date,
    });
  });
}

function voidArApForTicket(list: ArApItem[], bxNo: string): ArApItem[] {
  return list.map((item) => {
    if (item.ticketBxNo !== bxNo) return item;
    if (item.status === "void") return item;
    return stampOnUpdate(item, {
      status: "void",
      balance: item.settledAmount > 0 ? item.balance : 0,
    });
  });
}

function removeUnsettledArAp(list: ArApItem[], bxNo: string): ArApItem[] {
  return list.filter((item) => !(item.ticketBxNo === bxNo && item.settledAmount === 0));
}

function reopenOrEnsureArAp(
  list: ArApItem[],
  ticket: WeighTicket,
  prefix: "ar" | "ap",
): ArApItem[] {
  const existing = list.find((item) => item.ticketBxNo === ticket.bxNo);
  if (existing) {
    if (existing.status === "void" && existing.settledAmount === 0) {
      const amount = ticket.amount;
      return list.map((item) =>
        item.id === existing.id
          ? stampOnUpdate(item, {
              customerName: ticket.customerName,
              amount,
              settledAmount: 0,
              balance: amount,
              status: "open",
              date: ticket.date.slice(0, 10) || ticket.date,
            })
          : item,
      );
    }
    return syncOpenArApFromTicket(list, ticket, ticket.bxNo);
  }
  return [stampOnCreate({ ...arApPayloadFromTicket(ticket), id: uid(prefix) }), ...list];
}

interface MockStoreValue {
  tenant: Tenant;
  updateTenant: (patch: Partial<Tenant>) => void;
  purchaseContracts: PurchaseContract[];
  addPurchaseContract: (input: CreateInput<PurchaseContract>) => PurchaseContract;
  updatePurchaseContract: (id: string, patch: Partial<PurchaseContract>) => void;
  removePurchaseContract: (id: string) => void;
  saleContracts: SaleContract[];
  addSaleContract: (input: CreateInput<SaleContract>) => SaleContract;
  updateSaleContract: (id: string, patch: Partial<SaleContract>) => void;
  removeSaleContract: (id: string) => boolean;
  weighTickets: WeighTicket[];
  addWeighTicket: (input: CreateInput<WeighTicket>) => WeighTicket;
  updateWeighTicket: (id: string, patch: Partial<WeighTicket>) => void;
  removeWeighTicket: (id: string) => void;
  receivables: ArApItem[];
  addReceivable: (input: CreateInput<ArApItem>) => ArApItem;
  updateReceivable: (id: string, patch: Partial<ArApItem>) => void;
  removeReceivable: (id: string) => void;
  payables: ArApItem[];
  addPayable: (input: CreateInput<ArApItem>) => ArApItem;
  updatePayable: (id: string, patch: Partial<ArApItem>) => void;
  removePayable: (id: string) => void;
  payments: PaymentRecord[];
  addPayment: (input: CreateInput<PaymentRecord>) => PaymentRecord;
  updatePayment: (id: string, patch: Partial<PaymentRecord>) => void;
  removePayment: (id: string) => void;
  customers: Customer[];
  addCustomer: (input: CreateInput<Customer>) => Customer;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  removeCustomer: (id: string) => void;
  customerCategories: CustomerCategory[];
  addCustomerCategory: (input: CreateInput<CustomerCategory>) => CustomerCategory;
  updateCustomerCategory: (id: string, patch: Partial<CustomerCategory>) => void;
  removeCustomerCategory: (id: string) => void;
  countCustomersInCategory: (name: string) => number;
  materialTypes: MaterialType[];
  addMaterialType: (input: CreateInput<MaterialType>) => MaterialType;
  updateMaterialType: (id: string, patch: Partial<MaterialType>) => void;
  removeMaterialType: (id: string) => void;
  projectTypes: ProjectType[];
  addProjectType: (input: CreateInput<ProjectType>) => ProjectType;
  updateProjectType: (id: string, patch: Partial<ProjectType>) => void;
  removeProjectType: (id: string) => void;
  employees: User[];
  addEmployee: (input: CreateInput<User>) => User;
  updateEmployee: (id: string, patch: Partial<User>) => void;
  removeEmployee: (id: string) => void;
  roles: RoleDef[];
  addRole: (input: CreateInput<RoleDef> & { id?: string }) => RoleDef;
  updateRole: (id: string, patch: Partial<RoleDef>) => void;
  removeRole: (id: string) => void;
}

const MockStoreContext = createContext<MockStoreValue | null>(null);

const TENANT_STORAGE_KEY = "bx-mock-tenant";

function normalizeStoredPhones(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,，;；\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return seedTenant.phones;
}

function readStoredTenant(): typeof seedTenant {
  if (typeof window === "undefined") return seedTenant;
  try {
    const raw = window.localStorage.getItem(TENANT_STORAGE_KEY);
    if (!raw) return seedTenant;
    const parsed = JSON.parse(raw) as Partial<typeof seedTenant> & {
      logoUrl?: string | null;
      phones?: unknown;
    };
    return {
      ...seedTenant,
      ...parsed,
      logoUrl: parsed.logoUrl ?? undefined,
      address: typeof parsed.address === "string" ? parsed.address : seedTenant.address,
      addressEn:
        typeof parsed.addressEn === "string" ? parsed.addressEn : seedTenant.addressEn,
      phones: normalizeStoredPhones(parsed.phones),
      contactPerson:
        typeof parsed.contactPerson === "string"
          ? parsed.contactPerson
          : seedTenant.contactPerson,
      email: typeof parsed.email === "string" ? parsed.email : seedTenant.email,
    };
  } catch {
    return seedTenant;
  }
}

function persistTenant(next: typeof seedTenant) {
  try {
    window.localStorage.setItem(
      TENANT_STORAGE_KEY,
      JSON.stringify({
        name: next.name,
        nameEn: next.nameEn,
        currency: next.currency,
        openingCash: next.openingCash,
        logoUrl: next.logoUrl ?? null,
        address: next.address,
        addressEn: next.addressEn,
        phones: next.phones,
        contactPerson: next.contactPerson,
        email: next.email,
      }),
    );
  } catch {
    /* ignore */
  }
}

export function MockStoreProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState(seedTenant);
  const [purchaseContracts, setPurchaseContracts] = useState(seedPurchaseContracts);
  const [saleContracts, setSaleContracts] = useState(() =>
    seedSaleContracts.map((c) => recomputeSaleContractFulfillment(c, seedTickets)),
  );
  const [weighTickets, setWeighTickets] = useState(seedTickets);
  const [receivables, setReceivables] = useState(seedReceivables);
  const [payables, setPayables] = useState(seedPayables);
  const [payments, setPayments] = useState(seedPayments);
  const [customers, setCustomers] = useState(seedCustomers);
  const [customerCategories, setCustomerCategories] = useState(seedCustomerCategories);
  const [materialTypes, setMaterialTypes] = useState(seedMaterials);
  const [projectTypes, setProjectTypes] = useState(seedProjectTypes);
  const [employees, setEmployees] = useState(seedUsers);
  const [roles, setRoles] = useState(seedRoles);

  useEffect(() => {
    setTenant(readStoredTenant());
  }, []);

  useEffect(() => {
    setActiveCurrency(tenant.currency);
  }, [tenant.currency]);

  const updateTenant = useCallback((patch: Partial<Tenant>) => {
    setTenant((t) => {
      const next = { ...t, ...patch };
      if (patch.currency !== undefined) {
        setActiveCurrency(next.currency);
      }
      persistTenant(next);
      return next;
    });
  }, []);

  const syncSaleFulfillment = useCallback((tickets: WeighTicket[]) => {
    setSaleContracts((list) =>
      list.map((c) => recomputeSaleContractFulfillment(c, tickets)),
    );
  }, []);

  const addPurchaseContract = useCallback((input: CreateInput<PurchaseContract>) => {
    const row = stampOnCreate({ ...input, id: uid("pc") });
    setPurchaseContracts((list) => [row, ...list]);
    return row;
  }, []);
  const updatePurchaseContract = useCallback((id: string, patch: Partial<PurchaseContract>) => {
    setPurchaseContracts((list) =>
      list.map((r) => (r.id === id ? stampOnUpdate(r, patch) : r)),
    );
  }, []);
  const removePurchaseContract = useCallback((id: string) => {
    setPurchaseContracts((list) => list.filter((r) => r.id !== id));
  }, []);

  const addSaleContract = useCallback((input: CreateInput<SaleContract>) => {
    const row = stampOnCreate({ ...input, id: uid("sc") });
    setSaleContracts((list) => [row, ...list]);
    return row;
  }, []);
  const updateSaleContract = useCallback((id: string, patch: Partial<SaleContract>) => {
    setSaleContracts((list) =>
      list.map((r) => (r.id === id ? stampOnUpdate(r, patch) : r)),
    );
  }, []);
  const removeSaleContract = useCallback(
    (id: string) => {
      if (weighTickets.some((t) => t.saleContractId === id)) return false;
      setSaleContracts((list) => list.filter((r) => r.id !== id));
      return true;
    },
    [weighTickets],
  );

  const addWeighTicket = useCallback(
    (input: CreateInput<WeighTicket>) => {
      const row = stampOnCreate({ ...input, id: uid("w") });
      setWeighTickets((list) => {
        const next = [row, ...list];
        syncSaleFulfillment(next);
        return next;
      });

      if (row.status === "normal") {
        const payload = arApPayloadFromTicket(row);
        if (row.direction === "sale") {
          setReceivables((list) => {
            if (list.some((item) => item.ticketBxNo === row.bxNo && item.status !== "void")) {
              return list;
            }
            return [stampOnCreate({ ...payload, id: uid("ar") }), ...list];
          });
        } else {
          setPayables((list) => {
            if (list.some((item) => item.ticketBxNo === row.bxNo && item.status !== "void")) {
              return list;
            }
            return [stampOnCreate({ ...payload, id: uid("ap") }), ...list];
          });
        }
      }

      return row;
    },
    [syncSaleFulfillment],
  );

  const updateWeighTicket = useCallback(
    (id: string, patch: Partial<WeighTicket>) => {
      setWeighTickets((list) => {
        const prev = list.find((r) => r.id === id);
        if (!prev) return list;
        const next = stampOnUpdate(prev, patch);
        const nextList = list.map((r) => (r.id === id ? next : r));
        syncSaleFulfillment(nextList);

        const prevBx = prev.bxNo;
        const becameVoid = prev.status !== "void" && next.status === "void";
        const becameNormal = prev.status === "void" && next.status === "normal";

        if (becameVoid) {
          if (next.direction === "sale") {
            setReceivables((ar) => voidArApForTicket(ar, next.bxNo));
          } else {
            setPayables((ap) => voidArApForTicket(ap, next.bxNo));
          }
        } else if (next.status === "normal") {
          if (next.direction === "sale") {
            setReceivables((ar) => {
              let pool = ar;
              if (prevBx !== next.bxNo) {
                pool = pool.map((item) =>
                  item.ticketBxNo === prevBx
                    ? stampOnUpdate(item, { ticketBxNo: next.bxNo })
                    : item,
                );
              }
              if (becameNormal || prev.direction === "purchase") {
                return reopenOrEnsureArAp(pool, next, "ar");
              }
              return syncOpenArApFromTicket(pool, next, next.bxNo);
            });
            if (prev.direction === "purchase") {
              setPayables((ap) => removeUnsettledArAp(voidArApForTicket(ap, prevBx), prevBx));
            }
          } else {
            setPayables((ap) => {
              let pool = ap;
              if (prevBx !== next.bxNo) {
                pool = pool.map((item) =>
                  item.ticketBxNo === prevBx
                    ? stampOnUpdate(item, { ticketBxNo: next.bxNo })
                    : item,
                );
              }
              if (becameNormal || prev.direction === "sale") {
                return reopenOrEnsureArAp(pool, next, "ap");
              }
              return syncOpenArApFromTicket(pool, next, next.bxNo);
            });
            if (prev.direction === "sale") {
              setReceivables((ar) =>
                removeUnsettledArAp(voidArApForTicket(ar, prevBx), prevBx),
              );
            }
          }
        }

        return nextList;
      });
    },
    [syncSaleFulfillment],
  );

  const removeWeighTicket = useCallback(
    (id: string) => {
      setWeighTickets((list) => {
        const row = list.find((r) => r.id === id);
        if (!row) return list;
        const bxNo = row.bxNo;
        if (row.direction === "sale") {
          setReceivables((ar) => removeUnsettledArAp(voidArApForTicket(ar, bxNo), bxNo));
        } else {
          setPayables((ap) => removeUnsettledArAp(voidArApForTicket(ap, bxNo), bxNo));
        }
        const next = list.filter((r) => r.id !== id);
        syncSaleFulfillment(next);
        return next;
      });
    },
    [syncSaleFulfillment],
  );
  const addReceivable = useCallback((input: CreateInput<ArApItem>) => {
    const row = stampOnCreate({ ...input, id: uid("ar") });
    setReceivables((list) => [row, ...list]);
    return row;
  }, []);
  const updateReceivable = useCallback((id: string, patch: Partial<ArApItem>) => {
    setReceivables((list) => list.map((r) => (r.id === id ? stampOnUpdate(r, patch) : r)));
  }, []);
  const removeReceivable = useCallback((id: string) => {
    setReceivables((list) => list.filter((r) => r.id !== id));
  }, []);

  const addPayable = useCallback((input: CreateInput<ArApItem>) => {
    const row = stampOnCreate({ ...input, id: uid("ap") });
    setPayables((list) => [row, ...list]);
    return row;
  }, []);
  const updatePayable = useCallback((id: string, patch: Partial<ArApItem>) => {
    setPayables((list) => list.map((r) => (r.id === id ? stampOnUpdate(r, patch) : r)));
  }, []);
  const removePayable = useCallback((id: string) => {
    setPayables((list) => list.filter((r) => r.id !== id));
  }, []);

  const addPayment = useCallback((input: CreateInput<PaymentRecord>) => {
    const row = stampOnCreate({ ...input, id: uid("p") });
    setPayments((list) => {
      const next = [row, ...list];
      const bx = paymentTicketBxNo(row);
      if (row.category === "settlement" && bx) {
        if (row.type === "receipt") {
          setReceivables((ar) => syncArApFromPayments(ar, next, [bx], "receipt"));
        } else {
          setPayables((ap) => syncArApFromPayments(ap, next, [bx], "payment"));
        }
      }
      return next;
    });
    return row;
  }, []);

  const updatePayment = useCallback((id: string, patch: Partial<PaymentRecord>) => {
    setPayments((list) => {
      const prev = list.find((r) => r.id === id);
      if (!prev) return list;
      const nextRow = stampOnUpdate(prev, patch);
      const next = list.map((r) => (r.id === id ? nextRow : r));
      const bxNos = [paymentTicketBxNo(prev), paymentTicketBxNo(nextRow)].filter(Boolean);
      const types = new Set([prev.type, nextRow.type]);
      if (
        (prev.category === "settlement" || nextRow.category === "settlement") &&
        bxNos.length > 0
      ) {
        if (types.has("receipt")) {
          setReceivables((ar) => syncArApFromPayments(ar, next, bxNos, "receipt"));
        }
        if (types.has("payment")) {
          setPayables((ap) => syncArApFromPayments(ap, next, bxNos, "payment"));
        }
      }
      return next;
    });
  }, []);

  const removePayment = useCallback((id: string) => {
    setPayments((list) => {
      const prev = list.find((r) => r.id === id);
      if (!prev) return list;
      const next = list.filter((r) => r.id !== id);
      const bx = paymentTicketBxNo(prev);
      if (prev.category === "settlement" && bx) {
        if (prev.type === "receipt") {
          setReceivables((ar) => syncArApFromPayments(ar, next, [bx], "receipt"));
        } else {
          setPayables((ap) => syncArApFromPayments(ap, next, [bx], "payment"));
        }
      }
      return next;
    });
  }, []);

  const addCustomer = useCallback((input: CreateInput<Customer>) => {
    const row = stampOnCreate({ ...input, id: uid("c") });
    setCustomers((list) => [row, ...list]);
    return row;
  }, []);
  const updateCustomer = useCallback((id: string, patch: Partial<Customer>) => {
    setCustomers((list) => list.map((r) => (r.id === id ? stampOnUpdate(r, patch) : r)));
  }, []);
  const removeCustomer = useCallback((id: string) => {
    setCustomers((list) => list.filter((r) => r.id !== id));
  }, []);

  const addCustomerCategory = useCallback((input: CreateInput<CustomerCategory>) => {
    const name = input.name.trim();
    const row = stampOnCreate({ name, id: uid("cc") });
    setCustomerCategories((list) => {
      if (list.some((item) => item.name === name)) return list;
      return [row, ...list];
    });
    return row;
  }, []);

  const updateCustomerCategory = useCallback((id: string, patch: Partial<CustomerCategory>) => {
    setCustomerCategories((list) => {
      const prev = list.find((item) => item.id === id);
      if (!prev) return list;
      const nextName = patch.name?.trim();
      if (nextName && list.some((item) => item.id !== id && item.name === nextName)) {
        return list;
      }
      const updated = stampOnUpdate(prev, nextName ? { name: nextName } : patch);
      if (nextName && nextName !== prev.name) {
        setCustomers((custs) =>
          custs.map((customer) =>
            customer.category === prev.name
              ? stampOnUpdate(customer, { category: nextName })
              : customer,
          ),
        );
      }
      return list.map((item) => (item.id === id ? updated : item));
    });
  }, []);

  const removeCustomerCategory = useCallback((id: string) => {
    setCustomerCategories((list) => list.filter((item) => item.id !== id));
  }, []);

  const countCustomersInCategory = useCallback(
    (name: string) => customers.filter((customer) => customer.category === name).length,
    [customers],
  );

  const addMaterialType = useCallback((input: CreateInput<MaterialType>) => {
    const row = stampOnCreate({ ...input, id: uid("m") });
    setMaterialTypes((list) => [row, ...list]);
    return row;
  }, []);
  const updateMaterialType = useCallback((id: string, patch: Partial<MaterialType>) => {
    setMaterialTypes((list) => list.map((r) => (r.id === id ? stampOnUpdate(r, patch) : r)));
  }, []);
  const removeMaterialType = useCallback((id: string) => {
    setMaterialTypes((list) => list.filter((r) => r.id !== id));
  }, []);

  const addProjectType = useCallback((input: CreateInput<ProjectType>) => {
    const row = stampOnCreate({ ...input, id: uid("pt") });
    setProjectTypes((list) => [row, ...list]);
    return row;
  }, []);
  const updateProjectType = useCallback((id: string, patch: Partial<ProjectType>) => {
    setProjectTypes((list) => list.map((r) => (r.id === id ? stampOnUpdate(r, patch) : r)));
  }, []);
  const removeProjectType = useCallback((id: string) => {
    setProjectTypes((list) => list.filter((r) => r.id !== id));
  }, []);

  const addEmployee = useCallback((input: CreateInput<User>) => {
    const row = stampOnCreate({ ...input, id: uid("u") });
    setEmployees((list) => [row, ...list]);
    return row;
  }, []);
  const updateEmployee = useCallback((id: string, patch: Partial<User>) => {
    // 邮箱为登录账号，创建后不可修改
    const { email: _email, ...safePatch } = patch;
    setEmployees((list) =>
      list.map((r) => (r.id === id ? stampOnUpdate(r, safePatch) : r)),
    );
  }, []);
  const removeEmployee = useCallback((id: string) => {
    setEmployees((list) => list.filter((r) => r.id !== id));
  }, []);

  const addRole = useCallback((input: CreateInput<RoleDef> & { id?: string }) => {
    const access = normalizeAccess(input.access ?? createDefaultAccess());
    const row = stampOnCreate({
      name: input.name,
      access,
      permissions: input.permissions ?? accessToPermissionSummary(access),
      enabled: input.enabled ?? true,
      id: input.id ?? uid("role"),
    });
    setRoles((list) => [row, ...list]);
    return row;
  }, []);
  const updateRole = useCallback((id: string, patch: Partial<RoleDef>) => {
    setRoles((list) =>
      list.map((r) => {
        if (r.id !== id) return r;
        const nextAccess = patch.access ? normalizeAccess(patch.access) : r.access;
        return stampOnUpdate(r, {
          ...patch,
          access: nextAccess,
          permissions: patch.access
            ? accessToPermissionSummary(nextAccess)
            : patch.permissions,
        });
      }),
    );
  }, []);
  const removeRole = useCallback((id: string) => {
    setRoles((list) => list.filter((r) => r.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      tenant,
      updateTenant,
      purchaseContracts,
      addPurchaseContract,
      updatePurchaseContract,
      removePurchaseContract,
      saleContracts,
      addSaleContract,
      updateSaleContract,
      removeSaleContract,
      weighTickets,
      addWeighTicket,
      updateWeighTicket,
      removeWeighTicket,
      receivables,
      addReceivable,
      updateReceivable,
      removeReceivable,
      payables,
      addPayable,
      updatePayable,
      removePayable,
      payments,
      addPayment,
      updatePayment,
      removePayment,
      customers,
      addCustomer,
      updateCustomer,
      removeCustomer,
      customerCategories,
      addCustomerCategory,
      updateCustomerCategory,
      removeCustomerCategory,
      countCustomersInCategory,
      materialTypes,
      addMaterialType,
      updateMaterialType,
      removeMaterialType,
      projectTypes,
      addProjectType,
      updateProjectType,
      removeProjectType,
      employees,
      addEmployee,
      updateEmployee,
      removeEmployee,
      roles,
      addRole,
      updateRole,
      removeRole,
    }),
    [
      tenant,
      updateTenant,
      purchaseContracts,
      addPurchaseContract,
      updatePurchaseContract,
      removePurchaseContract,
      saleContracts,
      addSaleContract,
      updateSaleContract,
      removeSaleContract,
      weighTickets,
      addWeighTicket,
      updateWeighTicket,
      removeWeighTicket,
      receivables,
      addReceivable,
      updateReceivable,
      removeReceivable,
      payables,
      addPayable,
      updatePayable,
      removePayable,
      payments,
      addPayment,
      updatePayment,
      removePayment,
      customers,
      addCustomer,
      updateCustomer,
      removeCustomer,
      customerCategories,
      addCustomerCategory,
      updateCustomerCategory,
      removeCustomerCategory,
      countCustomersInCategory,
      materialTypes,
      addMaterialType,
      updateMaterialType,
      removeMaterialType,
      projectTypes,
      addProjectType,
      updateProjectType,
      removeProjectType,
      employees,
      addEmployee,
      updateEmployee,
      removeEmployee,
      roles,
      addRole,
      updateRole,
      removeRole,
    ],
  );

  return (
    <MockStoreContext.Provider value={value}>{children}</MockStoreContext.Provider>
  );
}

export function useMockStore() {
  const ctx = useContext(MockStoreContext);
  if (!ctx) throw new Error("useMockStore must be used within MockStoreProvider");
  return ctx;
}
