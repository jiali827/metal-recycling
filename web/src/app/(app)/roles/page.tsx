"use client";

import { useMemo, useState } from "react";
import { ListPageLayout } from "@/shared/layout/ListPageLayout";
import { PageHeader } from "@/shared/ui/PageHeader";
import { DataTable, type Column } from "@/shared/ui/DataTable";
import {
  PrimaryButton,
  RowActions
} from "@/shared/ui/CrudUi";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { RoleCreateModal, RoleDetailModal } from "@/features/lazy-modals";
import { roleDeleteConfirmMessage } from "@/entities/role/confirm";
import { auditColumns, sortByCreatedAtDesc } from "@/shared/lib/list-columns";
import {
  localizeRoleName,
  localizeRolePermissions,
  useI18n,
} from "@/shared/i18n";
import { useMockStore } from "@/data/mock/store";
import { useModulePermission } from "@/shared/config/menu-permissions";
import type { RoleDef } from "@/entities/types";

export default function RolesPage() {
  const { t, locale } = useI18n();
  const perm = useModulePermission("roles");
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
          onDelete={perm.canDelete ? () => void handleDelete(r) : undefined}
        />
      ),
    },
  ];

  return (
    <ListPageLayout>
      <PageHeader
        title={t("roles.title")}
        actions={perm.canCreate ? (
          <PrimaryButton onClick={() => setCreateOpen(true)}>{t("roles.new")}</PrimaryButton>
        ) : null}
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
        <RoleDetailModal readOnly={!perm.canEdit}
          open
          onClose={() => setDetailId(null)}
          id={detailId}
        />
      ) : null}
    </ListPageLayout>
  );
}
