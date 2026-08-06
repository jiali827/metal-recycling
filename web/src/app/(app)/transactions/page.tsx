"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { ContractTracePanel } from "@/components/entity/ContractTracePanel";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  FilterBar,
  FilterField,
  filterControlClass,
} from "@/components/ui/FilterBar";
import { Select } from "@/components/ui/CrudUi";
import { SegmentedControl } from "@/components/ui/forms/SegmentedControl";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { contractStatusLabel } from "@/lib/i18n/labels";
import { useMockStore } from "@/lib/mock-store";
import { buildContractTraces, type ContractTrace } from "@/lib/transaction-trace";
import type { ContractType } from "@/lib/types";

type TypeTab = "all" | ContractType;

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
          <StatusBadge>{contractStatusLabel[contract.status]}</StatusBadge>
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
            className={`h-full rounded-full transition-[width] duration-300 ${
              isPurchase ? "bg-info" : "bg-accent-hot"
            }`}
            style={{ width: `${fulfillment}%` }}
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

  const traces = useMemo(
    () =>
      buildContractTraces({
        contracts: store.contracts,
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

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return traces.find((tr) => tr.contract.id === selectedId) ?? null;
  }, [traces, selectedId]);

  useEffect(() => {
    if (selectedId && !traces.some((tr) => tr.contract.id === selectedId)) {
      setSelectedId(null);
    }
  }, [traces, selectedId]);

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
      <div>
        <div className="mb-4">
          <button
            type="button"
            className="ui-btn-secondary inline-flex h-9 items-center gap-1.5 px-3 text-sm"
            onClick={() => setSelectedId(null)}
          >
            <ArrowLeft size={16} />
            {t("transactions.backToList")}
          </button>
        </div>
        {selected ? (
          <ContractTracePanel trace={selected} />
        ) : (
          <div className="ui-card flex min-h-[240px] items-center justify-center p-8 text-sm text-muted">
            {t("transactions.contractNotFound")}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ui-page-scroll">
      <PageHeader title={t("transactions.title")} />

      <FilterBar>
        <FilterField label={t("common.type")}>
          <SegmentedControl
            size="sm"
            value={typeTab}
            onChange={(value) => setTypeTab(value as TypeTab)}
            options={typeTabOptions}
            aria-label={t("common.type")}
            className="w-full min-w-[280px]"
          />
        </FilterField>
        <FilterField label={t("common.keyword")}>
          <input
            className={filterControlClass}
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
              { value: "fulfilling", label: t("status.fulfilling") },
              { value: "completed", label: t("status.completed") },
              { value: "closed", label: t("status.closed") },
            ]}
          />
        </FilterField>
      </FilterBar>

      <p className="mb-4 text-xs text-muted">
        {t("pagination.total", { count: filtered.length })}
      </p>

      {filtered.length === 0 ? (
        <div className="ui-card flex min-h-[240px] items-center justify-center p-8 text-sm text-muted">
          {t("common.empty")}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((trace) => (
            <ProjectCard
              key={trace.contract.id}
              trace={trace}
              onOpen={() => setSelectedId(trace.contract.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
