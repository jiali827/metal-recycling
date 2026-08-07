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
  PrimaryButton,
  RowActions,
  Select,
  TextInput
} from "@/shared/ui/CrudUi";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import {
  PurchaseContractCreateModal,
  PurchaseContractDetailModal,
  SaleContractCreateModal,
  SaleContractDetailModal,
} from "@/features/lazy-modals";
import { deleteConfirmMessage } from "@/shared/lib/confirm-delete";
import {
  contractStatusTone,
  purchaseValidityTone,
  saleFulfillmentTone,
} from "@/entities/contract/status";
import {
  purchaseMaterialSummary,
  purchasePriceSummary,
  purchaseValidity,
  saleFulfilledKgTotal,
  saleFulfillmentPhase,
  saleMaterialSummary,
  salePlannedKgTotal,
  saleProgressPercent,
  saleTotalAmount,
} from "@/entities/contract/summaries";
import { formatKg, formatMoney } from "@/shared/lib/format";
import { todayISO } from "@/shared/lib/date";
import { auditColumns, sortByCreatedAtDesc } from "@/shared/lib/list-columns";
import { useI18n } from "@/shared/i18n";
import { contractStatusLabel } from "@/shared/i18n/labels";
import { useMockStore } from "@/data/mock/store";
import { useModulePermission } from "@/shared/config/menu-permissions";
import type { PurchaseContract, PurchasePriceMode, SaleContract } from "@/entities/types";

const TAB_KEY = "bx-contracts-tab";
type Tab = "purchase" | "sale";

function purchaseStatusLabel(
  status: string,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (status === "active") return t("contracts.statusEnabled");
  return contractStatusLabel[status] ?? status;
}

function purchaseValidityLabel(
  v: ReturnType<typeof purchaseValidity>,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (v === "expired") return t("contracts.validityExpired");
  if (v === "no_expiry") return t("contracts.validityNoExpiry");
  return t("contracts.validityInForce");
}

function saleFulfillmentLabel(
  phase: ReturnType<typeof saleFulfillmentPhase>,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (phase === "in_progress") return t("contracts.fulfillmentInProgress");
  if (phase === "ready") return t("contracts.fulfillmentReady");
  if (phase === "over") return t("contracts.fulfillmentOver");
  return t("contracts.fulfillmentNone");
}

