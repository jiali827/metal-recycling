"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { FormField, Switch, inputClass } from "@/shared/ui/CrudUi";
import { RolePermissionEditor } from "@/features/roles/components/RolePermissionEditor";
import { localizeRoleName, useI18n } from "@/shared/i18n";
import { useMockStore } from "@/data/mock/store";
import {
  accessToPermissionSummary,
  createDefaultAccess,
  resolveRoleAccess,
  type RoleAccessMap,
} from "@/shared/config/permissions";
import { roleEnableConfirmMessage } from "@/entities/role/confirm";

export function RoleCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { t } = useI18n();
  const { addRole } = useMockStore();
  const confirm = useConfirm();
  const [name, setName] = useState("");
  const [access, setAccess] = useState<RoleAccessMap>(() => createDefaultAccess());
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName("");
    setAccess(createDefaultAccess());
    setEnabled(true);
  }, [open]);

  async function handleEnabledChange(next: boolean) {
    if (next === enabled) return;
    const ok = await confirm(
      roleEnableConfirmMessage(name.trim() || t("roles.unnamed"), next),
    );
    if (ok) setEnabled(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const row = addRole({
      name,
      access,
      permissions: accessToPermissionSummary(access),
      enabled,
    });
    onCreated?.(row.id);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("roles.new")}
      size="2xl"
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="role-create-form" className="ui-btn-primary">
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="role-create-form" className="space-y-5" onSubmit={handleSubmit}>
        <FormField label={t("form.roleName")} required>
          <input
            className={inputClass}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <FormField label={t("permissions.title")}>
          <RolePermissionEditor value={access} onChange={setAccess} />
        </FormField>
        <FormField label={t("form.enabledStatus")}>
          <div className="mt-2">
            <Switch
              checked={enabled}
              onChange={(on) => void handleEnabledChange(on)}
              label={enabled ? t("form.enabled") : t("form.disabled")}
            />
          </div>
        </FormField>
      </form>
    </Modal>
  );
}

export function RoleDetailModal({
  open,
  onClose,
  id,
}: {
  open: boolean;
  onClose: () => void;
  id: string | null;
}) {
  const { t, locale } = useI18n();
  const { roles, updateRole } = useMockStore();
  const confirm = useConfirm();
  const row = id ? roles.find((r) => r.id === id) : undefined;
  const [name, setName] = useState("");
  const [access, setAccess] = useState<RoleAccessMap>(() => createDefaultAccess());
  const [enabled, setEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    setName(localizeRoleName(row.id, row.name, locale));
    setAccess(resolveRoleAccess(row));
    setEnabled(row.enabled);
    setSaved(false);
  }, [open, row, locale]);

  async function handleEnabledChange(next: boolean) {
    if (next === enabled) return;
    const ok = await confirm(
      roleEnableConfirmMessage(name.trim() || t("roles.unnamed"), next),
    );
    if (ok) setEnabled(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    updateRole(row.id, {
      name,
      access,
      permissions: accessToPermissionSummary(access),
      enabled,
    });
    setSaved(true);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      title={t("form.roleDetail")}
      footer={
        row ? (
          <>
            <button type="button" className="ui-btn-secondary" onClick={onClose}>
              {t("common.close")}
            </button>
            <button type="submit" form="role-edit-form" className="ui-btn-primary">
              {t("common.save")}
            </button>
          </>
        ) : (
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.close")}
          </button>
        )
      }
    >
      {!row ? (
        <p className="text-sm text-muted">{t("common.notFoundHint")}</p>
      ) : (
        <form id="role-edit-form" className="space-y-5" onSubmit={handleSubmit}>
          <FormField label={t("form.roleName")} required>
            <input
              className={inputClass}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
          <FormField label={t("permissions.title")}>
            <RolePermissionEditor value={access} onChange={setAccess} />
          </FormField>
          <FormField label={t("form.enabledStatus")}>
            <div className="mt-2">
              <Switch
                checked={enabled}
                onChange={(on) => void handleEnabledChange(on)}
                label={enabled ? t("form.enabled") : t("form.disabled")}
              />
            </div>
          </FormField>
          {saved ? <p className="text-sm text-success">{t("common.saved")}</p> : null}
        </form>
      )}
    </Modal>
  );
}
