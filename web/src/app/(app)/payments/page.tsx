"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CaretDown,
  CaretUp,
  CurrencyCircleDollar,
  Wallet,
} from "@phosphor-icons/react";
import { ListPageLayout } from "@/shared/layout/ListPageLayout";
import { PageHeader } from "@/shared/ui/PageHeader";
import { DataTable, type Column } from "@/shared/ui/DataTable";
import { StatCard } from "@/shared/ui/StatCard";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import {
  FilterBar,
  FilterField,
  filterControlClass,
} from "@/shared/ui/FilterBar";
import { PrimaryButton, RowActions, Select } from "@/shared/ui/CrudUi";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import {
  PaymentCreateModal,
  PaymentDetailModal,
} from "@/features/lazy-modals";
import { deleteConfirmMessage } from "@/shared/lib/confirm-delete";
import { formatMoney } from "@/shared/lib/format";
import { formatWeighDateTime } from "@/shared/lib/date";
import { auditColumns, sortByCreatedAtDesc } from "@/shared/lib/list-columns";
import { isMiscPayment } from "@/entities/payment/meta";
import { aggregatePaymentStructure } from "@/entities/payment/structure";
import { paymentTicketBxNo } from "@/entities/settlement";
import { localizeMiscKind, useI18n } from "@/shared/i18n";
import { useMockStore } from "@/data/mock/store";
import type { PaymentRecord } from "@/entities/types";

const SUMMARY_EXPANDED_KEY = "bx-payments-summary-expanded";

function formatPaymentMethod(
  method: string,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (method === "現金" || method === "现金") return t("form.methodCash");
  if (method === "支票") return t("form.methodCheque");
  if (method === "轉賬" || method === "转账") return t("form.methodTransfer");
  return method;
}

function readSummaryExpanded(): boolean {
  try {
    const raw = window.localStorage.getItem(SUMMARY_EXPANDED_KEY);
    if (raw === "0" || raw === "false") return false;
    if (raw === "1" || raw === "true") return true;
  } catch {
    /* ignore */
  }
  return true;
}

