"use client";

import { useMemo, useState } from "react";
import { ListPageLayout } from "@/shared/layout/ListPageLayout";
import { PageHeader } from "@/shared/ui/PageHeader";
import { DataTable, type Column } from "@/shared/ui/DataTable";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import {
  FilterBar,
  FilterField,
  filterControlClass,
} from "@/shared/ui/FilterBar";
import { PrimaryButton, RowActions, Select } from "@/shared/ui/CrudUi";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import {
  WeighTicketCreateModal,
  WeighTicketDetailModal,
} from "@/features/lazy-modals";
import { deleteConfirmMessage } from "@/shared/lib/confirm-delete";
import { formatKg, formatMoney } from "@/shared/lib/format";
import { formatWeighDateTime } from "@/shared/lib/date";
import { auditColumns, sortByCreatedAtDesc } from "@/shared/lib/list-columns";
import { useI18n } from "@/shared/i18n";
import { fieldLabels, ticketStatusLabel } from "@/shared/i18n/labels";
import { useMockStore } from "@/data/mock/store";
import type { WeighTicket } from "@/entities/types";

export default function WeighTicketsPage() {
  const { t } = useI18n();
  const { weighTickets, removeWeighTicket } = useMockStore();
  const confirm = useConfirm();
  const [keyword, setKeyword] = useState("");
  const [direction, setDirection] = useState("all");
  const [status, setStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return sortByCreatedAtDesc(
      weighTickets.filter((row) => {
        if (direction !== "all" && row.direction !== direction) return false;
        if (status !== "all" && row.status !== status) return false;
        if (
          keyword &&
          !`${row.bxNo}${row.customerName}${row.plate}${row.materialSummary}`
            .toLowerCase()
            .includes(keyword.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    );
  }, [weighTickets, keyword, direction, status]);

  async function handleDelete(row: WeighTicket) {
    const ok = await confirm(deleteConfirmMessage(`BX${row.bxNo}`));
    if (!ok) return;
    removeWeighTicket(row.id);
    if (detailId === row.id) setDetailId(null);
  }

  const columns: Column<WeighTicket>[] = [
    {
      key: "bx",
      header: fieldLabels.bxNo,
      render: (r) => <span className="font-medium tabular-nums">{r.bxNo}</span>,
    },
    {
      key: "dir",
      header: fieldLabels.direction,
      render: (r) => (
        <StatusBadge tone={r.direction === "purchase" ? "info" : "accent"}>
          {r.direction === "purchase" ? t("common.purchase") : t("common.sale")}
        </StatusBadge>
      ),
    },
    { key: "date", header: t("fields.weighDateTime"), render: (r) => formatWeighDateTime(r.date) },
    { key: "customer", header: fieldLabels.customer, render: (r) => r.customerName },
    { key: "plate", header: fieldLabels.plate, render: (r) => r.plate },
    { key: "material", header: fieldLabels.material, render: (r) => r.materialSummary },
    {
      key: "net",
      header: fieldLabels.net,
      className: "text-right",
      render: (r) => <span className="tabular-nums">{formatKg(r.netKg)}</span>,
    },
    {
      key: "amount",
      header: fieldLabels.amount,
      className: "text-right",
      render: (r) => <span className="tabular-nums">{formatMoney(r.amount)}</span>,
    },
    { key: "contract", header: fieldLabels.contractNo, render: (r) => r.contractNo },
    {
      key: "status",
      header: fieldLabels.status,
      render: (r) => (
        <StatusBadge tone={r.status === "void" ? "danger" : "success"}>
          {ticketStatusLabel[r.status]}
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
      <PageHeader
        title={t("weighTickets.title")}
        actions={
          <PrimaryButton onClick={() => setCreateOpen(true)}>{t("weighTickets.new")}</PrimaryButton>
        }
      />
      <FilterBar>
        <FilterField label={t("common.keyword")}>
          <input
            className={filterControlClass}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("form.keywordWeigh")}
          />
        </FilterField>
        <FilterField label={t("fields.direction")}>
          <Select
            size="sm"
            value={direction}
            onChange={setDirection}
            options={[
              { value: "all", label: t("common.all") },
              { value: "purchase", label: t("common.purchase") },
              { value: "sale", label: t("common.sale") },
            ]}
          />
        </FilterField>
        <FilterField label={t("common.status")}>
          <Select
            size="sm"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: t("common.all") },
              { value: "normal", label: t("status.normal") },
              { value: "void", label: t("status.void") },
            ]}
          />
        </FilterField>
      </FilterBar>
      <DataTable
        fillHeight
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetailId(r.id)}
      />
      {createOpen ? (
        <WeighTicketCreateModal
          open
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => setDetailId(id)}
        />
      ) : null}
      {detailId ? (
        <WeighTicketDetailModal
          open
          onClose={() => setDetailId(null)}
          id={detailId}
        />
      ) : null}
    </ListPageLayout>
  );
}
