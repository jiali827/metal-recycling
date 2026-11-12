"use client";

import { useEffect, useMemo, useState } from "react";
import { ListPageLayout } from "@/shared/layout/ListPageLayout";
import { PageHeader } from "@/shared/ui/PageHeader";
import { DataTable, type Column } from "@/shared/ui/DataTable";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import {
  FilterBar,
  FilterField,
} from "@/shared/ui/FilterBar";
import {
  DateRangePicker,
  PrimaryButton,
  RowActions,
  Select,
  TextInput
} from "@/shared/ui/CrudUi";
import {
  WeighTicketCreateModal,
  WeighTicketDetailModal,
} from "@/features/lazy-modals";
import { formatKg, formatMoney } from "@/shared/lib/format";
import { formatWeighDateTime } from "@/shared/lib/date";
import { auditColumns, sortByCreatedAtDesc } from "@/shared/lib/list-columns";
import { useI18n } from "@/shared/i18n";
import { fieldLabels, localizeWeighCustomerCategory, ticketStatusLabel } from "@/shared/i18n/labels";
import { useMockStore } from "@/data/mock/store";
import { useModulePermission } from "@/shared/config/menu-permissions";
import type { WeighTicket } from "@/entities/types";
import { CorrectionDeleteModal } from "@/features/correction/components/CorrectionDeleteModal";
import { useQueryPrefill } from "@/shared/hooks/useQueryPrefill";

function weighDateKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function WeighTicketsPage() {
  const { t } = useI18n();
  const perm = useModulePermission("weighTickets");
  const {
    weighTickets,
    customers,
    materialTypes,
  } = useMockStore();
  const [keyword, setKeyword] = useState("");
  const [direction, setDirection] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [customer, setCustomer] = useState("all");
  const [material, setMaterial] = useState("all");
  const [contractNo, setContractNo] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<{ type: "weigh-ticket"; id: string; label: string } | null>(null);

  useQueryPrefill("bxNo", setKeyword);

  const customerOptions = useMemo(() => {
    const names = [...new Set(customers.map((c) => c.name))].sort((a, b) =>
      a.localeCompare(b, "zh-HK"),
    );
    return [
      { value: "all", label: t("common.all") },
      ...names.map((name) => ({ value: name, label: name })),
    ];
  }, [customers, t]);

  const materialOptions = useMemo(() => {
    const fromMaster = materialTypes
      .filter((m) => m.enabled)
      .map((m) => m.name);
    const fromTickets = weighTickets
      .map((r) => r.materialSummary)
      .filter((name) => name && name !== "—");
    const names = [...new Set([...fromMaster, ...fromTickets])].sort((a, b) =>
      a.localeCompare(b, "zh-HK"),
    );
    return [
      { value: "all", label: t("common.all") },
      ...names.map((name) => ({ value: name, label: name })),
    ];
  }, [materialTypes, weighTickets, t]);

  const rows = useMemo(() => {
    const contractQ = contractNo.trim().toLowerCase();
    return sortByCreatedAtDesc(
      weighTickets.filter((row) => {
        if (direction !== "all" && row.direction !== direction) return false;
        if (status !== "all" && row.status !== status) return false;
        if (customer !== "all" && row.customerName !== customer) return false;
        if (material !== "all" && row.materialSummary !== material) return false;
        if (contractQ && !row.contractNo.toLowerCase().includes(contractQ)) {
          return false;
        }
        if (dateStart || dateEnd) {
          const day = weighDateKey(row.date);
          if (!day) return false;
          if (dateStart && day < dateStart) return false;
          if (dateEnd && day > dateEnd) return false;
        }
        if (
          keyword &&
          !`${row.bxNo}${row.customerName}${row.plate}${row.materialSummary}${localizeWeighCustomerCategory(row.customerCategory ?? "customer")}`
            .toLowerCase()
            .includes(keyword.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    );
  }, [
    weighTickets,
    keyword,
    direction,
    status,
    customer,
    material,
    contractNo,
    dateStart,
    dateEnd,
  ]);

  async function handleDelete(row: WeighTicket) {
    if (row.status === "void") return;
    setCorrectionTarget({ type: "weigh-ticket", id: row.id, label: `BX${row.bxNo}` });
  }

  const columns: Column<WeighTicket>[] = [
    {
      key: "customerCategory",
      header: fieldLabels.customerCategory,
      render: (r) => (
        <StatusBadge tone={r.customerCategory === "retail" ? "default" : "info"}>
          {localizeWeighCustomerCategory(r.customerCategory ?? "customer")}
        </StatusBadge>
      ),
    },
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
    {
      key: "date",
      header: t("fields.weighDateTime"),
      render: (r) => formatWeighDateTime(r.date),
    },
    {
      key: "customer",
      header: fieldLabels.customer,
      render: (r) => r.customerName,
    },
    { key: "plate", header: fieldLabels.plate, render: (r) => r.plate },
    {
      key: "material",
      header: fieldLabels.material,
      render: (r) => r.materialSummary,
    },
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
    {
      key: "contract",
      header: fieldLabels.contractNo,
      render: (r) => r.contractNo,
    },
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
          readOnly={r.status !== "pending"}
          onDelete={perm.canDelete && r.status === "pending" ? () => void handleDelete(r) : undefined}
          onCorrection={perm.canDelete && r.status === "normal" ? () => void handleDelete(r) : undefined}
        />
      ),
    },
  ];

  return (
    <ListPageLayout>
      <PageHeader
        title={t("weighTickets.title")}
        actions={
          perm.canCreate ? (
            <PrimaryButton onClick={() => setCreateOpen(true)}>
              {t("weighTickets.new")}
            </PrimaryButton>
          ) : null
        }
      />
      <CorrectionDeleteModal
        open={Boolean(correctionTarget)}
        target={correctionTarget}
        label={correctionTarget?.label ?? ""}
        onClose={() => setCorrectionTarget(null)}
        onCompleted={() => {
          if (correctionTarget && detailId === correctionTarget.id) setDetailId(null);
        }}
      />
      <FilterBar>
        <FilterField label={t("common.keyword")}>
          <TextInput
            size="sm"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("form.keywordWeigh")}
          />
        </FilterField>
        <FilterField label={t("fields.weighDateRange")} className="min-w-[220px]">
          <DateRangePicker
            size="sm"
            start={dateStart}
            end={dateEnd}
            onChange={(start, end) => {
              setDateStart(start);
              setDateEnd(end);
            }}
            className="min-w-[220px]"
            aria-label={t("fields.weighDateRange")}
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
        <FilterField label={t("fields.customer")} className="min-w-[180px]">
          <Select
            size="sm"
            value={customer}
            onChange={setCustomer}
            options={customerOptions}
          />
        </FilterField>
        <FilterField label={t("fields.material")} className="min-w-[140px]">
          <Select
            size="sm"
            value={material}
            onChange={setMaterial}
            options={materialOptions}
          />
        </FilterField>
        <FilterField label={t("fields.contractNo")}>
          <TextInput
            size="sm"
            value={contractNo}
            onChange={(e) => setContractNo(e.target.value)}
            placeholder={t("form.keywordContractNo")}
          />
        </FilterField>
        <FilterField label={t("common.status")}>
          <Select
            size="sm"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: t("common.all") },
              { value: "pending", label: t("status.pending") },
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
          readOnly={!perm.canEdit}
          open
          onClose={() => setDetailId(null)}
          id={detailId}
        />
      ) : null}
    </ListPageLayout>
  );
}
