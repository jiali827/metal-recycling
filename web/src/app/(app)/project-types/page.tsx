"use client";

import { useMemo, useState } from "react";
import { ListPageLayout } from "@/shared/layout/ListPageLayout";
import { PageHeader } from "@/shared/ui/PageHeader";
import { DataTable, type Column } from "@/shared/ui/DataTable";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import {
  FilterBar,
  FilterField,
  filterControlClass,
} from "@/shared/ui/FilterBar";
import { PrimaryButton, RowActions, SegmentedControl } from "@/shared/ui/CrudUi";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import {
  ProjectTypeCreateModal,
  ProjectTypeDetailModal,
} from "@/features/lazy-modals";
import { deleteConfirmMessage } from "@/shared/lib/confirm-delete";
import { auditColumns, sortByCreatedAtDesc } from "@/shared/lib/list-columns";
import { useI18n } from "@/shared/i18n";
import { useMockStore } from "@/data/mock/store";
import type { ProjectType } from "@/entities/types";

type EnabledFilter = "all" | "enabled" | "disabled";

export default function ProjectTypesPage() {
  const { t } = useI18n();
  const { projectTypes, removeProjectType } = useMockStore();
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

  const rows = useMemo(() => {
    return sortByCreatedAtDesc(
      projectTypes.filter((p) => {
        if (keyword && !p.name.toLowerCase().includes(keyword.toLowerCase())) {
          return false;
        }
        if (enabled === "enabled" && !p.enabled) return false;
        if (enabled === "disabled" && p.enabled) return false;
        return true;
      }),
    );
  }, [projectTypes, keyword, enabled]);

  async function handleDelete(row: ProjectType) {
    const ok = await confirm(deleteConfirmMessage(row.name));
    if (!ok) return;
    removeProjectType(row.id);
    if (detailId === row.id) setDetailId(null);
  }

  const columns: Column<ProjectType>[] = [
    {
      key: "name",
      header: t("common.name"),
      render: (r) => <span className="font-medium">{r.name}</span>,
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
          onDelete={() => void handleDelete(r)}
        />
      ),
    },
  ];

  return (
    <ListPageLayout>
      <PageHeader
        title={t("projectTypes.title")}
        actions={
          <PrimaryButton onClick={() => setCreateOpen(true)}>
            {t("projectTypes.new")}
          </PrimaryButton>
        }
      />
      <FilterBar>
        <FilterField label={t("common.keyword")}>
          <input
            className={filterControlClass}
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
        <ProjectTypeCreateModal
          open
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => setDetailId(id)}
        />
      ) : null}
      {detailId ? (
        <ProjectTypeDetailModal
          open
          onClose={() => setDetailId(null)}
          id={detailId}
        />
      ) : null}
    </ListPageLayout>
  );
}
