"use client";

import { useMemo, useState } from "react";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PrimaryButton, RowActions } from "@/components/ui/CrudUi";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { RoleCreateModal, RoleDetailModal } from "@/components/entity/lazy-modals";
import { roleDeleteConfirmMessage } from "@/lib/role-confirm";
import { auditColumns, sortByCreatedAtDesc } from "@/lib/list-columns";
import {
  localizeRoleName,
  localizeRolePermissions,
  useI18n,
} from "@/lib/i18n";
import { useMockStore } from "@/lib/mock-store";
import type { RoleDef } from "@/lib/types";

export default function RolesPage() {
  const { t, locale } = useI18n();
  const { roles, removeRole } = useMockStore();
  const confirm = useConfirm();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(() => sortByCreatedAtDesc(roles), [roles]);

  async function handleDelete(row: RoleDef) {
    const ok = await confirm(
      roleDeleteConfirmMessage(localizeRoleName(row.id, row.name)),
    );
    if (!ok) return;
    removeRole(row.id);
    if (detailId === row.id) setDetailId(null);
  }

  const columns: Column<RoleDef>[] = [
    {
      key: "name",
      header: t("form.roleName"),
      render: (r) => (
        <span className="font-medium">{localizeRoleName(r.id, r.name)}</span>
      ),
    },
    {
      key: "id",
      header: t("form.colRoleCode"),
      render: (r) => <span className="tabular-nums text-muted">{r.id}</span>,
    },
    {
      key: "status",
      header: t("form.enabledStatus"),
      render: (r) => (
        <StatusBadge tone={r.enabled ? "success" : "danger"}>
          {r.enabled ? t("form.enabled") : t("form.disabled")}
        </StatusBadge>
      ),
    },
    {
      key: "perms",
      header: t("form.colPermissions"),
      render: (r) => localizeRolePermissions(r.id, r.permissions, locale, r.access),
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
        title={t("roles.title")}
        actions={
          <PrimaryButton onClick={() => setCreateOpen(true)}>{t("roles.new")}</PrimaryButton>
        }
      />
      <DataTable fillHeight
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetailId(r.id)}
      />
      {createOpen ? (
        <RoleCreateModal
          open
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => setDetailId(id)}
        />
      ) : null}
      {detailId ? (
        <RoleDetailModal
          open
          onClose={() => setDetailId(null)}
          id={detailId}
        />
      ) : null}
    </ListPageLayout>
  );
}
