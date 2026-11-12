"use client";

import { useEffect, useMemo, useState } from "react";
import { ContractTracePanel } from "@/features/contracts/components/ContractTracePanel";
import { ListPageLayout } from "@/shared/layout/ListPageLayout";
import { PageHeader } from "@/shared/ui/PageHeader";
import {
  FilterBar,
  FilterField,
} from "@/shared/ui/FilterBar";
import {
  Select,
  TextInput
} from "@/shared/ui/CrudUi";
import { SegmentedControl } from "@/shared/ui/forms/SegmentedControl";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import {
  CARD_PAGE_SIZE_OPTIONS,
  TablePagination,
} from "@/shared/ui/TablePagination";
import { contractStatusTone } from "@/entities/contract/status";
import {
  DIRECTION_PURCHASE_COLOR,
  DIRECTION_SALE_COLOR,
} from "@/shared/lib/direction-colors";
import { formatMoney } from "@/shared/lib/format";
import { useI18n } from "@/shared/i18n";
import { contractStatusLabel } from "@/shared/i18n/labels";
import { useMockStore } from "@/data/mock/store";
import { buildContractTraces, type ContractTrace } from "@/entities/transaction/trace";
import type { ContractType } from "@/entities/types";

type TypeTab = "all" | ContractType;

const DEFAULT_CARD_PAGE_SIZE = 12;

function ProjectCard({
  trace,
  onOpen,
}: {
  trace: ContractTrace;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const { contract, summary } = trace;
  const isPurchase = contract.type === "purchase";
  const fulfillment = Math.min(100, Math.max(0, summary.fulfillmentPct));

  return (
    <button
      type="button"
      onClick={onOpen}
      className="ui-card group flex h-full flex-col overflow-hidden text-left transition duration-200 hover:border-brand/30 hover:shadow-[0_8px_24px_rgb(15_23_42_/_0.08)] active:scale-[0.99]"
    >
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <StatusBadge tone={isPurchase ? "info" : "hot"}>
              {isPurchase ? t("common.purchase") : t("common.sale")}
            </StatusBadge>
            <h3 className="mt-2 truncate text-[15px] font-semibold tracking-tight text-foreground transition-colors group-hover:text-brand">
              {contract.no}
            </h3>
            <p className="mt-1 truncate text-sm text-muted">{contract.customerName}</p>
          </div>
          <StatusBadge tone={contractStatusTone(contract.status)}>
            {contractStatusLabel[contract.status]}
          </StatusBadge>
        </div>

        <div className="mt-5 flex items-end justify-between gap-4 border-t border-border/60 pt-4">
          <div className="min-w-0">
            <p className="text-[11px] text-muted">{t("transactions.totalAmount")}</p>
            <p className="mt-0.5 truncate text-xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatMoney(summary.totalAmount)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] text-muted">{t("transactions.fulfillment")}</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
              {fulfillment.toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-chip">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${fulfillment}%`,
              backgroundColor: isPurchase
                ? DIRECTION_PURCHASE_COLOR
                : DIRECTION_SALE_COLOR,
            }}
          />
        </div>
      </div>
    </button>
  );
}

export default function TransactionsPage() {
  const { t } = useI18n();
  const store = useMockStore();
  const [typeTab, setTypeTab] = useState<TypeTab>("all");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_CARD_PAGE_SIZE);

  const traces = useMemo(
    () =>
      buildContractTraces({
        purchaseContracts: store.purchaseContracts,
        saleContracts: store.saleContracts,
        customers: store.customers,
        weighTickets: store.weighTickets,
        receivables: store.receivables,
        payables: store.payables,
        payments: store.payments,
      }),
    [store],
  );

  const filtered = useMemo(() => {
    return traces.filter((trace) => {
      const { contract } = trace;
      if (typeTab !== "all" && contract.type !== typeTab) return false;
      if (statusFilter !== "all" && contract.status !== statusFilter) return false;
      if (keyword) {
        const hay = [contract.no, contract.customerName, contract.unitPriceSummary]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(keyword.toLowerCase())) return false;
      }
      return true;
    });
  }, [traces, typeTab, keyword, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return traces.find((tr) => tr.contract.id === selectedId) ?? null;
  }, [traces, selectedId]);

  useEffect(() => {
    if (selectedId && !traces.some((tr) => tr.contract.id === selectedId)) {
      setSelectedId(null);
    }
  }, [traces, selectedId]);

  useEffect(() => {
    setPage(1);
  }, [typeTab, keyword, statusFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const typeCounts = useMemo(() => {
    const sale = traces.filter((tr) => tr.contract.type === "sale").length;
    const purchase = traces.filter((tr) => tr.contract.type === "purchase").length;
    return { all: traces.length, sale, purchase };
  }, [traces]);

  const typeTabOptions = useMemo(
    () => [
      { value: "all", label: `${t("common.all")} (${typeCounts.all})` },
      { value: "sale", label: `${t("common.sale")} (${typeCounts.sale})` },
      { value: "purchase", label: `${t("common.purchase")} (${typeCounts.purchase})` },
    ],
    [t, typeCounts],
  );

  if (selectedId) {
    return (
      <ListPageLayout>
        <div className="ui-page-scroll is-scrollbar-hidden min-h-0 flex-1">
          {selected ? (
            <ContractTracePanel
              trace={selected}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <div className="ui-card flex min-h-[240px] items-center justify-center p-8 text-sm text-muted">
              {t("transactions.contractNotFound")}
            </div>
          )}
        </div>
      </ListPageLayout>
    );
  }

  return (
    <ListPageLayout>
      <div className="shrink-0">
        <PageHeader title={t("transactions.title")} />
      </div>

      <div className="shrink-0">
        <FilterBar>
        <FilterField label={t("common.type")} className="min-w-0">
          <SegmentedControl
            size="sm"
            value={typeTab}
            onChange={(value) => setTypeTab(value as TypeTab)}
            options={typeTabOptions}
            aria-label={t("common.type")}
          />
        </FilterField>
        <FilterField label={t("common.keyword")}>
          <TextInput
            size="sm"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("transactions.keywordPlaceholder")}
          />
        </FilterField>
        <FilterField label={t("transactions.contractStatus")}>
          <Select
            size="sm"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: t("common.all") },
              { value: "draft", label: t("status.draft") },
              { value: "active", label: t("status.active") },
              { value: "completed", label: t("status.completed") },
              { value: "closed", label: t("status.closed") },
            ]}
          />
        </FilterField>
        </FilterBar>
      </div>

      {filtered.length === 0 ? (
        <div className="ui-card flex min-h-[240px] flex-1 items-center justify-center p-8 text-sm text-muted">
          {t("common.empty")}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="ui-page-scroll is-scrollbar-hidden min-h-0 flex-1">
            <div className="grid gap-5 pb-2 sm:grid-cols-2 xl:grid-cols-3">
              {pageRows.map((trace) => (
                <ProjectCard
                  key={trace.contract.id}
                  trace={trace}
                  onOpen={() => setSelectedId(trace.contract.id)}
                />
              ))}
            </div>
          </div>
          <TablePagination
            variant="compact"
            className="mt-4 shrink-0"
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            pageSizeOptions={CARD_PAGE_SIZE_OPTIONS}
          />
        </div>
      )}
    </ListPageLayout>
  );
}
