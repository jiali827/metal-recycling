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
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ContractDetailModal } from "@/components/entity/ContractModals";
import { CustomerDetailModal } from "@/components/entity/CustomerModals";
import { PaymentCreateModal, PaymentDetailModal } from "@/components/entity/PaymentModals";
import {
  WeighTicketCreateModal,
  WeighTicketDetailModal,
} from "@/components/entity/WeighTicketModals";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableScrollArea } from "@/components/ui/TableScrollArea";
import { deleteConfirmMessage } from "@/lib/confirm-delete";
import { formatKg, formatMoney } from "@/lib/format";
import { formatWeighDateTime } from "@/lib/date";
import { useI18n, localizeAllocationSummary } from "@/lib/i18n";
import {
  contractStatusLabel,
  ticketStatusLabel,
} from "@/lib/i18n/labels";
import { useMockStore } from "@/lib/mock-store";
import type { ContractTrace } from "@/lib/transaction-trace";

type DetailTab = "contract" | "customer" | "weigh" | "payment";

function TraceStep({
  label,
  done,
  active,
}: {
  label: string;
  done: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
          done
            ? "bg-brand text-white"
            : active
              ? "border-2 border-brand bg-brand-soft text-brand"
              : "bg-chip text-muted"
        }`}
      >
        {done ? "✓" : "·"}
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
      <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] bg-brand-soft text-brand">
        {icon}
      </span>
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
      <div className="border-b border-border px-4 py-3">{toolbar}</div>
      <div className={flush ? "" : "px-1 py-1 sm:px-2"}>{children}</div>
    </div>
  );
}

/** Read-only field: quiet label + value, no chip cards */
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
    <div className={`px-3 py-3 ${className}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1.5 text-sm font-medium leading-snug text-foreground">
        {children}
      </dd>
    </div>
  );
}

function InfoGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid sm:grid-cols-2 sm:gap-x-6 [&>*]:border-b [&>*]:border-border/70">
      {children}
    </dl>
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
    contracts: allContracts,
    removeWeighTicket,
    removePayment,
  } = useMockStore();

  const { contract, customer, tickets, settlements, payments, summary } = trace;

  const [activeTab, setActiveTab] = useState<DetailTab>("contract");
  const [contractEditOpen, setContractEditOpen] = useState(false);
  const [customerEditId, setCustomerEditId] = useState<string | null>(null);
  const [ticketCreateOpen, setTicketCreateOpen] = useState(false);
  const [ticketEditId, setTicketEditId] = useState<string | null>(null);
  const [paymentCreateOpen, setPaymentCreateOpen] = useState(false);
  const [paymentEditId, setPaymentEditId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab("contract");
  }, [contract.id]);

  const ticketPreset = useMemo(
    () => ({
      contractNo: contract.no,
      direction: contract.type,
      customerName: contract.customerName,
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
        { id: "contract" as const, label: t("transactions.contractSection") },
        { id: "customer" as const, label: t("transactions.customerSection") },
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
      <div className="space-y-4">
        <div className="ui-card overflow-hidden">
          <div className="border-b border-border bg-gradient-to-r from-brand-soft/40 to-card px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {contract.no}
                </h2>
                <StatusBadge tone={contract.type === "purchase" ? "info" : "accent"}>
                  {contract.type === "purchase" ? t("common.purchase") : t("common.sale")}
                </StatusBadge>
                <StatusBadge>{contractStatusLabel[contract.status]}</StatusBadge>
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

          <div className="mt-4 flex items-center gap-2">
            <TraceStep label={t("transactions.stepContract")} done />
            <div className="h-px flex-1 bg-border" />
            <TraceStep
              label={t("transactions.stepWeigh")}
              done={hasWeigh}
              active={!hasWeigh}
            />
            <div className="h-px flex-1 bg-border" />
            <TraceStep
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
              className={`px-4 py-3 ${i > 0 ? "border-l border-border" : ""}`}
            >
              <div className="text-[11px] text-muted">{item.label}</div>
              <div className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
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

          <div className="pt-4" role="tabpanel">
          {activeTab === "contract" ? (
            <TabContentCard
              toolbar={
                <TabPanelToolbar
                  embedded
                  title={t("transactions.contractSection")}
                  icon={<FileText size={18} weight="duotone" />}
                  onEdit={() => setContractEditOpen(true)}
                />
              }
            >
              <InfoGrid>
                <InfoCell label={t("fields.contractNo")}>{contract.no}</InfoCell>
                <InfoCell label={t("fields.signedDate")}>{contract.date}</InfoCell>
                <InfoCell label={t("common.type")}>
                  {contract.type === "purchase" ? t("common.purchase") : t("common.sale")}
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
                <InfoCell label={t("transactions.fulfillment")}>
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-chip">
                      <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${Math.min(100, summary.fulfillmentPct)}%` }}
                      />
                    </div>
                    <span className="shrink-0 tabular-nums text-brand">
                      {summary.fulfillmentPct.toFixed(0)}%
                    </span>
                  </div>
                </InfoCell>
                <InfoCell label={t("contracts.colPrice")} className="sm:col-span-2">
                  {contract.unitPriceSummary}
                </InfoCell>
                {contract.attachmentName ? (
                  <InfoCell label={t("transactions.contractAttachment")} className="sm:col-span-2">
                    {contract.attachmentName}
                  </InfoCell>
                ) : null}
              </InfoGrid>
            </TabContentCard>
          ) : null}

          {activeTab === "customer" ? (
            <TabContentCard
              toolbar={
                <TabPanelToolbar
                  embedded
                  title={t("transactions.customerSection")}
                  icon={<UserCircle size={18} weight="duotone" />}
                  onEdit={customer ? () => setCustomerEditId(customer.id) : undefined}
                />
              }
            >
              {!customer ? (
                <div className="rounded-[var(--radius-control)] border border-dashed border-border bg-chip/30 px-4 py-10 text-center">
                  <p className="text-sm text-muted">{t("transactions.customerLinkHint")}</p>
                  <button
                    type="button"
                    className="ui-btn-primary mt-4 text-sm"
                    onClick={() => {
                      setActiveTab("contract");
                      setContractEditOpen(true);
                    }}
                  >
                    {t("transactions.customerLinkAction")}
                  </button>
                </div>
              ) : (
                <InfoGrid>
                  <InfoCell label={t("common.name")}>{customer.name}</InfoCell>
                  <InfoCell label={t("common.category")}>{customer.category}</InfoCell>
                  <InfoCell label={t("common.contact")}>{customer.contact ?? "-"}</InfoCell>
                  <InfoCell label={t("transactions.relatedContractCount")}>
                    {customerContractCount}
                  </InfoCell>
                  <InfoCell label={t("transactions.ticketCount")}>
                    {summary.normalTicketCount}
                  </InfoCell>
                  <InfoCell label={t("transactions.totalAmount")}>
                    {formatMoney(summary.totalAmount)}
                  </InfoCell>
                  <InfoCell label={t("transactions.balance")}>
                    {formatMoney(summary.balance)}
                  </InfoCell>
                  <InfoCell label={t("form.counterpartyCustomer")} className="sm:col-span-2">
                    {contract.customerName}
                  </InfoCell>
                </InfoGrid>
              )}
            </TabContentCard>
          ) : null}

          {activeTab === "weigh" ? (
            <TabContentCard
              flush={tickets.length > 0}
              toolbar={
                <TabPanelToolbar
                  embedded
                  title={t("transactions.weighSection")}
                  icon={<Scales size={18} weight="duotone" />}
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
                      <tr className="border-b border-border bg-chip/50 text-left text-xs text-muted">
                        <th className="px-4 py-2.5 font-semibold">{t("fields.bxNo")}</th>
                        <th className="py-2.5 pr-3 font-semibold">{t("common.date")}</th>
                        <th className="py-2.5 pr-3 font-semibold">{t("fields.plate")}</th>
                        <th className="py-2.5 pr-3 text-right font-semibold">
                          {t("fields.net")}
                        </th>
                        <th className="py-2.5 pr-3 text-right font-semibold">
                          {t("fields.amount")}
                        </th>
                        <th className="py-2.5 pr-3 font-semibold">{t("common.status")}</th>
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
                            BX{ticket.bxNo}
                          </td>
                          <td className="py-2.5 pr-3">{formatWeighDateTime(ticket.date)}</td>
                          <td className="py-2.5 pr-3">{ticket.plate}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">
                            {formatKg(ticket.netKg)}
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">
                            {formatMoney(ticket.amount)}
                          </td>
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
                  icon={<ArrowsLeftRight size={18} weight="duotone" />}
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
                      <tr className="border-b border-border bg-chip/50 text-left text-xs text-muted">
                        <th className="px-4 py-2.5 font-semibold">{t("common.date")}</th>
                        <th className="py-2.5 pr-3 font-semibold">{t("common.type")}</th>
                        <th className="py-2.5 pr-3 text-right font-semibold">
                          {t("fields.amount")}
                        </th>
                        <th className="py-2.5 pr-3 font-semibold">
                          {t("transactions.allocation")}
                        </th>
                        <th className="ui-table-sticky-right px-4 py-2.5 text-right font-semibold">
                          {t("common.actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card">
                      {payments.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-border/50 last:border-0"
                        >
                          <td className="px-4 py-2.5">{formatWeighDateTime(p.date)}</td>
                          <td className="py-2.5 pr-3">
                            <StatusBadge tone={p.type === "receipt" ? "success" : "warning"}>
                              {p.type === "receipt"
                                ? t("common.receipt")
                                : t("common.payment")}
                            </StatusBadge>
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">
                            {formatMoney(p.amount)}
                          </td>
                          <td className="py-2.5 pr-3 text-muted">
                            {localizeAllocationSummary(p.allocationSummary)}
                          </td>
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
                      ))}
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
