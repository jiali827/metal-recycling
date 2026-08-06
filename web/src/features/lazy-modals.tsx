"use client";

import dynamic from "next/dynamic";

export const CustomerCreateModal = dynamic(
  () =>
    import("@/features/customers/components/CustomerModals").then((m) => ({
      default: m.CustomerCreateModal,
    })),
  { ssr: false },
);
export const CustomerDetailModal = dynamic(
  () =>
    import("@/features/customers/components/CustomerModals").then((m) => ({
      default: m.CustomerDetailModal,
    })),
  { ssr: false },
);

export const MaterialTypeCreateModal = dynamic(
  () =>
    import("@/features/material-types/components/MaterialTypeModals").then((m) => ({
      default: m.MaterialTypeCreateModal,
    })),
  { ssr: false },
);
export const MaterialTypeDetailModal = dynamic(
  () =>
    import("@/features/material-types/components/MaterialTypeModals").then((m) => ({
      default: m.MaterialTypeDetailModal,
    })),
  { ssr: false },
);

export const ProjectTypeCreateModal = dynamic(
  () =>
    import("@/features/project-types/components/ProjectTypeModals").then((m) => ({
      default: m.ProjectTypeCreateModal,
    })),
  { ssr: false },
);

export const ProjectTypeDetailModal = dynamic(
  () =>
    import("@/features/project-types/components/ProjectTypeModals").then((m) => ({
      default: m.ProjectTypeDetailModal,
    })),
  { ssr: false },
);

export const RoleCreateModal = dynamic(
  () =>
    import("@/features/roles/components/RoleModals").then((m) => ({
      default: m.RoleCreateModal,
    })),
  { ssr: false },
);
export const RoleDetailModal = dynamic(
  () =>
    import("@/features/roles/components/RoleModals").then((m) => ({
      default: m.RoleDetailModal,
    })),
  { ssr: false },
);

export const EmployeeCreateModal = dynamic(
  () =>
    import("@/features/employees/components/EmployeeModals").then((m) => ({
      default: m.EmployeeCreateModal,
    })),
  { ssr: false },
);
export const EmployeeDetailModal = dynamic(
  () =>
    import("@/features/employees/components/EmployeeModals").then((m) => ({
      default: m.EmployeeDetailModal,
    })),
  { ssr: false },
);

export const ContractCreateModal = dynamic(
  () =>
    import("@/features/contracts/components/ContractModals").then((m) => ({
      default: m.PurchaseContractCreateModal,
    })),
  { ssr: false },
);
export const PurchaseContractCreateModal = dynamic(
  () =>
    import("@/features/contracts/components/ContractModals").then((m) => ({
      default: m.PurchaseContractCreateModal,
    })),
  { ssr: false },
);
export const PurchaseContractDetailModal = dynamic(
  () =>
    import("@/features/contracts/components/ContractModals").then((m) => ({
      default: m.PurchaseContractDetailModal,
    })),
  { ssr: false },
);
export const SaleContractCreateModal = dynamic(
  () =>
    import("@/features/contracts/components/ContractModals").then((m) => ({
      default: m.SaleContractCreateModal,
    })),
  { ssr: false },
);
export const SaleContractDetailModal = dynamic(
  () =>
    import("@/features/contracts/components/ContractModals").then((m) => ({
      default: m.SaleContractDetailModal,
    })),
  { ssr: false },
);
export const ContractDetailModal = dynamic(
  () =>
    import("@/features/contracts/components/ContractModals").then((m) => ({
      default: m.ContractDetailModal,
    })),
  { ssr: false },
);

export const PaymentCreateModal = dynamic(
  () =>
    import("@/features/payments/components/PaymentModals").then((m) => ({
      default: m.PaymentCreateModal,
    })),
  { ssr: false },
);
export const PaymentDetailModal = dynamic(
  () =>
    import("@/features/payments/components/PaymentModals").then((m) => ({
      default: m.PaymentDetailModal,
    })),
  { ssr: false },
);

export const ReceivableCreateModal = dynamic(
  () =>
    import("@/features/settlements/components/ArApModals").then((m) => ({
      default: m.ReceivableCreateModal,
    })),
  { ssr: false },
);
export const ReceivableDetailModal = dynamic(
  () =>
    import("@/features/settlements/components/ArApModals").then((m) => ({
      default: m.ReceivableDetailModal,
    })),
  { ssr: false },
);
export const PayableCreateModal = dynamic(
  () =>
    import("@/features/settlements/components/ArApModals").then((m) => ({
      default: m.PayableCreateModal,
    })),
  { ssr: false },
);
export const PayableDetailModal = dynamic(
  () =>
    import("@/features/settlements/components/ArApModals").then((m) => ({
      default: m.PayableDetailModal,
    })),
  { ssr: false },
);

export const WeighTicketCreateModal = dynamic(
  () =>
    import("@/features/weigh-tickets/components/WeighTicketModals").then((m) => ({
      default: m.WeighTicketCreateModal,
    })),
  { ssr: false },
);
export const WeighTicketDetailModal = dynamic(
  () =>
    import("@/features/weigh-tickets/components/WeighTicketModals").then((m) => ({
      default: m.WeighTicketDetailModal,
    })),
  { ssr: false },
);
