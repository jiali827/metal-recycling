"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import { DataTable, type Column } from "@/shared/ui/DataTable";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { RowActions } from "@/shared/ui/CrudUi";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { PaymentDetailModal } from "@/features/lazy-modals";
import { deleteConfirmMessage } from "@/shared/lib/confirm-delete";
import { formatMoney } from "@/shared/lib/format";
import { formatWeighDateTime } from "@/shared/lib/date";
import { sortByCreatedAtDesc } from "@/shared/lib/list-columns";
import { paymentSettlementDocId } from "@/entities/settlement";
import { localizeAllocationSummary, useI18n } from "@/shared/i18n";
import { useMockStore } from "@/data/mock/store";
import { useModulePermission } from "@/shared/config/menu-permissions";
import type { PaymentRecord, WeighSettlementDoc } from "@/entities/types";

function formatPaymentMethod(
  method: string,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (method === "現金" || method === "现金") return t("form.methodCash");
  if (method === "支票") return t("form.methodCheque");
  if (method === "轉賬" || method === "转账") return t("form.methodTransfer");
  return method;
}

export function SettlementPaymentsModal({
  open,
  onClose,
  doc,
}: {
  open: boolean;
  onClose: () => void;
  doc: WeighSettlementDoc | null;
}) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const payPerm = useModulePermission("payments");
  const { payments, removePayment } = useMockStore();
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!doc) return [];
    return sortByCreatedAtDesc(
      payments.filter(
        (p) =>
          p.category === "settlement" &&
          paymentSettlementDocId(p) === doc.id,
      ),
    );
  }, [payments, doc]);

  async function handleDelete(row: PaymentRecord) {
    const ok = await confirm(
      deleteConfirmMessage(
        `${formatWeighDateTime(row.date)} · ${formatMoney(row.amount)}`,
      ),
    );
    if (!ok) return;
    removePayment(row.id);
    if (detailId === row.id) setDetailId(null);
  }

  const columns: Column<PaymentRecord>[] = [
    {
      key: "date",
      header: t("common.date"),
      render: (r) => (
        <span className="tabular-nums">{formatWeighDateTime(r.date)}</span>
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
      key: "method",
      header: t("form.method"),
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
      key: "summary",
      header: t("form.colAllocation"),
      render: (r) => localizeAllocationSummary(r.allocationSummary),
    },
    {
      key: "actions",
      header: t("common.actions"),
      stopRowClick: true,
      render: (r) => (
        <RowActions
          onDetail={
            payPerm.canView ? () => setDetailId(r.id) : undefined
          }
          onDelete={
            payPerm.canDelete ? () => void handleDelete(r) : undefined
          }
        />
      ),
    },
  ];

  if (!doc) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={t("settlementDocs.paymentsModalTitle")}
        size="xl"
        footer={
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.close")}
          </button>
        }
      >
        <p className="mb-3 text-sm text-muted">
          {t("settlementDocs.colNo")}：
          <span className="font-medium tabular-nums text-foreground">
            {doc.no}
          </span>
          <span className="mx-2 text-border">·</span>
          {doc.customerName}
        </p>
        {rows.length === 0 ? (
          <p className="rounded-[var(--radius-control)] bg-chip px-3 py-6 text-center text-sm text-muted">
            {t("settlementDocs.paymentsEmpty")}
          </p>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            onRowClick={
              payPerm.canView ? (r) => setDetailId(r.id) : undefined
            }
          />
        )}
      </Modal>
      {detailId ? (
        <PaymentDetailModal
          open
          onClose={() => setDetailId(null)}
          id={detailId}
          readOnly={!payPerm.canEdit}
        />
      ) : null}
    </>
  );
}
