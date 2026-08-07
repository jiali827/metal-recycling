"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CaretDown,
  SealCheck,
  Eye,
  ListBullets,
  PencilSimple,
  Trash,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
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
  SegmentedControl,
  Select,
  TextInput
} from "@/shared/ui/CrudUi";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { SettlementDocCreateModal } from "@/features/lazy-modals";
import { SettlementAttachmentCell } from "@/features/settlement-docs/components/SettlementAttachmentCell";
import { SettlementPaymentsModal } from "@/features/settlement-docs/components/SettlementPaymentsModal";
import { deleteConfirmMessage } from "@/shared/lib/confirm-delete";
import { formatKg, formatMoney } from "@/shared/lib/format";
import { auditColumns, sortByCreatedAtDesc } from "@/shared/lib/list-columns";
import { useI18n } from "@/shared/i18n";
import { useMockStore } from "@/data/mock/store";
import { useModulePermission } from "@/shared/config/menu-permissions";
import { useAuth } from "@/features/auth/provider";
import { hasSettlementPayments } from "@/entities/settlement";
import { settlementStatusLabel } from "@/shared/i18n/labels";
import type {
  ArApItem,
  SettlementStatus,
  WeighSettlementDoc,
  WeighSettlementKind,
} from "@/entities/types";

const settleToneMap = {
  open: "warning",
  partial: "info",
  settled: "success",
  void: "danger",
} as const;

function docDateKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const actionBtnClass =
  "flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] text-muted transition hover:bg-chip hover:text-brand";
const dangerBtnClass =
  "flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] text-muted transition hover:bg-red-50 hover:text-danger";

