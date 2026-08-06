"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowsLeftRight,
  FileText,
  PencilSimple,
  Plus,
  Scales,
  Trash,
  UserCircle,
} from "@phosphor-icons/react";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { ContractDetailModal } from "@/features/contracts/components/ContractModals";
import { CustomerDetailModal } from "@/features/customers/components/CustomerModals";
import { PaymentCreateModal, PaymentDetailModal } from "@/features/payments/components/PaymentModals";
import {
  WeighTicketCreateModal,
  WeighTicketDetailModal,
} from "@/features/weigh-tickets/components/WeighTicketModals";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { TableScrollArea } from "@/shared/ui/TableScrollArea";
import { contractStatusTone } from "@/entities/contract/status";
import {
  DIRECTION_PURCHASE_COLOR,
  DIRECTION_SALE_COLOR,
} from "@/shared/lib/direction-colors";
import { deleteConfirmMessage } from "@/shared/lib/confirm-delete";
import { formatKg, formatMoney } from "@/shared/lib/format";
import { formatWeighDateTime } from "@/shared/lib/date";
import { localizeMiscKind, useI18n } from "@/shared/i18n";
import {
  contractStatusLabel,
  fieldLabels,
  ticketStatusLabel,
} from "@/shared/i18n/labels";
import { isMiscPayment } from "@/entities/payment/meta";
import { paymentTicketBxNo } from "@/entities/settlement";
import { useMockStore } from "@/data/mock/store";
import type { ContractTrace } from "@/entities/transaction/trace";

type DetailTab = "basic" | "weigh" | "payment";

function formatPaymentMethod(
  method: string,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (method === "現金" || method === "现金") return t("form.methodCash");
  if (method === "支票") return t("form.methodCheque");
  if (method === "轉賬" || method === "转账") return t("form.methodTransfer");
  return method;
}

function TraceInfoBlock({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h4 className="mb-2.5 text-xs font-medium text-muted">{title}</h4>
      {children}
    </section>
  );
}

