"use client";

import dynamic from "next/dynamic";

export const CustomerCreateModal = dynamic(
  () => import("./CustomerModals").then((m) => ({ default: m.CustomerCreateModal })),
  { ssr: false },
);
export const CustomerDetailModal = dynamic(
  () => import("./CustomerModals").then((m) => ({ default: m.CustomerDetailModal })),
  { ssr: false },
);

export const MaterialTypeCreateModal = dynamic(
  () => import("./MaterialTypeModals").then((m) => ({ default: m.MaterialTypeCreateModal })),
  { ssr: false },
);
export const MaterialTypeDetailModal = dynamic(
  () => import("./MaterialTypeModals").then((m) => ({ default: m.MaterialTypeDetailModal })),
  { ssr: false },
);

export const RoleCreateModal = dynamic(
  () => import("./RoleModals").then((m) => ({ default: m.RoleCreateModal })),
  { ssr: false },
);
export const RoleDetailModal = dynamic(
  () => import("./RoleModals").then((m) => ({ default: m.RoleDetailModal })),
  { ssr: false },
);

export const EmployeeCreateModal = dynamic(
  () => import("./EmployeeModals").then((m) => ({ default: m.EmployeeCreateModal })),
  { ssr: false },
);
export const EmployeeDetailModal = dynamic(
  () => import("./EmployeeModals").then((m) => ({ default: m.EmployeeDetailModal })),
  { ssr: false },
);

export const ContractCreateModal = dynamic(
  () => import("./ContractModals").then((m) => ({ default: m.ContractCreateModal })),
  { ssr: false },
);
export const ContractDetailModal = dynamic(
  () => import("./ContractModals").then((m) => ({ default: m.ContractDetailModal })),
  { ssr: false },
);

export const PaymentCreateModal = dynamic(
  () => import("./PaymentModals").then((m) => ({ default: m.PaymentCreateModal })),
  { ssr: false },
);
export const PaymentDetailModal = dynamic(
  () => import("./PaymentModals").then((m) => ({ default: m.PaymentDetailModal })),
  { ssr: false },
);

export const ReceivableCreateModal = dynamic(
  () => import("./ArApModals").then((m) => ({ default: m.ReceivableCreateModal })),
  { ssr: false },
);
export const ReceivableDetailModal = dynamic(
  () => import("./ArApModals").then((m) => ({ default: m.ReceivableDetailModal })),
  { ssr: false },
);
export const PayableCreateModal = dynamic(
  () => import("./ArApModals").then((m) => ({ default: m.PayableCreateModal })),
  { ssr: false },
);
export const PayableDetailModal = dynamic(
  () => import("./ArApModals").then((m) => ({ default: m.PayableDetailModal })),
  { ssr: false },
);

export const WeighTicketCreateModal = dynamic(
  () => import("./WeighTicketModals").then((m) => ({ default: m.WeighTicketCreateModal })),
  { ssr: false },
);
export const WeighTicketDetailModal = dynamic(
  () => import("./WeighTicketModals").then((m) => ({ default: m.WeighTicketDetailModal })),
  { ssr: false },
);
