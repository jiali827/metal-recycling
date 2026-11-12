"use client";

import { useMemo, useState } from "react";
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
  SegmentedControl,
  TextInput
} from "@/shared/ui/CrudUi";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import {
  MiscCategoryCreateModal,
  MiscCategoryDetailModal,
} from "@/features/lazy-modals";
import { deleteConfirmMessage } from "@/shared/lib/confirm-delete";
import { auditColumns, sortByCreatedAtDesc } from "@/shared/lib/list-columns";
import { useI18n } from "@/shared/i18n";
import { useMockStore } from "@/data/mock/store";
import { useModulePermission } from "@/shared/config/menu-permissions";
import { formatMoney } from "@/shared/lib/format";
import type { PaymentMiscCategory } from "@/entities/types";

type EnabledFilter = "all" | "enabled" | "disabled";

export default function MiscCategoriesPage() {
  const { t } = useI18n();
  const perm = useModulePermission("miscCategories");
  const { paymentMiscCategories, payments, removePaymentMiscCategory } = useMockStore();
  const confirm = useConfirm();
  const [keyword, setKeyword] = useState("");
  const [enabled, setEnabled] = useState<EnabledFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const enabledOptions = useMemo(
    () => [
      { value: "all", label: t("common.all") },
      { value: "enabled", label: t("form.enabled") },
      { value: "disabled", label: t("form.disabled") },
    ],
    [t],
  );

  const recordCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments) {
      if (p.category === "misc" && p.miscKindId) {
        map.set(p.miscKindId, (map.get(p.miscKindId) ?? 0) + 1);
      }
    }
    return map;
  }, [payments]);

  const rows = useMemo(() => {
    return sortByCreatedAtDesc(
      paymentMiscCategories.filter((c) => {
        if (keyword && !c.name.toLowerCase().includes(keyword.toLowerCase())) {
          return false;
        }
        if (enabled === "enabled" && !c.enabled) return false;
        if (enabled === "disabled" && c.enabled) return false;
        return true;
      }),
    );
  }, [paymentMiscCategories, keyword, enabled]);

  async function handleDelete(row: PaymentMiscCategory) {
    const count = recordCounts.get(row.id) ?? 0;
    const ok = await confirm(
      count > 0
        ? { message: t("miscCategories.deleteHasRecordsWarning", { count: String(count) }), danger: true }
        : deleteConfirmMessage(row.name),
    );
    if (!ok) return;
    removePaymentMiscCategory(row.id);
    if (detailId === row.id) setDetailId(null);
  }

  const columns: Column<PaymentMiscCategory>[] = [
    {
      key: "name",
      header: t("miscCategories.colName"),
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "defaultType",
      header: t("miscCategories.colDefaultType"),
      render: (r) => (
        <StatusBadge tone={r.defaultType === "receipt" ? "success" : "warning"}>
          {r.defaultType === "receipt" ? t("common.receipt") : t("common.payment")}
        </StatusBadge>
      ),
    },
    {
      key: "recordCount",
      header: t("miscCategories.colRecordCount"),
      render: (r) => {
        const count = recordCounts.get(r.id) ?? 0;
        return (
          <span className="tabular-nums text-sm">
            {count > 0 ? String(count) : "—"}
          </span>
        );
      },
    },
    {
      key: "enabled",
      header: t("form.enabledStatus"),
      render: (r) => (
        <StatusBadge tone={r.enabled ? "info" : "danger"}>
          {r.enabled ? t("form.enabled") : t("form.disabled")}
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
          onDelete={perm.canDelete ? () => void handleDelete(r) : undefined}
        />
      ),
    },
  ];

  return (
    <ListPageLayout>
      <PageHeader
        title={t("miscCategories.title")}
        actions={perm.canCreate ? (
          <PrimaryButton onClick={() => setCreateOpen(true)}>
            {t("miscCategories.new")}
          </PrimaryButton>
        ) : null}
      />
      <FilterBar>
        <FilterField label={t("common.keyword")}>
          <TextInput
            size="sm"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("form.keywordProject")}
          />
        </FilterField>
        <FilterField label={t("form.enabledStatus")}>
          <SegmentedControl
            size="sm"
            value={enabled}
            onChange={(v) => setEnabled(v as EnabledFilter)}
            options={enabledOptions}
            aria-label={t("form.enabledStatus")}
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
        <MiscCategoryCreateModal
          open
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => setDetailId(id)}
        />
      ) : null}
      {detailId ? (
        <MiscCategoryDetailModal
          readOnly={!perm.canEdit}
          open
          onClose={() => setDetailId(null)}
          id={detailId}
        />
      ) : null}
    </ListPageLayout>
  );
}
