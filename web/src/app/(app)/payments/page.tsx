"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CaretDown,
  CaretUp,
  CurrencyCircleDollar,
  MinusCircle,
  Wallet,
} from "@phosphor-icons/react";
import Link from "next/link";
import { ListPageLayout } from "@/shared/layout/ListPageLayout";
import { PageHeader } from "@/shared/ui/PageHeader";
import { DataTable, type Column } from "@/shared/ui/DataTable";
import { StatCard } from "@/shared/ui/StatCard";
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
  PaymentCreateModal,
  PaymentDetailModal,
} from "@/features/lazy-modals";
import { deleteConfirmMessage } from "@/shared/lib/confirm-delete";
import { formatMoney } from "@/shared/lib/format";
import { formatWeighDateTime } from "@/shared/lib/date";
import { auditColumns, sortByCreatedAtDesc } from "@/shared/lib/list-columns";
import { isMiscPayment, isSalaryPayment } from "@/entities/payment/meta";
import { aggregatePaymentStructure } from "@/entities/payment/structure";
import { paymentMiscCategoryLabel } from "@/entities/payment/misc-category";
import { paymentSettlementDocNo } from "@/entities/settlement";
import { useI18n } from "@/shared/i18n";
import { useMockStore } from "@/data/mock/store";
import { useModulePermission } from "@/shared/config/menu-permissions";
import type { PaymentCreateKind, PaymentRecord } from "@/entities/types";
import { CorrectionDeleteModal } from "@/features/correction/components/CorrectionDeleteModal";
import { useQueryPrefill } from "@/shared/hooks/useQueryPrefill";

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
  const perm = useModulePermission("payments");
  const miscCatPerm = useModulePermission("miscCategories");
  const { payments, paymentMiscCategories, removePayment } = useMockStore();
  const confirm = useConfirm();
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<PaymentCreateKind>("settlement");
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<{ type: "payment"; id: string; label: string } | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  useQueryPrefill("paymentNo", setKeyword);

  useEffect(() => {
    if (!createMenuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!createMenuRef.current?.contains(e.target as Node)) {
        setCreateMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCreateMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [createMenuOpen]);

  function openCreate(next: PaymentCreateKind) {
    setCreateKind(next);
    setCreateMenuOpen(false);
    setCreateOpen(true);
  }

  useEffect(() => {
    setSummaryExpanded(readSummaryExpanded());
  }, []);

  const rows = useMemo(() => {
    return sortByCreatedAtDesc(
      payments.filter((p) => {
        if (type !== "all" && p.type !== type) return false;
        if (category !== "all" && p.category !== category) return false;
        const docNo = paymentSettlementDocNo(p);
        if (
          keyword &&
          !`${p.paymentNo ?? ""}${p.counterparty}${p.allocationSummary}${p.method}${p.miscKindName ?? ""}${p.miscKindId ?? ""}${docNo}${p.contractNo ?? ""}${p.waiverReason ?? ""}`
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
    if (row.correctionStatus === "reversed") return;
    const label = `${row.type === "receipt" ? t("common.receipt") : t("common.payment")} ${formatMoney(row.amount)}`;
    if (row.category === "settlement") {
      setCorrectionTarget({ type: "payment", id: row.id, label });
      return;
    }
    const ok = await confirm(deleteConfirmMessage(label));
    if (!ok) return;
    removePayment(row.id);
    if (detailId === row.id) setDetailId(null);
  }

  const columns: Column<PaymentRecord>[] = [
    {
      key: "paymentNo",
      header: t("payments.colNo"),
      render: (r) => <span className="font-medium tabular-nums">{r.paymentNo ?? "—"}</span>,
    },
    {
      key: "date",
      header: t("fields.paymentDateTime"),
      render: (r) => formatWeighDateTime(r.date),
    },
    {
      key: "category",
      header: t("payments.colCategory"),
      render: (r) => (
        <StatusBadge tone={isSalaryPayment(r) ? "accent" : isMiscPayment(r) ? "info" : "default"}>
          {isSalaryPayment(r)
            ? t("payments.categorySalary")
            : isMiscPayment(r)
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
      key: "status",
      header: t("common.status"),
      render: (r) => {
        const status = r.correctionStatus === "reversed" ? "reversed" : r.status ?? "confirmed";
        const tone = status === "confirmed" ? "success" : status === "pending" ? "warning" : "danger";
        return <StatusBadge tone={tone}>{t(`status.${status}`)}</StatusBadge>;
      },
    },
    {
      key: "miscKind",
      header: t("payments.colMiscKind"),
      render: (r) =>
        isSalaryPayment(r) ? (
          <span className="text-sm">{t("payments.categorySalary")}</span>
        ) : r.category === "misc" ? (
          <span className="text-sm">
            {paymentMiscCategoryLabel(r, paymentMiscCategories)}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "contract",
      header: t("payments.colContract"),
      render: (r) =>
        r.contractNo ? (
          <span className="font-medium tabular-nums">{r.contractNo}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "settlementDoc",
      header: t("payments.colSettlementDoc"),
      render: (r) => {
        const docNo = paymentSettlementDocNo(r);
        return docNo ? (
          <span className="font-medium tabular-nums">{docNo}</span>
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
    {
      key: "waiver",
      header: t("payments.colWaiver"),
      className: "text-right",
      render: (r) =>
        r.waiverAmount && r.waiverAmount > 0 ? (
          <span className="font-medium tabular-nums">{formatMoney(r.waiverAmount)}</span>
        ) : (
          <span className="text-muted">—</span>
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
          readOnly={r.correctionStatus === "reversed" || r.status !== "pending"}
          onDelete={perm.canDelete && (r.status ?? "confirmed") === "pending" ? () => void handleDelete(r) : undefined}
          onCorrection={perm.canDelete && r.correctionStatus !== "reversed" && (r.status ?? "confirmed") === "confirmed" ? () => void handleDelete(r) : undefined}
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
    {
      label: t("payments.summaryWaiver"),
      raw: structure.waiverTotal,
      icon: <MinusCircle size={20} weight="fill" />,
      iconTone: "muted" as const,
    },
  ] as const;

  return (
    <ListPageLayout>
      <PageHeader
        title={t("payments.title")}
        actions={
          <div className="flex items-center gap-2">
            {miscCatPerm.canView ? (
              <Link href="/misc-categories" className="ui-btn-secondary">
                {t("payments.manageMiscCategories")}
              </Link>
            ) : null}
            {perm.canCreate ? (
          <div ref={createMenuRef} className="relative">
            <PrimaryButton type="button" onClick={() => setCreateMenuOpen((v) => !v)}>
              <span className="inline-flex items-center gap-1.5">
                {t("payments.new")}
                <CaretDown size={14} weight="bold" />
              </span>
            </PrimaryButton>
            {createMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1 min-w-[10rem] overflow-hidden rounded-[var(--radius-control)] border border-border bg-card py-1 shadow-[var(--shadow-panel)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2 text-left text-sm text-foreground transition hover:bg-chip"
                  onClick={() => openCreate("settlement")}
                >
                  {t("payments.categorySettlement")}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2 text-left text-sm text-foreground transition hover:bg-chip"
                  onClick={() => openCreate("misc")}
                >
                  {t("payments.categoryMisc")}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2 text-left text-sm text-foreground transition hover:bg-chip"
                  onClick={() => openCreate("salary")}
                >
                  {t("payments.categorySalary")}
                </button>
              </div>
            ) : null}
          </div>
            ) : null}
          </div>
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
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
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
          <TextInput
            size="sm"
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
              { value: "salary", label: t("payments.categorySalary") },
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
          createKind={createKind}
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => setDetailId(id)}
        />
      ) : null}
      {detailId ? (
        <PaymentDetailModal readOnly={!perm.canEdit}
          open
          onClose={() => setDetailId(null)}
          id={detailId}
        />
      ) : null}
    </ListPageLayout>
  );
}