function BasicInfoToolbar({
  onEditContract,
  onEditCustomer,
  hasCustomer,
}: {
  onEditContract: () => void;
  onEditCustomer: () => void;
  hasCustomer: boolean;
}) {
  const { t } = useI18n();
  const actionClass =
    "inline-flex h-8 items-center gap-1 rounded-[var(--radius-control)] px-2 text-xs font-medium text-brand transition hover:bg-brand-soft";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <FileText size={18} weight="regular" className="shrink-0 text-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          {t("form.sectionBasic")}
        </h3>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" onClick={onEditContract} className={actionClass}>
          <PencilSimple size={14} />
          {t("transactions.contractSection")}
        </button>
        {hasCustomer ? (
          <button type="button" onClick={onEditCustomer} className={actionClass}>
            <UserCircle size={14} />
            {t("transactions.customerSection")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TraceStep({
  step,
  label,
  done,
  active,
}: {
  step: number;
  label: string;
  done: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${
          done
            ? "bg-brand text-white"
            : active
              ? "border-2 border-brand bg-brand-soft text-brand"
              : "bg-chip text-muted"
        }`}
      >
        {step}
      </div>
      <span
        className={`max-w-full truncate text-center text-[10px] ${
          done || active ? "font-medium text-foreground" : "text-muted"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function TabPanelToolbar({
  title,
  icon,
  onAdd,
  onEdit,
  embedded,
}: {
  title: string;
  icon: ReactNode;
  onAdd?: () => void;
  onEdit?: () => void;
  embedded?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={`flex items-center gap-2 ${embedded ? "" : "mb-4"}`}>
      <span className="shrink-0 text-foreground">{icon}</span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="ml-auto flex items-center gap-1">
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-8 items-center gap-1 rounded-[var(--radius-control)] px-2 text-xs font-medium text-brand transition hover:bg-brand-soft"
          >
            <PencilSimple size={14} />
            {t("common.detail")}
          </button>
        ) : null}
        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border border-border bg-card text-brand transition hover:bg-brand-soft"
            aria-label={t("common.new")}
          >
            <Plus size={14} weight="bold" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TabContentCard({
  toolbar,
  children,
  flush,
}: {
  toolbar: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-card">
      <div className="border-b border-border px-3 py-2.5">{toolbar}</div>
      <div className={flush ? "" : "px-3 py-3"}>{children}</div>
    </div>
  );
}

/** Read-only field: label left, value right within a compact row */
function InfoCell({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-h-9 items-baseline gap-3 py-1.5 ${className}`}>
      <dt className="w-[6.75rem] shrink-0 text-xs text-muted">{label}</dt>
      <dd className="min-w-0 text-sm font-medium leading-snug text-foreground">
        {children}
      </dd>
    </div>
  );
}

function InfoGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid gap-x-8 sm:grid-cols-2">{children}</dl>
  );
}

function RowActionButtons({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] text-muted transition hover:bg-chip hover:text-brand"
        aria-label={t("common.detail")}
      >
        <PencilSimple size={14} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] text-muted transition hover:bg-red-50 hover:text-danger"
        aria-label={t("common.delete")}
      >
        <Trash size={14} />
      </button>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-[var(--radius-control)] border border-dashed border-border bg-chip/30 px-6 py-10 text-sm text-muted">
      {text}
    </div>
  );
}

export function ContractTracePanel({ trace }: { trace: ContractTrace }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const {
    purchaseContracts,
    saleContracts,
    removeWeighTicket,
    removePayment,
  } = useMockStore();

  const allContracts = useMemo(
    () => [
      ...purchaseContracts.map((c) => ({
        id: c.id,
        customerId: c.customerId,
      })),
      ...saleContracts.map((c) => ({
        id: c.id,
        customerId: c.customerId,
      })),
    ],
    [purchaseContracts, saleContracts],
  );

  const { contract, customer, tickets, settlements, payments, summary } = trace;

  const [activeTab, setActiveTab] = useState<DetailTab>("basic");
  const [contractEditOpen, setContractEditOpen] = useState(false);
  const [customerEditId, setCustomerEditId] = useState<string | null>(null);
  const [ticketCreateOpen, setTicketCreateOpen] = useState(false);
  const [ticketEditId, setTicketEditId] = useState<string | null>(null);
  const [paymentCreateOpen, setPaymentCreateOpen] = useState(false);
  const [paymentEditId, setPaymentEditId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab("basic");
  }, [contract.id]);

  const ticketPreset = useMemo(
    () => ({
      contractNo: contract.no,
      direction: contract.type,
      customerName: contract.customerName,
      saleContractId: contract.type === "sale" ? contract.id : undefined,
    }),
    [contract],
  );

  const paymentPreset = useMemo(
    () => ({
      counterparty: contract.customerName,
      type: contract.type === "sale" ? ("receipt" as const) : ("payment" as const),
      ticketBxNo: tickets.find((tk) => tk.status === "normal")?.bxNo,
    }),
    [contract, tickets],
  );

  const hasWeigh = summary.normalTicketCount > 0;
  const hasPayment = payments.length > 0;
  const allSettled =
    settlements.length > 0 && settlements.every((s) => s.status === "settled");

  const remainingKg = Math.max(0, contract.plannedKg - contract.fulfilledKg);

  const customerContractCount = useMemo(
    () => allContracts.filter((c) => c.customerId === contract.customerId).length,
    [allContracts, contract.customerId],
  );

  const tabs = useMemo(
    () =>
      [
        { id: "basic" as const, label: t("form.sectionBasic") },
        {
          id: "weigh" as const,
          label: t("transactions.weighSection"),
          count: tickets.length,
        },
        {
          id: "payment" as const,
          label: t("transactions.paymentSection"),
          count: payments.length,
        },
      ] as const,
    [t, tickets.length, payments.length],
  );

  async function confirmDelete(label: string, action: () => void) {
    const ok = await confirm(deleteConfirmMessage(label));
    if (ok) action();
  }

  return (
    <>
      <div className="space-y-3">
        <div className="ui-card overflow-hidden">
          <div className="border-b border-border bg-gradient-to-r from-brand-soft/40 to-card px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  {contract.no}
                </h2>
                <StatusBadge tone={contract.type === "purchase" ? "info" : "accent"}>
                  {contract.type === "purchase" ? t("common.purchase") : t("common.sale")}
                </StatusBadge>
                <StatusBadge tone={contractStatusTone(contract.status)}>
                  {contractStatusLabel[contract.status]}
                </StatusBadge>
              </div>
              <p className="mt-1 text-sm text-muted">{contract.customerName}</p>
            </div>
            <div className="text-right text-xs text-muted">
              <div>{contract.date}</div>
              <div className="mt-0.5 tabular-nums">
                {t("transactions.fulfillment")} {summary.fulfillmentPct.toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <TraceStep step={1} label={t("transactions.stepContract")} done />
            <div className="h-px flex-1 bg-border" />
            <TraceStep
              step={2}
              label={t("transactions.stepWeigh")}
              done={hasWeigh}
              active={!hasWeigh}
            />
            <div className="h-px flex-1 bg-border" />
            <TraceStep
              step={3}
              label={t("transactions.stepPayment")}
              done={allSettled || hasPayment}
              active={hasWeigh && !hasPayment}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
          {[
            {
              label: t("transactions.ticketCount"),
              value: String(summary.normalTicketCount),
            },
            { label: t("transactions.totalAmount"), value: formatMoney(summary.totalAmount) },
            { label: t("transactions.totalNetKg"), value: formatKg(summary.totalNetKg) },
            { label: t("transactions.balance"), value: formatMoney(summary.balance) },
          ].map((item, i) => (
            <div
              key={item.label}
              className={`px-3 py-2.5 ${i > 0 ? "border-l border-border" : ""}`}
            >
              <div className="text-[10px] text-muted">{item.label}</div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                {item.value}
              </div>
            </div>
          ))}
        </div>
        </div>

        <div>
          <div
            className="flex overflow-x-auto border-b border-border"
            role="tablist"
            aria-label={contract.no}
          >
          {tabs.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(item.id)}
                className={`flex shrink-0 items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "border-brand text-brand"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {item.label}
                {"count" in item ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                      active ? "bg-brand-soft text-brand" : "bg-chip text-muted"
                    }`}
                  >
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}
          </div>

          <div className="pt-3" role="tabpanel">
          {activeTab === "basic" ? (
            <div className="w-full max-w-3xl">
            <TabContentCard
              toolbar={
                <BasicInfoToolbar
                  onEditContract={() => setContractEditOpen(true)}
                  onEditCustomer={() => setCustomerEditId(customer!.id)}
                  hasCustomer={Boolean(customer)}
                />
              }
            >
              <div className="space-y-5">
                <TraceInfoBlock title={t("transactions.contractSection")}>
                  <InfoGrid>
                    <InfoCell label={t("fields.contractNo")}>{contract.no}</InfoCell>
                    <InfoCell label={t("fields.signedDate")}>{contract.date}</InfoCell>
                    <InfoCell label={t("common.type")}>
                      {contract.type === "purchase"
                        ? t("common.purchase")
                        : t("common.sale")}
                    </InfoCell>
                    <InfoCell label={t("transactions.contractStatus")}>
                      {contractStatusLabel[contract.status]}
                    </InfoCell>
                    <InfoCell label={t("contracts.colPlanned")}>
                      {formatKg(contract.plannedKg)}
                    </InfoCell>
                    <InfoCell label={t("contracts.colFulfilled")}>
                      {formatKg(contract.fulfilledKg)}
                    </InfoCell>
                    <InfoCell label={t("transactions.remainingWeight")}>
                      {formatKg(remainingKg)}
                    </InfoCell>
                    <InfoCell label={t("contracts.colPrice")}>
                      {contract.unitPriceSummary}
                    </InfoCell>
                    <InfoCell label={t("transactions.fulfillment")}>
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-chip">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, summary.fulfillmentPct)}%`,
                              backgroundColor:
                                contract.type === "purchase"
                                  ? DIRECTION_PURCHASE_COLOR
                                  : DIRECTION_SALE_COLOR,
                            }}
                          />
                        </div>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-brand">
                          {summary.fulfillmentPct.toFixed(0)}%
                        </span>
                      </div>
                    </InfoCell>
                    {contract.attachmentName ? (
                      <InfoCell label={t("transactions.contractAttachment")}>
                        <span className="truncate">{contract.attachmentName}</span>
                      </InfoCell>
                    ) : null}
                  </InfoGrid>
                </TraceInfoBlock>

                <TraceInfoBlock
                  title={t("transactions.customerSection")}
                  className="border-t border-border/60 pt-5"
                >
                  {!customer ? (
                    <div className="rounded-[var(--radius-control)] border border-dashed border-border bg-chip/30 px-3 py-6 text-center">
                      <p className="text-sm text-muted">
                        {t("transactions.customerLinkHint")}
                      </p>
                      <button
                        type="button"
                        className="ui-btn-primary mt-4 text-sm"
                        onClick={() => setContractEditOpen(true)}
                      >
                        {t("transactions.customerLinkAction")}
                      </button>
                    </div>
                  ) : (
                    <InfoGrid>
                      <InfoCell label={t("common.name")}>{customer.name}</InfoCell>
                      <InfoCell label={t("common.category")}>
                        {customer.category}
                      </InfoCell>
                      <InfoCell label={t("common.contact")}>
                        {customer.contact ?? "-"}
                      </InfoCell>
                      <InfoCell label={t("transactions.relatedContractCount")}>
                        {customerContractCount}
                      </InfoCell>
                    </InfoGrid>
                  )}
                </TraceInfoBlock>
              </div>
            </TabContentCard>
            </div>
          ) : null}

          {activeTab === "weigh" ? (
            <TabContentCard
              flush={tickets.length > 0}
              toolbar={
                <TabPanelToolbar
                  embedded
                  title={t("transactions.weighSection")}
                  icon={<Scales size={18} weight="regular" className="text-foreground" />}
                  onAdd={() => setTicketCreateOpen(true)}
                />
              }
            >
              {tickets.length === 0 ? (
                <div className="p-4">
                  <EmptyPanel text={t("transactions.noTickets")} />
                </div>
              ) : (
                <TableScrollArea>
                  <table className="ui-table-hover-soft min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-chip text-left text-xs text-muted">
                        <th className="px-4 py-2.5 font-semibold">{fieldLabels.bxNo}</th>
                        <th className="py-2.5 pr-3 font-semibold">{fieldLabels.direction}</th>
                        <th className="py-2.5 pr-3 font-semibold">
                          {t("fields.weighDateTime")}
                        </th>
                        <th className="py-2.5 pr-3 font-semibold">{fieldLabels.customer}</th>
                        <th className="py-2.5 pr-3 font-semibold">{fieldLabels.plate}</th>
                        <th className="py-2.5 pr-3 font-semibold">{fieldLabels.material}</th>
                        <th className="py-2.5 pr-3 text-right font-semibold">
                          {fieldLabels.net}
                        </th>
                        <th className="py-2.5 pr-3 text-right font-semibold">
                          {fieldLabels.amount}
                        </th>
                        <th className="py-2.5 pr-3 font-semibold">{fieldLabels.contractNo}</th>
                        <th className="py-2.5 pr-3 font-semibold">{fieldLabels.status}</th>
                        <th className="ui-table-sticky-right px-4 py-2.5 text-right font-semibold">
                          {t("common.actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card">
                      {tickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className="border-b border-border/50 last:border-0"
                        >
                          <td className="px-4 py-2.5 font-medium tabular-nums">
                            {ticket.bxNo}
                          </td>
                          <td className="py-2.5 pr-3">
                            <StatusBadge
                              tone={ticket.direction === "purchase" ? "info" : "accent"}
                            >
                              {ticket.direction === "purchase"
                                ? t("common.purchase")
                                : t("common.sale")}
                            </StatusBadge>
                          </td>
                          <td className="py-2.5 pr-3">
                            {formatWeighDateTime(ticket.date)}
                          </td>
                          <td className="py-2.5 pr-3">{ticket.customerName}</td>
                          <td className="py-2.5 pr-3">{ticket.plate}</td>
                          <td className="py-2.5 pr-3">{ticket.materialSummary}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">
                            {formatKg(ticket.netKg)}
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">
                            {formatMoney(ticket.amount)}
                          </td>
                          <td className="py-2.5 pr-3">{ticket.contractNo}</td>
                          <td className="py-2.5 pr-3">
                            <StatusBadge
                              tone={ticket.status === "void" ? "danger" : "success"}
                            >
                              {ticketStatusLabel[ticket.status]}
                            </StatusBadge>
                          </td>
                          <td className="ui-table-sticky-right px-4 py-2.5">
                            <RowActionButtons
                              onEdit={() => setTicketEditId(ticket.id)}
                              onDelete={() =>
                                void confirmDelete(`BX${ticket.bxNo}`, () =>
                                  removeWeighTicket(ticket.id),
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScrollArea>
              )}
            </TabContentCard>
          ) : null}

          {activeTab === "payment" ? (
            <TabContentCard
              flush={payments.length > 0}
              toolbar={
                <TabPanelToolbar
                  embedded
                  title={t("transactions.paymentSection")}
                  icon={<ArrowsLeftRight size={18} weight="regular" className="text-foreground" />}
                  onAdd={() => setPaymentCreateOpen(true)}
                />
              }
            >
              {payments.length === 0 ? (
                <div className="p-4">
                  <EmptyPanel text={t("transactions.noLinkedData")} />
                </div>
              ) : (
                <TableScrollArea>
                  <table className="ui-table-hover-soft min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-chip text-left text-xs text-muted">
                        <th className="px-4 py-2.5 font-semibold">
                          {t("fields.paymentDateTime")}
                        </th>
                        <th className="py-2.5 pr-3 font-semibold">
                          {t("payments.colCategory")}
                        </th>
                        <th className="py-2.5 pr-3 font-semibold">{t("common.type")}</th>
                        <th className="py-2.5 pr-3 font-semibold">
                          {t("payments.colMiscKind")}
                        </th>
                        <th className="py-2.5 pr-3 font-semibold">
                          {t("form.relatedTicket")}
                        </th>
                        <th className="py-2.5 pr-3 font-semibold">{t("form.colMethod")}</th>
                        <th className="py-2.5 pr-3 text-right font-semibold">
                          {t("fields.amount")}
                        </th>
                        <th className="py-2.5 pr-3 font-semibold">{t("form.colParty")}</th>
                        <th className="ui-table-sticky-right px-4 py-2.5 text-right font-semibold">
                          {t("common.actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card">
                      {payments.map((p) => {
                        const ticketBx = paymentTicketBxNo(p);
                        return (
                          <tr
                            key={p.id}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="px-4 py-2.5">
                              {formatWeighDateTime(p.date)}
                            </td>
                            <td className="py-2.5 pr-3">
                              <StatusBadge tone={isMiscPayment(p) ? "info" : "default"}>
                                {isMiscPayment(p)
                                  ? t("payments.categoryMisc")
                                  : t("payments.categorySettlement")}
                              </StatusBadge>
                            </td>
                            <td className="py-2.5 pr-3">
                              <StatusBadge tone={p.type === "receipt" ? "success" : "warning"}>
                                {p.type === "receipt"
                                  ? t("common.receipt")
                                  : t("common.payment")}
                              </StatusBadge>
                            </td>
                            <td className="py-2.5 pr-3">
                              {p.miscKind ? (
                                <span className="text-sm">{localizeMiscKind(p.miscKind)}</span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td className="py-2.5 pr-3">
                              {ticketBx ? (
                                <span className="font-medium tabular-nums">BX{ticketBx}</span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td className="py-2.5 pr-3">
                              {formatPaymentMethod(p.method, t)}
                            </td>
                            <td className="py-2.5 pr-3 text-right tabular-nums">
                              <span className="font-medium">{formatMoney(p.amount)}</span>
                            </td>
                            <td className="py-2.5 pr-3">{p.counterparty}</td>
                            <td className="ui-table-sticky-right px-4 py-2.5">
                              <RowActionButtons
                                onEdit={() => setPaymentEditId(p.id)}
                                onDelete={() =>
                                  void confirmDelete(formatMoney(p.amount), () =>
                                    removePayment(p.id),
                                  )
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableScrollArea>
              )}
            </TabContentCard>
          ) : null}
          </div>
        </div>
      </div>

      <ContractDetailModal
        open={contractEditOpen}
        onClose={() => setContractEditOpen(false)}
        id={contract.id}
      />
      <CustomerDetailModal
        open={customerEditId !== null}
        onClose={() => setCustomerEditId(null)}
        id={customerEditId}
      />
      <WeighTicketCreateModal
        open={ticketCreateOpen}
        onClose={() => setTicketCreateOpen(false)}
        preset={ticketPreset}
      />
      <WeighTicketDetailModal
        open={ticketEditId !== null}
        onClose={() => setTicketEditId(null)}
        id={ticketEditId}
      />
      <PaymentCreateModal
        open={paymentCreateOpen}
        onClose={() => setPaymentCreateOpen(false)}
        preset={paymentPreset}
      />
      <PaymentDetailModal
        open={paymentEditId !== null}
        onClose={() => setPaymentEditId(null)}
        id={paymentEditId}
      />
    </>
  );
}