export default function SettlementDocsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const confirm = useConfirm();
  const { user } = useAuth();
  const perm = useModulePermission("weighTickets");
  const {
    weighSettlementDocs,
    removeWeighSettlementDoc,
    updateWeighSettlementDoc,
    confirmWeighSettlementDoc,
    unconfirmWeighSettlementDoc,
    customers,
    payments,
    receivables,
    payables,
  } = useMockStore();
  const [docNo, setDocNo] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [settleStatus, setSettleStatus] = useState("all");
  const [customer, setCustomer] = useState("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<WeighSettlementKind>("purchase");
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<WeighSettlementDoc | null>(null);
  const [paymentsDoc, setPaymentsDoc] = useState<WeighSettlementDoc | null>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);

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

  function openCreate(next: WeighSettlementKind) {
    setCreateKind(next);
    setCreateMenuOpen(false);
    setCreateOpen(true);
  }

  function openEdit(row: WeighSettlementDoc) {
    if (row.status === "confirmed") return;
    setEditingDoc(row);
  }

  async function handleDelete(row: WeighSettlementDoc) {
    if (row.status === "confirmed") return;
    const ok = await confirm(deleteConfirmMessage(row.no));
    if (!ok) return;
    removeWeighSettlementDoc(row.id);
  }

  async function handleConfirm(row: WeighSettlementDoc) {
    if (row.status !== "pending") return;
    const ok = await confirm({
      title: t("settlementDocs.confirmSettlement"),
      message: t("settlementDocs.confirmSettlementMessage"),
      confirmLabel: t("settlementDocs.confirmSettlement"),
    });
    if (!ok) return;
    confirmWeighSettlementDoc(row.id, { confirmedBy: user?.name });
  }

  async function handleUnconfirm(row: WeighSettlementDoc) {
    if (row.status !== "confirmed") return;
    if (hasSettlementPayments(payments, row.id)) {
      const goPayments = await confirm({
        title: t("settlementDocs.unconfirmBlockedTitle"),
        message: t("settlementDocs.unconfirmBlockedHasPayments"),
        confirmLabel: t("settlementDocs.goToPayments"),
        cancelLabel: t("common.close"),
      });
      if (goPayments) router.push("/payments");
      return;
    }
    const ok = await confirm({
      title: t("settlementDocs.unconfirmSettlement"),
      message: t("settlementDocs.unconfirmSettlementMessage"),
      confirmLabel: t("settlementDocs.unconfirmSettlement"),
      danger: true,
    });
    if (!ok) return;
    unconfirmWeighSettlementDoc(row.id);
  }

  const customerOptions = useMemo(() => {
    const fromMaster = customers.map((c) => c.name);
    const fromDocs = weighSettlementDocs.map((d) => d.customerName);
    const names = [...new Set([...fromMaster, ...fromDocs].filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, "zh-HK"),
    );
    return [
      { value: "all", label: t("common.all") },
      ...names.map((name) => ({ value: name, label: name })),
    ];
  }, [customers, weighSettlementDocs, t]);

  const arApByDocId = useMemo(() => {
    const map = new Map<string, ArApItem>();
    for (const item of [...receivables, ...payables]) {
      if (item.status === "void") continue;
      map.set(item.settlementDocId, item);
    }
    return map;
  }, [receivables, payables]);

  const rows = useMemo(() => {
    const noQ = docNo.trim().toLowerCase();
    return sortByCreatedAtDesc(
      weighSettlementDocs.filter((row) => {
        if (kind !== "all" && row.kind !== kind) return false;
        if (status !== "all" && row.status !== status) return false;
        if (settleStatus !== "all") {
          const item = arApByDocId.get(row.id);
          if (!item || item.status !== settleStatus) return false;
        }
        if (customer !== "all" && row.customerName !== customer) return false;
        if (noQ && !row.no.toLowerCase().includes(noQ)) return false;
        if (dateStart || dateEnd) {
          const day = docDateKey(row.docDate);
          if (!day) return false;
          if (dateStart && day < dateStart) return false;
          if (dateEnd && day > dateEnd) return false;
        }
        return true;
      }),
    );
  }, [
    weighSettlementDocs,
    docNo,
    kind,
    status,
    settleStatus,
    arApByDocId,
    customer,
    dateStart,
    dateEnd,
  ]);

  const columns: Column<WeighSettlementDoc>[] = [
    {
      key: "no",
      header: t("settlementDocs.colNo"),
      render: (r) => <span className="font-medium tabular-nums">{r.no}</span>,
    },
    {
      key: "contractNo",
      header: t("settlementDocs.colContractNo"),
      render: (r) => r.contractNo || "—",
    },
    {
      key: "kind",
      header: t("common.type"),
      render: (r) => (
        <StatusBadge tone={r.kind === "purchase" ? "info" : "accent"}>
          {r.kind === "purchase"
            ? t("settlementDocs.purchaseTitle")
            : t("settlementDocs.saleTitle")}
        </StatusBadge>
      ),
    },
    { key: "customer", header: t("fields.customer"), render: (r) => r.customerName },
    { key: "docDate", header: t("common.date"), render: (r) => r.docDate },
    {
      key: "status",
      header: t("settlementDocs.colConfirmStatus"),
      render: (r) => (
        <StatusBadge tone={r.status === "confirmed" ? "success" : "warning"}>
          {r.status === "confirmed"
            ? t("settlementDocs.statusConfirmed")
            : t("settlementDocs.statusPending")}
        </StatusBadge>
      ),
    },
    {
      key: "net",
      header: t("settlementDocs.totalNet"),
      className: "text-right",
      render: (r) => <span className="tabular-nums">{formatKg(r.totalNetKg)}</span>,
    },
    {
      key: "amount",
      header: t("settlementDocs.totalAmount"),
      className: "text-right",
      render: (r) => <span className="tabular-nums">{formatMoney(r.totalAmount)}</span>,
    },
    {
      key: "settled",
      header: t("form.colSettled"),
      className: "text-right",
      render: (r) => {
        const item = arApByDocId.get(r.id);
        if (!item) return <span className="text-muted">—</span>;
        return <span className="tabular-nums">{formatMoney(item.settledAmount)}</span>;
      },
    },
    {
      key: "balance",
      header: t("form.colBalance"),
      className: "text-right",
      render: (r) => {
        const item = arApByDocId.get(r.id);
        if (!item) return <span className="text-muted">—</span>;
        return (
          <span className="font-medium tabular-nums">{formatMoney(item.balance)}</span>
        );
      },
    },
    {
      key: "settleStatus",
      header: t("settlementDocs.colSettleStatus"),
      render: (r) => {
        const item = arApByDocId.get(r.id);
        if (!item) return <span className="text-muted">—</span>;
        const st = item.status as SettlementStatus;
        return (
          <StatusBadge tone={settleToneMap[st]}>
            {settlementStatusLabel[st]}
          </StatusBadge>
        );
      },
    },
    {
      key: "attachment",
      header: t("settlementDocs.colAttachment"),
      stopRowClick: true,
      render: (r) => (
        <SettlementAttachmentCell
          row={r}
          canEdit={perm.canEdit}
          onChange={(id, patch) => updateWeighSettlementDoc(id, patch)}
        />
      ),
    },
    ...auditColumns(t),
    {
      key: "actions",
      header: t("common.actions"),
      stopRowClick: true,
      render: (r) => {
        const isConfirmed = r.status === "confirmed";
        return (
          <div className="flex items-center justify-end gap-1">
            {isConfirmed ? (
              <>
                <button
                  type="button"
                  className={actionBtnClass}
                  aria-label={t("common.detail")}
                  title={t("common.detail")}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/settlement-docs/${r.id}`);
                  }}
                >
                  <Eye size={14} />
                </button>
                <button
                  type="button"
                  className={actionBtnClass}
                  aria-label={t("settlementDocs.viewPayments")}
                  title={t("settlementDocs.viewPayments")}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPaymentsDoc(r);
                  }}
                >
                  <ListBullets size={14} />
                </button>
                {perm.canEdit ? (
                  <button
                    type="button"
                    className={actionBtnClass}
                    aria-label={t("settlementDocs.unconfirmSettlement")}
                    title={
                      hasSettlementPayments(payments, r.id)
                        ? t("settlementDocs.unconfirmBlockedHint")
                        : t("settlementDocs.unconfirmSettlement")
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleUnconfirm(r);
                    }}
                  >
                    <ArrowCounterClockwise size={14} />
                  </button>
                ) : null}
              </>
            ) : (
              <>
                {perm.canEdit ? (
                  <>
                    <button
                      type="button"
                      className={actionBtnClass}
                      aria-label={t("common.detail")}
                      title={t("common.detail")}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(r);
                      }}
                    >
                      <PencilSimple size={14} />
                    </button>
                    <button
                      type="button"
                      className={actionBtnClass}
                      aria-label={t("settlementDocs.confirmSettlement")}
                      title={t("settlementDocs.confirmSettlement")}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleConfirm(r);
                      }}
                    >
                      <SealCheck size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={actionBtnClass}
                    aria-label={t("common.detail")}
                    title={t("common.detail")}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/settlement-docs/${r.id}`);
                    }}
                  >
                    <Eye size={14} />
                  </button>
                )}
                {perm.canDelete ? (
                  <button
                    type="button"
                    className={dangerBtnClass}
                    aria-label={t("common.delete")}
                    title={t("common.delete")}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(r);
                    }}
                  >
                    <Trash size={14} />
                  </button>
                ) : null}
              </>
            )}
          </div>
        );
      },
    },
  ];

  if (!perm.canView) {
    return (
      <ListPageLayout>
        <p className="text-sm text-muted">{t("common.notFoundHint")}</p>
      </ListPageLayout>
    );
  }

  const editableDoc =
    editingDoc && editingDoc.status !== "confirmed" ? editingDoc : null;

  return (
    <ListPageLayout>
      <PageHeader
        title={t("settlementDocs.title")}
        actions={
          perm.canCreate ? (
            <div ref={createMenuRef} className="relative">
              <PrimaryButton
                type="button"
                onClick={() => setCreateMenuOpen((v) => !v)}
              >
                <span className="inline-flex items-center gap-1.5">
                  {t("settlementDocs.new")}
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
                    onClick={() => openCreate("purchase")}
                  >
                    {t("settlementDocs.purchaseTitle")}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full px-3 py-2 text-left text-sm text-foreground transition hover:bg-chip"
                    onClick={() => openCreate("sale")}
                  >
                    {t("settlementDocs.saleTitle")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null
        }
      />
      <FilterBar>
        <FilterField label={t("settlementDocs.colNo")}>
          <TextInput
            size="sm"
            value={docNo}
            onChange={(e) => setDocNo(e.target.value)}
            placeholder={t("settlementDocs.docNoPlaceholder")}
          />
        </FilterField>
        <FilterField label={t("common.type")} className="min-w-0">
          <SegmentedControl
            size="sm"
            value={kind}
            onChange={setKind}
            options={[
              { value: "all", label: t("common.all") },
              { value: "purchase", label: t("settlementDocs.purchaseTitle") },
              { value: "sale", label: t("settlementDocs.saleTitle") },
            ]}
            aria-label={t("common.type")}
          />
        </FilterField>
        <FilterField label={t("settlementDocs.colConfirmStatus")} className="min-w-0">
          <SegmentedControl
            size="sm"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: t("common.all") },
              { value: "pending", label: t("settlementDocs.statusPending") },
              { value: "confirmed", label: t("settlementDocs.statusConfirmed") },
            ]}
            aria-label={t("settlementDocs.colConfirmStatus")}
          />
        </FilterField>
        <FilterField label={t("settlementDocs.colSettleStatus")} className="min-w-0">
          <SegmentedControl
            size="sm"
            value={settleStatus}
            onChange={setSettleStatus}
            options={[
              { value: "all", label: t("common.all") },
              { value: "open", label: t("status.open") },
              { value: "partial", label: t("status.partial") },
              { value: "settled", label: t("status.settled") },
            ]}
            aria-label={t("settlementDocs.colSettleStatus")}
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
        <FilterField label={t("settlementDocs.dateRange")} className="min-w-[220px]">
          <DateRangePicker
            size="sm"
            start={dateStart}
            end={dateEnd}
            onChange={(start, end) => {
              setDateStart(start);
              setDateEnd(end);
            }}
            className="min-w-[220px]"
            aria-label={t("settlementDocs.dateRange")}
          />
        </FilterField>
      </FilterBar>
      <DataTable
        fillHeight
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/settlement-docs/${r.id}`)}
      />
      {createOpen ? (
        <SettlementDocCreateModal
          open
          initialKind={createKind}
          onClose={() => setCreateOpen(false)}
          onCreated={(id, opts) => {
            if (opts?.preview) {
              router.push(`/settlement-docs/${id}`);
            }
          }}
        />
      ) : null}
      {editableDoc ? (
        <SettlementDocCreateModal
          open
          editingDoc={editableDoc}
          onClose={() => setEditingDoc(null)}
          onSaved={(id, opts) => {
            setEditingDoc(null);
            if (opts?.preview) {
              router.push(`/settlement-docs/${id}`);
            }
          }}
        />
      ) : null}
      {paymentsDoc ? (
        <SettlementPaymentsModal
          open
          doc={paymentsDoc}
          onClose={() => setPaymentsDoc(null)}
        />
      ) : null}
    </ListPageLayout>
  );
}
