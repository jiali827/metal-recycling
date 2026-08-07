"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import {
  FormField,
  FormFieldFull,
  FormFieldGrid,
  MultiSelect,
  Switch,
  inputClass,
} from "@/shared/ui/CrudUi";
import {
  buildEmployeeRoles,
  getUserRoleIds,
} from "@/entities/employee/roles";
import {
  isEmployeeEmailTaken,
  normalizeEmployeeEmail,
} from "@/entities/employee/email";
import {
  initializeAccountPassword,
  resetPasswordToAccount,
} from "@/entities/auth/password";
import { useMockStore } from "@/data/mock/store";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { localizeRoleName, useI18n } from "@/shared/i18n";
import type { RoleId } from "@/entities/types";

function RoleMultiSelect({
  roleIds,
  onChange,
  options,
  error,
}: {
  roleIds: RoleId[];
  onChange: (next: RoleId[]) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  const { t } = useI18n();

  return (
    <div>
      <MultiSelect
        value={roleIds}
        onChange={(next) => onChange(next as RoleId[])}
        options={options}
        placeholder={t("form.roleSelectPlaceholder")}
        error={Boolean(error)}
      />
      <p className="mt-2 text-xs text-muted">{t("form.rolesHint")}</p>
      {error ? <p className="mt-1 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function EmployeeCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { t } = useI18n();
  const { addEmployee, roles, employees } = useMockStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleIds, setRoleIds] = useState<RoleId[]>([]);
  const [status, setStatus] = useState<"active" | "disabled">("disabled");
  const [roleError, setRoleError] = useState("");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setRoleIds([]);
    setStatus("disabled");
    setRoleError("");
    setEmailError("");
  }, [open]);

  const roleOptions = roles
    .filter((r) => r.enabled)
    .map((r) => ({
      value: r.id,
      label: localizeRoleName(r.id, r.name),
    }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (isEmployeeEmailTaken(employees, trimmedEmail)) {
      setEmailError(t("employees.emailDuplicate"));
      return;
    }
    const normalized = buildEmployeeRoles(roleIds, roles);
    if (normalized.length === 0) {
      setRoleError(t("form.roleRequired"));
      return;
    }
    const row = addEmployee({
      name: name.trim(),
      email: normalizeEmployeeEmail(trimmedEmail),
      roleIds: normalized,
      status,
    });
    initializeAccountPassword(row.email);
    onCreated?.(row.id);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("employees.new")}
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="employee-create-form" className="ui-btn-primary">
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="employee-create-form" className="space-y-4" onSubmit={handleSubmit}>
        <FormField label={t("form.displayName")} required>
          <input className={inputClass} required value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField
          label={t("form.email")}
          required
          hint={t("form.emailAccountHint")}
        >
          <input
            className={inputClass}
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError("");
            }}
            autoComplete="off"
          />
          {emailError ? <p className="mt-1 text-sm text-danger">{emailError}</p> : null}
        </FormField>
        <FormField label={t("form.role")} required>
          <RoleMultiSelect
            roleIds={roleIds}
            onChange={(next) => {
              setRoleIds(next);
              setRoleError("");
            }}
            options={roleOptions}
            error={roleError}
          />
        </FormField>
        <FormField label={t("common.status")}>
          <div className="mt-2">
            <Switch
              checked={status === "active"}
              onChange={(on) => setStatus(on ? "active" : "disabled")}
              label={status === "active" ? t("form.onDuty") : t("form.offDuty")}
            />
          </div>
        </FormField>
      </form>
    </Modal>
  );
}

export function EmployeeDetailModal({
  open,
  onClose,
  id,
  readOnly = false
}: {
  open: boolean;
  onClose: () => void;
  id: string | null;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const { employees, roles, updateEmployee } = useMockStore();
  const row = id ? employees.find((u) => u.id === id) : undefined;
  const [name, setName] = useState("");
  const [roleIds, setRoleIds] = useState<RoleId[]>(["admin"]);
  const [status, setStatus] = useState<"active" | "disabled">("active");
  const [saved, setSaved] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [roleError, setRoleError] = useState("");

  useEffect(() => {
    if (!open || !row) return;
    setName(row.name);
    setRoleIds(getUserRoleIds(row));
    setStatus(row.status);
    setSaved(false);
    setPasswordReset(false);
    setRoleError("");
  }, [open, row]);

  const roleOptions = roles
    .filter((r) => r.enabled || roleIds.includes(r.id as RoleId))
    .map((r) => ({
      value: r.id,
      label: localizeRoleName(r.id, r.name),
    }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (!row) return;
    const normalized = buildEmployeeRoles(roleIds, roles);
    if (normalized.length === 0) {
      setRoleError(t("form.roleRequired"));
      return;
    }
    updateEmployee(row.id, {
      name,
      roleIds: normalized,
      status,
    });
    setSaved(true);
  }

  async function handleResetPassword() {
    if (readOnly || !row) return;
    const ok = await confirm({
      title: t("employees.resetPasswordConfirmTitle"),
      message: t("employees.resetPasswordConfirm", {
        name: row.name,
        email: row.email,
      }),
      confirmLabel: t("employees.resetPassword"),
      danger: true,
    });
    if (!ok) return;
    resetPasswordToAccount(row.email);
    setPasswordReset(true);
    setSaved(false);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("form.employeeDetail")}
      footer={
        row ? (
          <div className="flex w-full items-center justify-between gap-3">
            {!readOnly ? (
              <button
                type="button"
                className="ui-btn-secondary h-8 px-3 text-xs text-muted hover:border-danger/35 hover:bg-red-50/60 hover:text-danger"
                onClick={() => void handleResetPassword()}
              >
                {t("employees.resetPassword")}
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button type="button" className="ui-btn-secondary" onClick={onClose}>
                {t("common.close")}
              </button>
              {!readOnly ? (
            <button type="submit" form="employee-edit-form" className="ui-btn-primary">
                {t("common.save")}
              </button>
          ) : null}
            </div>
          </div>
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
        <form id="employee-edit-form" className="space-y-4" onSubmit={handleSubmit}>
          <fieldset disabled={readOnly} className="min-w-0 space-y-4 border-0 p-0">
          <FormFieldGrid>
            <FormField label={t("form.displayName")} required={!readOnly}>
              <input className={inputClass} required={!readOnly} value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField
              label={t("form.email")}
              hint={t("form.emailAccountHint")}
            >
              <input
                className={inputClass}
                type="email"
                value={row.email}
                disabled
                readOnly
                autoComplete="username"
              />
            </FormField>
            <FormFieldFull>
              <FormField label={t("form.role")} required>
                <RoleMultiSelect
                  roleIds={roleIds}
                  onChange={(next) => {
                    setRoleIds(next);
                    setRoleError("");
                  }}
                  options={roleOptions}
                  error={roleError}
                />
              </FormField>
            </FormFieldFull>
            <FormField label={t("common.status")}>
              <div className="mt-2">
                <Switch
                  checked={status === "active"}
                  onChange={(on) => setStatus(on ? "active" : "disabled")}
                  label={status === "active" ? t("form.onDuty") : t("form.offDuty")}
                />
              </div>
            </FormField>
          </FormFieldGrid>
          {saved ? <p className="text-sm text-success">{t("common.saved")}</p> : null}
          {passwordReset ? (
            <p className="text-sm text-success">{t("employees.resetPasswordSuccess")}</p>
          ) : null}
          </fieldset>
        </form>
      )}
    </Modal>
  );
}
