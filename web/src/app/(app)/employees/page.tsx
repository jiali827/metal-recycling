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
import { PrimaryButton, RowActions } from "@/shared/ui/CrudUi";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import {
  EmployeeCreateModal,
  EmployeeDetailModal,
} from "@/features/lazy-modals";
import { deleteConfirmMessage } from "@/shared/lib/confirm-delete";
import { formatUserRoleLabels, getUserRoleIds } from "@/entities/employee/roles";
import { auditColumns, sortByCreatedAtDesc } from "@/shared/lib/list-columns";
import { localizeRoleName, useI18n } from "@/shared/i18n";
import { useMockStore } from "@/data/mock/store";
import type { User } from "@/entities/types";

export default function EmployeesPage() {
  const { t, locale } = useI18n();
  const { employees, roles, removeEmployee } = useMockStore();
  const confirm = useConfirm();
  const [keyword, setKeyword] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return sortByCreatedAtDesc(
      employees.filter((u) => {
        const roleLabel = formatUserRoleLabels(u, roles, locale);
        if (
          keyword &&
          !`${u.name}${u.email}${roleLabel}`
            .toLowerCase()
            .includes(keyword.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    );
  }, [employees, keyword, locale, roles]);

  async function handleDelete(row: User) {
    const ok = await confirm(deleteConfirmMessage(row.name));
    if (!ok) return;
    removeEmployee(row.id);
    if (detailId === row.id) setDetailId(null);
  }

  const columns: Column<User>[] = [
    {
      key: "name",
      header: t("settings.displayName"),
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    { key: "email", header: t("login.email"), render: (r) => r.email },
    {
      key: "role",
      header: t("form.colRole"),
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {getUserRoleIds(r).map((id) => (
            <StatusBadge key={id} tone="info">
              {localizeRoleName(id, roles.find((role) => role.id === id)?.name, locale)}
            </StatusBadge>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      render: (r) => (
        <StatusBadge tone={r.status === "active" ? "success" : "danger"}>
          {r.status === "active" ? t("form.onDuty") : t("form.offDuty")}
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
        title={t("employees.title")}
        actions={
          <PrimaryButton onClick={() => setCreateOpen(true)}>{t("employees.new")}</PrimaryButton>
        }
      />
      <FilterBar>
        <FilterField label={t("common.keyword")}>
          <input
            className={filterControlClass}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("form.keywordEmployee")}
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
        <EmployeeCreateModal
          open
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => setDetailId(id)}
        />
      ) : null}
      {detailId ? (
        <EmployeeDetailModal
          open
          onClose={() => setDetailId(null)}
          id={detailId}
        />
      ) : null}
    </ListPageLayout>
  );
}
