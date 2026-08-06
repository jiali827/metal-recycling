"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CaretDown,
  CaretUp,
  CheckCircle,
  CirclesThree,
  CurrencyCircleDollar,
  Scales,
  WarningCircle,
  XCircle,
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
  CustomerCreateModal,
  CustomerDetailModal,
} from "@/features/lazy-modals";
import { deleteConfirmMessage } from "@/shared/lib/confirm-delete";
import {
  buildCustomerSettlementMap,
  getCustomerSettlement,
  summarizeSettlements,
  type CustomerSettleStatus,
} from "@/entities/settlement/customer-settlement";
import { formatMoney } from "@/shared/lib/format";
import { getSettlementStatusLabel, useI18n } from "@/shared/i18n";
import { auditColumns, sortByCreatedAtDesc } from "@/shared/lib/list-columns";
import { useMockStore } from "@/data/mock/store";
import type { Customer } from "@/entities/types";

const SUMMARY_EXPANDED_KEY = "bx-customers-summary-expanded";

function settleTone(
  status: CustomerSettleStatus,
): "default" | "success" | "warning" | "info" | "danger" {
  if (status === "settled") return "success";
  if (status === "partial") return "warning";
  if (status === "open") return "danger";
  return "default";
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

export default function CustomersPage() {
  const { t } = useI18n();
  const {
    customers,
    customerCategories,
    receivables,
    payables,
    removeCustomer,
  } = useMockStore();
  const confirm = useConfirm();
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  useEffect(() => {
    setSummaryExpanded(readSummaryExpanded());
  }, []);

  const settlementMap = useMemo(
    () => buildCustomerSettlementMap(receivables, payables),
    [receivables, payables],
  );

  const statusLabel = getSettlementStatusLabel();

  const categoryFilterOptions = useMemo(() => {
    const names = new Set(customerCategories.map((item) => item.name));
    for (const customer of customers) {
      if (customer.category) names.add(customer.category);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "zh-Hans"));
  }, [customerCategories, customers]);

  const rows = useMemo(() => {
    return sortByCreatedAtDesc(
      customers.filter((c) => {
        if (category !== "all" && c.category !== category) return false;
        if (
          keyword &&
          !`${c.name}${c.contact ?? ""}`
            .toLowerCase()
            .includes(keyword.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    );
  }, [customers, keyword, category]);

  const summary = useMemo(
    () =>
      summarizeSettlements(
        settlementMap,
        rows.map((r) => r.name),
      ),
    [settlementMap, rows],
  );

  const summaryKey = `${keyword}|${category}|${rows.length}|${summary.arBalance}|${summary.apBalance}`;

  function toggleSummary() {
    setSummaryExpanded((prev) => {
      const next = !prev;
      writeSummaryExpanded(next);
      return next;
    });
  }

  async function handleDelete(row: Customer) {
    const ok = await confirm(deleteConfirmMessage(row.name));
    if (!ok) return;
    removeCustomer(row.id);
    if (detailId === row.id) setDetailId(null);
  }

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: t("customers.colName"),
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "category",
      header: t("customers.colCategory"),
      render: (r) => <StatusBadge>{r.category}</StatusBadge>,
    },
    {
      key: "contact",
      header: t("customers.colContact"),
      render: (r) => r.contact ?? "—",
    },
    {
      key: "arBalance",
      header: t("customers.colArBalance"),
      className: "text-right",
      render: (r) => {
        const bal = getCustomerSettlement(settlementMap, r.name).arBalance;
        return (
          <span
            className={`tabular-nums ${bal > 0 ? "font-medium text-foreground" : "text-muted"}`}
          >
            {formatMoney(bal)}
          </span>
        );
      },
    },
    {
      key: "apBalance",
      header: t("customers.colApBalance"),
      className: "text-right",
      render: (r) => {
        const bal = getCustomerSettlement(settlementMap, r.name).apBalance;
        return (
          <span
            className={`tabular-nums ${bal > 0 ? "font-medium text-foreground" : "text-muted"}`}
          >
            {formatMoney(bal)}
          </span>
        );
      },
    },
    {
      key: "settleStatus",
      header: t("customers.colSettleStatus"),
      render: (r) => {
        const status = getCustomerSettlement(settlementMap, r.name).status;
        const label =
          status === "none" ? t("customers.settleNone") : statusLabel[status];
        return <StatusBadge tone={settleTone(status)}>{label}</StatusBadge>;
      },
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

  const summaryCards = [
    {
      label: t("customers.summaryArBalance"),
      raw: summary.arBalance,
      format: formatMoney,
      icon: <CurrencyCircleDollar size={20} weight="duotone" />,
      iconTone: "info" as const,
    },
    {
      label: t("customers.summaryApBalance"),
      raw: summary.apBalance,
      format: formatMoney,
      icon: <Scales size={20} weight="duotone" />,
      iconTone: "warning" as const,
    },
    {
      label: t("customers.summarySettled"),
      raw: summary.settledCustomers,
      format: (n: number) => String(Math.round(n)),
      icon: <CheckCircle size={20} weight="duotone" />,
      iconTone: "success" as const,
    },
    {
      label: t("customers.summaryPartial"),
      raw: summary.partialCustomers,
      format: (n: number) => String(Math.round(n)),
      icon: <WarningCircle size={20} weight="duotone" />,
      iconTone: "warning" as const,
    },
    {
      label: t("customers.summaryOpen"),
      raw: summary.openCustomers,
      format: (n: number) => String(Math.round(n)),
      icon: <XCircle size={20} weight="duotone" />,
      iconTone: "danger" as const,
    },
    {
      label: t("customers.summaryNone"),
      raw: summary.noneCustomers,
      format: (n: number) => String(Math.round(n)),
      icon: <CirclesThree size={20} weight="duotone" />,
      iconTone: "brand" as const,
    },
  ] as const;

  return (
    <ListPageLayout>
      <PageHeader
        title={t("customers.title")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/customers/categories" className="ui-btn-secondary">
              {t("customers.manageCategories")}
            </Link>
            <PrimaryButton onClick={() => setCreateOpen(true)}>
              {t("customers.new")}
            </PrimaryButton>
          </div>
        }
      />

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            {t("customers.summaryTitle")}
          </h2>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-[var(--radius-control)] px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-chip hover:text-foreground"
            onClick={toggleSummary}
            aria-expanded={summaryExpanded}
          >
            {summaryExpanded
              ? t("customers.summaryCollapse")
              : t("customers.summaryExpand")}
            {summaryExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
          </button>
        </div>
        {summaryExpanded ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
            {summaryCards.map((card) => (
              <StatCard
                key={card.label}
                label={card.label}
                value={card.format(card.raw)}
                rawValue={card.raw}
                formatRaw={card.format}
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
            placeholder={t("customers.keywordPlaceholder")}
          />
        </FilterField>
        <FilterField label={t("common.category")}>
          <Select
            size="sm"
            value={category}
            onChange={setCategory}
            options={[
              { value: "all", label: t("common.all") },
              ...categoryFilterOptions.map((c) => ({ value: c, label: c })),
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
        <CustomerCreateModal
          open
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => setDetailId(id)}
        />
      ) : null}
      {detailId ? (
        <CustomerDetailModal
          open
          onClose={() => setDetailId(null)}
          id={detailId}
        />
      ) : null}
    </ListPageLayout>
  );
}
