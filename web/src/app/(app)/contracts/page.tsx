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
import { PrimaryButton, RowActions, Select } from "@/components/ui/CrudUi";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  ContractCreateModal,
  ContractDetailModal,
} from "@/components/entity/lazy-modals";
import { deleteConfirmMessage } from "@/lib/confirm-delete";
import { formatKg } from "@/lib/format";
import { auditColumns, sortByCreatedAtDesc } from "@/lib/list-columns";
import { useI18n } from "@/lib/i18n";
import { contractStatusLabel } from "@/lib/i18n/labels";
import { useMockStore } from "@/lib/mock-store";
import type { Contract } from "@/lib/types";

const statusTone: Record<
  string,
  "muted" | "info" | "warning" | "success" | "default"
> = {
  draft: "muted",
  active: "info",
  fulfilling: "warning",
  completed: "success",
  closed: "default",
};

export default function ContractsPage() {
  const { t } = useI18n();
  const { contracts, removeContract } = useMockStore();
  const confirm = useConfirm();
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return sortByCreatedAtDesc(
      contracts.filter((c) => {
        if (type !== "all" && c.type !== type) return false;
        if (status !== "all" && c.status !== status) return false;
        if (
          keyword &&
          !`${c.no}${c.customerName}${c.unitPriceSummary}`
            .toLowerCase()
            .includes(keyword.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    );
  }, [contracts, keyword, type, status]);

  async function handleDelete(row: Contract) {
    const ok = await confirm(deleteConfirmMessage(row.no));
    if (!ok) return;
    removeContract(row.id);
    if (detailId === row.id) setDetailId(null);
  }

  const columns: Column<Contract>[] = [
    {
      key: "no",
      header: t("contracts.colNo"),
      render: (r) => <span className="font-medium">{r.no}</span>,
    },
    {
      key: "type",
      header: t("contracts.colType"),
      render: (r) => (
        <StatusBadge tone={r.type === "purchase" ? "info" : "accent"}>
          {r.type === "purchase" ? t("common.purchase") : t("common.sale")}
        </StatusBadge>
      ),
    },
    { key: "customer", header: t("contracts.colCounterparty"), render: (r) => r.customerName },
    {
      key: "status",
      header: t("contracts.colStatus"),
      render: (r) => (
        <StatusBadge tone={statusTone[r.status]}>
          {contractStatusLabel[r.status]}
        </StatusBadge>
      ),
    },
    {
      key: "planned",
      header: t("contracts.colPlanned"),
      className: "text-right",
      render: (r) => formatKg(r.plannedKg),
    },
    {
      key: "fulfilled",
      header: t("contracts.colFulfilled"),
      className: "text-right",
      render: (r) => formatKg(r.fulfilledKg),
    },
    { key: "price", header: t("contracts.colPrice"), render: (r) => r.unitPriceSummary },
    { key: "date", header: t("fields.signedDate"), render: (r) => r.date },
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
        title={t("contracts.title")}
        actions={
          <PrimaryButton onClick={() => setCreateOpen(true)}>
            {t("contracts.new")}
          </PrimaryButton>
        }
      />
      <FilterBar>
        <FilterField label={t("common.keyword")}>
          <input
            className={filterControlClass}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("contracts.keywordPlaceholder")}
          />
        </FilterField>
        <FilterField label={t("common.type")}>
          <Select
            size="sm"
            value={type}
            onChange={setType}
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
              { value: "draft", label: t("status.draft") },
              { value: "active", label: t("status.active") },
              { value: "fulfilling", label: t("status.fulfilling") },
              { value: "completed", label: t("status.completed") },
              { value: "closed", label: t("status.closed") },
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
        <ContractCreateModal
          open
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => setDetailId(id)}
        />
      ) : null}
      {detailId ? (
        <ContractDetailModal
          open
          onClose={() => setDetailId(null)}
          id={detailId}
        />
      ) : null}
    </ListPageLayout>
  );
}
