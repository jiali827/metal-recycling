"use client";

import { useMemo, useState } from "react";
import { ListPageLayout } from "@/shared/layout/ListPageLayout";
import { PageHeader } from "@/shared/ui/PageHeader";
import { DataTable, type Column } from "@/shared/ui/DataTable";
import {
  PrimaryButton,
  RowActions
} from "@/shared/ui/CrudUi";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { CustomerCategoryFormModal } from "@/features/customers/components/CustomerCategoryModals";
import { deleteConfirmMessage } from "@/shared/lib/confirm-delete";
import { auditColumns, sortByCreatedAtDesc } from "@/shared/lib/list-columns";
import { useI18n } from "@/shared/i18n";
import { useMockStore } from "@/data/mock/store";
import { useModulePermission } from "@/shared/config/menu-permissions";
import type { CustomerCategory } from "@/entities/types";

export default function CustomerCategoriesPage() {
  const { t } = useI18n();
  const perm = useModulePermission("customers");
  const confirm = useConfirm();
  const {
    customerCategories,
    addCustomerCategory,
    updateCustomerCategory,
    removeCustomerCategory,
    countCustomersInCategory,
  } = useMockStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const rows = useMemo(
    () => sortByCreatedAtDesc(customerCategories),
    [customerCategories],
  );

  const editing = editId ? customerCategories.find((item) => item.id === editId) : undefined;

  function nameExists(name: string, excludeId?: string) {
    return customerCategories.some(
      (item) => item.name === name && item.id !== excludeId,
    );
  }

  function handleCreate(name: string) {
    if (nameExists(name)) return false;
    addCustomerCategory({ name });
    return true;
  }

  function handleUpdate(name: string) {
    if (!editing) return false;
    if (nameExists(name, editing.id)) return false;
    updateCustomerCategory(editing.id, { name });
    return true;
  }

  async function handleDelete(row: CustomerCategory) {
    const usage = countCustomersInCategory(row.name);
    if (usage > 0) {
      await confirm({
        title: t("customers.categoryDeleteBlockedTitle"),
        message: t("customers.categoryDeleteBlocked", { count: usage }),
        confirmLabel: t("common.confirm"),
        cancelLabel: t("common.close"),
      });
      return;
    }
    const ok = await confirm(deleteConfirmMessage(row.name));
    if (!ok) return;
    removeCustomerCategory(row.id);
    if (editId === row.id) setEditId(null);
  }

  const columns: Column<CustomerCategory>[] = [
    {
      key: "name",
      header: t("customers.categoryColName"),
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "usage",
      header: t("customers.categoryColUsage"),
      className: "tabular-nums",
      render: (r) => countCustomersInCategory(r.name),
    },
    ...auditColumns(t),
    {
      key: "actions",
      header: t("common.actions"),
      stopRowClick: true,
      render: (r) => (
        <RowActions
          onDetail={() => setEditId(r.id)}
          onDelete={perm.canDelete ? () => void handleDelete(r) : undefined}
        />
      ),
    },
  ];

  return (
    <ListPageLayout>
      <PageHeader
        breadcrumbs={[
          { label: t("customers.title"), href: "/customers" },
          { label: t("customers.manageCategories") },
        ]}
        actions={perm.canCreate ? (
          <PrimaryButton onClick={() => setCreateOpen(true)}>
            {t("customers.categoryNew")}
          </PrimaryButton>
        ) : null}
      />
      <DataTable fillHeight
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => setEditId(r.id)}
      />
      {createOpen ? (
        <CustomerCategoryFormModal
          open
          onClose={() => setCreateOpen(false)}
          title={t("customers.categoryNew")}
          formId="customer-category-create-form"
          initialName=""
          onSubmit={handleCreate}
          duplicateError={t("customers.categoryDuplicate")}
        />
      ) : null}
      {editing ? (
        <CustomerCategoryFormModal
          open
          onClose={() => setEditId(null)}
          title={t("customers.categoryEdit")}
          formId="customer-category-edit-form"
          initialName={editing.name}
          usageCount={countCustomersInCategory(editing.name)}
          onSubmit={handleUpdate}
          duplicateError={t("customers.categoryDuplicate")}
          readOnly={!perm.canEdit}
        />
      ) : null}
    </ListPageLayout>
  );
}
