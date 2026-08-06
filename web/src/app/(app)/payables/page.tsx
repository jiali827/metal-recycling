"use client";

import { useMemo, useState } from "react";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  FilterBar,
  FilterField,
  filterControlClass,
} from "@/components/ui/FilterBar";
import { RowActions, Select } from "@/components/ui/CrudUi";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { PayableDetailModal } from "@/components/entity/lazy-modals";
import { deleteConfirmMessage } from "@/lib/confirm-delete";
import { formatMoney } from "@/lib/format";
import { auditColumns, sortByCreatedAtDesc } from "@/lib/list-columns";
import { useI18n } from "@/lib/i18n";
import { settlementStatusLabel } from "@/lib/i18n/labels";
import { useMockStore } from "@/lib/mock-store";
import type { ArApItem } from "@/lib/types";

const toneMap = {
  open: "warning",
  partial: "info",
  settled: "success",
  void: "danger",
} as const;

export default function PayablesPage() {
  const { t } = useI18n();
  const { payables, removePayable } = useMockStore();
  const confirm = useConfirm();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return sortByCreatedAtDesc(
      payables.filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (
          keyword &&
          !`${r.ticketBxNo}${r.customerName}`
            .toLowerCase()
            .includes(keyword.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    );
  }, [payables, keyword, status]);

  async function handleDelete(row: ArApItem) {
    const ok = await confirm(deleteConfirmMessage(`BX${row.ticketBxNo}`));
    if (!ok) return;
    removePayable(row.id);
    if (detailId === row.id) setDetailId(null);
  }

  const columns: Column<ArApItem>[] = [
    {
      key: "bx",
      header: t("form.relatedTicket"),
      render: (r) => (
        <span className="font-medium tabular-nums">{r.ticketBxNo}</span>
      ),
    },
    { key: "customer", header: t("form.colSupplier"), render: (r) => r.customerName },
    { key: "date", header: t("fields.arApDate"), render: (r) => r.date },
    {
      key: "amount",
      header: t("fields.amount"),
      className: "text-right",
      render: (r) => formatMoney(r.amount),
    },
    {
      key: "settled",
      header: t("form.colSettled"),
      className: "text-right",
      render: (r) => formatMoney(r.settledAmount),
    },
    {
      key: "balance",
      header: t("form.colBalance"),
      className: "text-right",
      render: (r) => (
        <span className="font-medium tabular-nums">{formatMoney(r.balance)}</span>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      render: (r) => (
        <StatusBadge tone={toneMap[r.status]}>
          {settlementStatusLabel[r.status]}
        </StatusBadge>
      ),
    },
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

  return (
    <ListPageLayout>
      <PageHeader title={t("payables.title")} />
      <p className="mb-4 -mt-2 text-xs text-muted">{t("form.arApAutoHint")}</p>
      <FilterBar>
        <FilterField label={t("common.keyword")}>
          <input
            className={filterControlClass}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("form.keywordPayable")}
          />
        </FilterField>
        <FilterField label={t("common.status")}>
          <Select
            size="sm"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: t("common.all") },
              { value: "open", label: t("status.open") },
              { value: "partial", label: t("status.partial") },
              { value: "settled", label: t("status.settled") },
              { value: "void", label: t("status.void") },
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
      {detailId ? (
        <PayableDetailModal
          open
          onClose={() => setDetailId(null)}
          id={detailId}
        />
      ) : null}
    </ListPageLayout>
  );
}