export default function ContractsPage() {
  const { t } = useI18n();
  const perm = useModulePermission("contracts");
  const {
    purchaseContracts,
    saleContracts,
    removePurchaseContract,
    removeSaleContract,
  } = useMockStore();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("purchase");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [derivedFilter, setDerivedFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TAB_KEY);
      if (saved === "purchase" || saved === "sale") setTab(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function changeTab(next: string) {
    const v = next as Tab;
    setTab(v);
    setKeyword("");
    setStatus("all");
    setDerivedFilter("all");
    setDetailId(null);
    try {
      window.localStorage.setItem(TAB_KEY, v);
    } catch {
      /* ignore */
    }
  }

  const priceModeLabel = (mode: PurchasePriceMode) => {
    if (mode === "ex_yard") return t("contracts.priceModeExYard");
    if (mode === "collect") return t("contracts.priceModeCollect");
    return t("contracts.priceModeOther");
  };

  const purchaseRows = useMemo(() => {
    const today = todayISO();
    return sortByCreatedAtDesc(
      purchaseContracts.filter((c) => {
        if (status !== "all" && c.status !== status) return false;
        if (derivedFilter !== "all" && purchaseValidity(c, today) !== derivedFilter) {
          return false;
        }
        const hay = `${c.no}${c.customerName}${purchaseMaterialSummary(c.lines)}${purchasePriceSummary(c.lines, priceModeLabel)}`;
        if (keyword && !hay.toLowerCase().includes(keyword.toLowerCase())) return false;
        return true;
      }),
    );
  }, [purchaseContracts, keyword, status, derivedFilter, t]);

  const saleRows = useMemo(() => {
    return sortByCreatedAtDesc(
      saleContracts.filter((c) => {
        if (status !== "all" && c.status !== status) return false;
        if (derivedFilter !== "all" && saleFulfillmentPhase(c) !== derivedFilter) {
          return false;
        }
        const hay = `${c.no}${c.customerName}${saleMaterialSummary(c.lines)}`;
        if (keyword && !hay.toLowerCase().includes(keyword.toLowerCase())) return false;
        return true;
      }),
    );
  }, [saleContracts, keyword, status, derivedFilter]);

  async function handleDeletePurchase(row: PurchaseContract) {
    const ok = await confirm(deleteConfirmMessage(row.no));
    if (!ok) return;
    removePurchaseContract(row.id);
    if (detailId === row.id) setDetailId(null);
  }

  async function handleDeleteSale(row: SaleContract) {
    const ok = await confirm(deleteConfirmMessage(row.no));
    if (!ok) return;
    const removed = removeSaleContract(row.id);
    if (!removed) {
      void confirm({
        alert: true,
        message: t("contracts.cannotDeleteLinked"),
      });
      return;
    }
    if (detailId === row.id) setDetailId(null);
  }

  const purchaseColumns: Column<PurchaseContract>[] = [
    {
      key: "no",
      header: t("contracts.colNo"),
      render: (r) => <span className="font-medium">{r.no}</span>,
    },
    { key: "customer", header: t("contracts.colCounterparty"), render: (r) => r.customerName },
    {
      key: "material",
      header: t("contracts.colMaterial"),
      render: (r) => purchaseMaterialSummary(r.lines),
    },
    {
      key: "price",
      header: t("contracts.colPrice"),
      render: (r) => purchasePriceSummary(r.lines, priceModeLabel),
    },
    {
      key: "validUntil",
      header: t("contracts.validUntil"),
      render: (r) => r.validUntil ?? "—",
    },
    {
      key: "status",
      header: t("contracts.colStatus"),
      render: (r) => (
        <StatusBadge tone={contractStatusTone(r.status)}>
          {purchaseStatusLabel(r.status, t)}
        </StatusBadge>
      ),
    },
    {
      key: "validity",
      header: t("contracts.validity"),
      render: (r) => {
        const v = purchaseValidity(r, todayISO());
        return (
          <StatusBadge tone={purchaseValidityTone(v)}>
            {purchaseValidityLabel(v, t)}
          </StatusBadge>
        );
      },
    },
    { key: "date", header: t("contracts.quotedOn"), render: (r) => r.quotedOn },
    {
      key: "attachment",
      header: t("contracts.colAttachment"),
      render: (r) => (r.attachmentName ? t("common.yes") : t("common.no")),
    },
    ...auditColumns(t),
    {
      key: "actions",
      header: t("common.actions"),
      stopRowClick: true,
      render: (r) => (
        <RowActions
          onDetail={() => setDetailId(r.id)}
          onDelete={perm.canDelete ? () => void handleDeletePurchase(r) : undefined}
        />
      ),
    },
  ];

  const saleColumns: Column<SaleContract>[] = [
    {
      key: "no",
      header: t("contracts.colNo"),
      render: (r) => <span className="font-medium">{r.no}</span>,
    },
    { key: "customer", header: t("contracts.colCounterparty"), render: (r) => r.customerName },
    {
      key: "material",
      header: t("contracts.colMaterial"),
      render: (r) => saleMaterialSummary(r.lines),
    },
    {
      key: "planned",
      header: t("contracts.colPlanned"),
      className: "text-right",
      render: (r) => formatKg(salePlannedKgTotal(r.lines)),
    },
    {
      key: "fulfilled",
      header: t("contracts.colFulfilled"),
      className: "text-right",
      render: (r) => formatKg(saleFulfilledKgTotal(r.lines)),
    },
    {
      key: "progress",
      header: t("contracts.colProgress"),
      className: "text-right",
      render: (r) => `${saleProgressPercent(r.lines).toFixed(0)}%`,
    },
    {
      key: "total",
      header: t("contracts.totalAmount"),
      className: "text-right",
      render: (r) => formatMoney(saleTotalAmount(r), r.currency),
    },
    { key: "fulfillBy", header: t("contracts.fulfillBy"), render: (r) => r.fulfillBy ?? "—" },
    {
      key: "status",
      header: t("contracts.colStatus"),
      render: (r) => (
        <StatusBadge tone={contractStatusTone(r.status)}>
          {contractStatusLabel[r.status]}
        </StatusBadge>
      ),
    },
    {
      key: "fulfillment",
      header: t("contracts.fulfillment"),
      render: (r) => {
        const phase = saleFulfillmentPhase(r);
        return (
          <StatusBadge tone={saleFulfillmentTone(phase)}>
            {saleFulfillmentLabel(phase, t)}
          </StatusBadge>
        );
      },
    },
    { key: "date", header: t("fields.signedDate"), render: (r) => r.signedOn },
    ...auditColumns(t),
    {
      key: "actions",
      header: t("common.actions"),
      stopRowClick: true,
      render: (r) => (
        <RowActions
          onDetail={() => setDetailId(r.id)}
          onDelete={perm.canDelete ? () => void handleDeleteSale(r) : undefined}
        />
      ),
    },
  ];

  const purchaseStatusOptions = [
    { value: "all", label: t("common.all") },
    { value: "draft", label: t("status.draft") },
    { value: "active", label: t("contracts.statusEnabled") },
    { value: "closed", label: t("status.closed") },
  ];

  const saleStatusOptions = [
    { value: "all", label: t("common.all") },
    { value: "draft", label: t("status.draft") },
    { value: "active", label: t("status.active") },
    { value: "completed", label: t("status.completed") },
    { value: "closed", label: t("status.closed") },
  ];

  const purchaseValidityOptions = [
    { value: "all", label: t("common.all") },
    { value: "in_force", label: t("contracts.validityInForce") },
    { value: "expired", label: t("contracts.validityExpired") },
    { value: "no_expiry", label: t("contracts.validityNoExpiry") },
  ];

  const saleFulfillmentOptions = [
    { value: "all", label: t("common.all") },
    { value: "none", label: t("contracts.fulfillmentNone") },
    { value: "in_progress", label: t("contracts.fulfillmentInProgress") },
    { value: "ready", label: t("contracts.fulfillmentReady") },
    { value: "over", label: t("contracts.fulfillmentOver") },
  ];

  return (
    <ListPageLayout>
      <PageHeader
        title={
          <div
            role="tablist"
            aria-label={t("contracts.title")}
            className="flex items-end gap-5"
          >
            {(
              [
                { value: "purchase" as const, label: t("contracts.purchaseTab") },
                { value: "sale" as const, label: t("contracts.saleTab") },
              ] as const
            ).map((opt) => {
              const active = tab === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => changeTab(opt.value)}
                  className={`relative pb-1 text-xl font-semibold tracking-tight transition-colors ${
                    active
                      ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        }
        actions={perm.canCreate ? (
          <PrimaryButton onClick={() => setCreateOpen(true)}>
            {tab === "purchase" ? t("contracts.newPurchase") : t("contracts.newSale")}
          </PrimaryButton>
        ) : null}
      />
      <FilterBar>
        <FilterField label={t("common.keyword")}>
          <TextInput
            size="sm"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("contracts.keywordPlaceholder")}
          />
        </FilterField>
        <FilterField label={t("common.status")}>
          <Select
            size="sm"
            value={status}
            onChange={setStatus}
            options={tab === "purchase" ? purchaseStatusOptions : saleStatusOptions}
          />
        </FilterField>
        <FilterField
          label={tab === "purchase" ? t("contracts.validity") : t("contracts.fulfillment")}
        >
          <Select
            size="sm"
            value={derivedFilter}
            onChange={setDerivedFilter}
            options={tab === "purchase" ? purchaseValidityOptions : saleFulfillmentOptions}
          />
        </FilterField>
      </FilterBar>
      {tab === "purchase" ? (
        <DataTable
          fillHeight
          columns={purchaseColumns}
          rows={purchaseRows}
          rowKey={(r) => r.id}
          onRowClick={(r) => setDetailId(r.id)}
        />
      ) : (
        <DataTable
          fillHeight
          columns={saleColumns}
          rows={saleRows}
          rowKey={(r) => r.id}
          onRowClick={(r) => setDetailId(r.id)}
        />
      )}
      {createOpen && tab === "purchase" ? (
        <PurchaseContractCreateModal
          open
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => setDetailId(id)}
        />
      ) : null}
      {createOpen && tab === "sale" ? (
        <SaleContractCreateModal
          open
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => setDetailId(id)}
        />
      ) : null}
      {detailId && tab === "purchase" ? (
        <PurchaseContractDetailModal readOnly={!perm.canEdit}
          open
          onClose={() => setDetailId(null)}
          id={detailId}
        />
      ) : null}
      {detailId && tab === "sale" ? (
        <SaleContractDetailModal readOnly={!perm.canEdit} open onClose={() => setDetailId(null)} id={detailId} />
      ) : null}
    </ListPageLayout>
  );
}
