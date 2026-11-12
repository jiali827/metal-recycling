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
  MaterialTypeCreateModal,
  MaterialTypeDetailModal,
} from "@/features/lazy-modals";
import { deleteConfirmMessage } from "@/shared/lib/confirm-delete";
import { auditColumns, sortByCreatedAtDesc } from "@/shared/lib/list-columns";
import { useI18n } from "@/shared/i18n";
import { useMockStore } from "@/data/mock/store";
import { useModulePermission } from "@/shared/config/menu-permissions";
import type { MaterialMetalKind, MaterialType } from "@/entities/types";

type TriFilter = "all" | "yes" | "no";
type EnabledFilter = "all" | "enabled" | "disabled";
type MetalKindFilter = "all" | MaterialMetalKind;

export default function MaterialTypesPage() {
  const { t } = useI18n();
  const perm = useModulePermission("materialTypes");
  const { materialTypes, removeMaterialType } = useMockStore();
  const confirm = useConfirm();
  const [metalKind, setMetalKind] = useState<MetalKindFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [forPurchase, setForPurchase] = useState<TriFilter>("all");
  const [forSale, setForSale] = useState<TriFilter>("all");
  const [enabled, setEnabled] = useState<EnabledFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const yesNoOptions = useMemo(
    () => [
      { value: "all", label: t("common.all") },
      { value: "yes", label: t("common.yes") },
      { value: "no", label: t("common.no") },
    ],
    [t],
  );

  const metalKindOptions = useMemo(
    () => [
      { value: "all", label: t("common.all") },
      { value: "copper", label: t("fields.materialMetalCopper") },
      { value: "aluminum", label: t("fields.materialMetalAluminum") },
      { value: "iron", label: t("fields.materialMetalIron") },
      { value: "other", label: t("fields.materialMetalOther") },
    ],
    [t],
  );

  const enabledOptions = useMemo(
    () => [
      { value: "all", label: t("common.all") },
      { value: "enabled", label: t("form.enabled") },
      { value: "disabled", label: t("form.disabled") },
    ],
    [t],
  );

  const rows = useMemo(() => {
    return sortByCreatedAtDesc(
      materialTypes.filter((m) => {
        if (metalKind !== "all" && (m.metalKind ?? "iron") !== metalKind) {
          return false;
        }
        if (keyword && !m.name.toLowerCase().includes(keyword.toLowerCase())) {
          return false;
        }
        if (forPurchase === "yes" && !m.forPurchase) return false;
        if (forPurchase === "no" && m.forPurchase) return false;
        if (forSale === "yes" && !m.forSale) return false;
        if (forSale === "no" && m.forSale) return false;
        if (enabled === "enabled" && !m.enabled) return false;
        if (enabled === "disabled" && m.enabled) return false;
        return true;
      }),
    );
  }, [materialTypes, metalKind, keyword, forPurchase, forSale, enabled]);

  async function handleDelete(row: MaterialType) {
    const ok = await confirm(deleteConfirmMessage(row.name));
    if (!ok) return;
    removeMaterialType(row.id);
    if (detailId === row.id) setDetailId(null);
  }

  const metalKindLabel = (kind: MaterialMetalKind) =>
    kind === "copper"
      ? t("fields.materialMetalCopper")
      : kind === "aluminum"
        ? t("fields.materialMetalAluminum")
        : kind === "other"
          ? t("fields.materialMetalOther")
          : t("fields.materialMetalIron");

  const metalKindTone = (kind: MaterialMetalKind) =>
    kind === "copper"
      ? "danger"
      : kind === "aluminum"
        ? "info"
        : kind === "other"
          ? "muted"
          : "warning";

  const fmtKg = (n: number | undefined) =>
    (n ?? 0).toLocaleString("zh-HK");

  const columns: Column<MaterialType>[] = [
    {
      key: "metalKind",
      header: t("fields.materialMetalKind"),
      render: (r) => (
        <StatusBadge tone={metalKindTone(r.metalKind ?? "iron")}>
          {metalKindLabel(r.metalKind ?? "iron")}
        </StatusBadge>
      ),
    },
    {
      key: "name",
      header: t("form.colMaterialName"),
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "openingStock",
      header: t("fields.openingStockKg"),
      render: (r) => (
        <span className="font-medium tabular-nums">
          {fmtKg(r.openingStockKg)} KG
        </span>
      ),
    },
    {
      key: "currentStock",
      header: t("fields.currentStockKg"),
      render: (r) => {
        const v = r.currentStockKg ?? 0;
        return (
          <span
            className={`font-medium tabular-nums ${v < 0 ? "text-danger" : v === 0 ? "text-muted" : ""}`}
          >
            {fmtKg(v)} KG
          </span>
        );
      },
    },
    {
      key: "purchase",
      header: t("form.forPurchase"),
      render: (r) => (
        <StatusBadge tone={r.forPurchase ? "success" : "muted"}>
          {r.forPurchase ? t("common.yes") : t("common.no")}
        </StatusBadge>
      ),
    },
    {
      key: "sale",
      header: t("form.forSale"),
      render: (r) => (
        <StatusBadge tone={r.forSale ? "success" : "muted"}>
          {r.forSale ? t("common.yes") : t("common.no")}
        </StatusBadge>
      ),
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
        title={t("materialTypes.title")}
        actions={perm.canCreate ? (
          <PrimaryButton onClick={() => setCreateOpen(true)}>
            {t("materialTypes.new")}
          </PrimaryButton>
        ) : null}
      />
      <FilterBar>
        <FilterField label={t("fields.materialMetalKind")}>
          <SegmentedControl
            size="sm"
            value={metalKind}
            onChange={(v) => setMetalKind(v as MetalKindFilter)}
            options={metalKindOptions}
            aria-label={t("fields.materialMetalKind")}
          />
        </FilterField>
        <FilterField label={t("common.keyword")}>
          <TextInput
            size="sm"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("form.keywordMaterial")}
          />
        </FilterField>
        <FilterField label={t("form.forPurchase")}>
          <SegmentedControl
            size="sm"
            value={forPurchase}
            onChange={(v) => setForPurchase(v as TriFilter)}
            options={yesNoOptions}
            aria-label={t("form.forPurchase")}
          />
        </FilterField>
        <FilterField label={t("form.forSale")}>
          <SegmentedControl
            size="sm"
            value={forSale}
            onChange={(v) => setForSale(v as TriFilter)}
            options={yesNoOptions}
            aria-label={t("form.forSale")}
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
      <DataTable fillHeight
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetailId(r.id)}
      />
      {createOpen ? (
        <MaterialTypeCreateModal
          open
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => setDetailId(id)}
        />
      ) : null}
      {detailId ? (
        <MaterialTypeDetailModal readOnly={!perm.canEdit}
          open
          onClose={() => setDetailId(null)}
          id={detailId}
        />
      ) : null}
    </ListPageLayout>
  );
}