function writeSummaryExpanded(expanded: boolean) {
  try {
    window.localStorage.setItem(SUMMARY_EXPANDED_KEY, expanded ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export default function PaymentsPage() {
  const { t } = useI18n();
  const { payments, removePayment } = useMockStore();
  const confirm = useConfirm();
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  useEffect(() => {
    setSummaryExpanded(readSummaryExpanded());
  }, []);

  const rows = useMemo(() => {
    return sortByCreatedAtDesc(
      payments.filter((p) => {
        if (type !== "all" && p.type !== type) return false;
        if (category !== "all" && p.category !== category) return false;
        const bx = paymentTicketBxNo(p);
        if (
          keyword &&
          !`${p.counterparty}${p.allocationSummary}${p.method}${p.miscKind ?? ""}${bx}`
            .toLowerCase()
            .includes(keyword.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    );
  }, [payments, keyword, type, category]);

  const structure = useMemo(() => aggregatePaymentStructure(rows), [rows]);
  const summaryKey = `${keyword}|${type}|${category}|${rows.length}|${structure.settlementIn}|${structure.miscOut}`;

  function toggleSummary() {
    setSummaryExpanded((prev) => {
      const next = !prev;
      writeSummaryExpanded(next);
      return next;
    });
  }

  async function handleDelete(row: PaymentRecord) {
    const label = `${row.type === "receipt" ? t("common.receipt") : t("common.payment")} ${formatMoney(row.amount)}`;
    const ok = await confirm(deleteConfirmMessage(label));
    if (!ok) return;
    removePayment(row.id);
    if (detailId === row.id) setDetailId(null);
  }

  const columns: Column<PaymentRecord>[] = [
    {
      key: "date",
      header: t("fields.paymentDateTime"),
      render: (r) => formatWeighDateTime(r.date),
    },
    {
      key: "category",
      header: t("payments.colCategory"),
      render: (r) => (
        <StatusBadge tone={isMiscPayment(r) ? "info" : "default"}>
          {isMiscPayment(r)
            ? t("payments.categoryMisc")
            : t("payments.categorySettlement")}
        </StatusBadge>
      ),
    },
    {
      key: "type",
      header: t("common.type"),
      render: (r) => (
        <StatusBadge tone={r.type === "receipt" ? "success" : "warning"}>
          {r.type === "receipt" ? t("common.receipt") : t("common.payment")}
        </StatusBadge>
      ),
    },
    {
      key: "miscKind",
      header: t("payments.colMiscKind"),
      render: (r) =>
        r.miscKind ? (
          <span className="text-sm">{localizeMiscKind(r.miscKind)}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "ticket",
      header: t("form.relatedTicket"),
      render: (r) => {
        const bx = paymentTicketBxNo(r);
        return bx ? (
          <span className="font-medium tabular-nums">BX{bx}</span>
        ) : (
          <span className="text-muted">—</span>
        );
      },
    },
    {
      key: "method",
      header: t("form.colMethod"),
      render: (r) => formatPaymentMethod(r.method, t),
    },
    {
      key: "amount",
      header: t("fields.amount"),
      className: "text-right",
      render: (r) => (
        <span className="font-medium tabular-nums">{formatMoney(r.amount)}</span>
      ),
    },
    { key: "party", header: t("form.colParty"), render: (r) => r.counterparty },
    ...auditColumns(t),
    {
      key: "actions",
      header: t("common.actions"),
      stopRowClick: true,
      render: (r) => (
        <RowActions
          onDetail={() => setDetailId(r.id)}
          onDelete={() => void handleDelete(r)}
        />
      ),
    },
  ];

  const summaryCards = [
    {
      label: t("payments.summarySettlementIn"),
      raw: structure.settlementIn,
      icon: <ArrowUpRight size={20} weight="bold" />,
      iconTone: "success" as const,
    },
    {
      label: t("payments.summarySettlementOut"),
      raw: structure.settlementOut,
      icon: <ArrowDownLeft size={20} weight="bold" />,
      iconTone: "warning" as const,
    },
    {
      label: t("payments.summaryMiscIn"),
      raw: structure.miscIn,
      icon: <CurrencyCircleDollar size={20} weight="fill" />,
      iconTone: "info" as const,
    },
    {
      label: t("payments.summaryMiscOut"),
      raw: structure.miscOut,
      icon: <Wallet size={20} weight="fill" />,
      iconTone: "danger" as const,
    },
  ] as const;

  return (
    <ListPageLayout>
      <PageHeader
        title={t("payments.title")}
        actions={
          <PrimaryButton onClick={() => setCreateOpen(true)}>
            {t("payments.new")}
          </PrimaryButton>
        }
      />

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            {t("payments.summaryTitle")}
          </h2>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-[var(--radius-control)] px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-chip hover:text-foreground"
            onClick={toggleSummary}
            aria-expanded={summaryExpanded}
          >
            {summaryExpanded
              ? t("payments.summaryCollapse")
              : t("payments.summaryExpand")}
            {summaryExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
          </button>
        </div>
        {summaryExpanded ? (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <StatCard
                key={card.label}
                label={card.label}
                value={formatMoney(card.raw)}
                rawValue={card.raw}
                formatRaw={formatMoney}
                replayKey={summaryKey}
                icon={card.icon}
                iconTone={card.iconTone}
              />
            ))}
          </div>
        ) : null}
      </div>

      <FilterBar>
        <FilterField label={t("common.keyword")}>
          <input
            className={filterControlClass}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("form.keywordPayment")}
          />
        </FilterField>
        <FilterField label={t("payments.colCategory")}>
          <Select
            size="sm"
            value={category}
            onChange={setCategory}
            options={[
              { value: "all", label: t("common.all") },
              { value: "settlement", label: t("payments.categorySettlement") },
              { value: "misc", label: t("payments.categoryMisc") },
            ]}
          />
        </FilterField>
        <FilterField label={t("common.type")}>
          <Select
            size="sm"
            value={type}
            onChange={setType}
            options={[
              { value: "all", label: t("common.all") },
              { value: "receipt", label: t("common.receipt") },
              { value: "payment", label: t("common.payment") },
            ]}
          />
        </FilterField>
      </FilterBar>
      <DataTable fillHeight
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetailId(r.id)}
      />
      {createOpen ? (
        <PaymentCreateModal
          open
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => setDetailId(id)}
        />
      ) : null}
      {detailId ? (
        <PaymentDetailModal
          open
          onClose={() => setDetailId(null)}
          id={detailId}
        />
      ) : null}
    </ListPageLayout>
  );
}
