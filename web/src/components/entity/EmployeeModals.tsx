"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  FormField,
  FormFieldFull,
  FormFieldGrid,
  MultiSelect,
  Switch,
  inputClass,
} from "@/components/ui/CrudUi";
import {
  buildEmployeeRoles,
  getUserRoleIds,
} from "@/lib/employee-roles";
import { useMockStore } from "@/lib/mock-store";
import { localizeRoleName, useI18n } from "@/lib/i18n";
import type { RoleId } from "@/lib/types";

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
  const { addEmployee, roles } = useMockStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleIds, setRoleIds] = useState<RoleId[]>([]);
  const [status, setStatus] = useState<"active" | "disabled">("disabled");
  const [roleError, setRoleError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setRoleIds([]);
    setStatus("disabled");
    setRoleError("");
  }, [open]);

  const roleOptions = roles
    .filter((r) => r.enabled)
    .map((r) => ({
      value: r.id,
      label: localizeRoleName(r.id, r.name),
    }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = buildEmployeeRoles(roleIds, roles);
    if (normalized.length === 0) {
      setRoleError(t("form.roleRequired"));
      return;
    }
    const row = addEmployee({
      name,
      email,
      roleIds: normalized,
      status,
    });
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
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
          />
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
}: {
  open: boolean;
  onClose: () => void;
  id: string | null;
}) {
  const { t } = useI18n();
  const { employees, roles, updateEmployee } = useMockStore();
  const row = id ? employees.find((u) => u.id === id) : undefined;
  const [name, setName] = useState("");
  const [roleIds, setRoleIds] = useState<RoleId[]>(["admin"]);
  const [status, setStatus] = useState<"active" | "disabled">("active");
  const [saved, setSaved] = useState(false);
  const [roleError, setRoleError] = useState("");

  useEffect(() => {
    if (!open || !row) return;
    setName(row.name);
    setRoleIds(getUserRoleIds(row));
    setStatus(row.status);
    setSaved(false);
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={row ? `${t("form.employeeDetail")} · ${row.name}` : t("form.employeeDetail")}
      footer={
        row ? (
          <>
            <button type="button" className="ui-btn-secondary" onClick={onClose}>
              {t("common.close")}
            </button>
            <button type="submit" form="employee-edit-form" className="ui-btn-primary">
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
        <form id="employee-edit-form" className="space-y-4" onSubmit={handleSubmit}>
          <FormFieldGrid>
            <FormField label={t("form.displayName")} required>
              <input className={inputClass} required value={name} onChange={(e) => setName(e.target.value)} />
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
        </form>
      )}
    </Modal>
  );
}
