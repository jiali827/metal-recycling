"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import {
  FormField,
  FormFieldFull,
  FormFieldGrid,
  FormSection,
  Select,
  inputClass,
  textareaClass,
} from "@/shared/ui/CrudUi";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { nextCustomerNo } from "@/entities/customer/customer-no";
import {
  buildCustomerSettlementMap,
  getCustomerSettlement,
  type CustomerSettleStatus,
} from "@/entities/settlement/customer-settlement";
import { formatMoney } from "@/shared/lib/format";
import { getSettlementStatusLabel, useI18n } from "@/shared/i18n";
import { useMockStore } from "@/data/mock/store";
import type { Customer } from "@/entities/types";

function settleTone(
  status: CustomerSettleStatus,
): "default" | "success" | "warning" | "info" | "danger" {
  if (status === "settled") return "success";
  if (status === "partial") return "warning";
  if (status === "open") return "danger";
  return "default";
}

type CustomerFormState = {
  customerNo: string;
  name: string;
  category: string;
  contactName: string;
  phone: string;
  email: string;
  siteName: string;
  address: string;
  invoiceTitle: string;
  taxNo: string;
  remarks: string;
};

const emptyForm = (): CustomerFormState => ({
  customerNo: "",
  name: "",
  category: "",
  contactName: "",
  phone: "",
  email: "",
  siteName: "",
  address: "",
  invoiceTitle: "",
  taxNo: "",
  remarks: "",
});

function formFromCustomer(row: Customer): CustomerFormState {
  return {
    customerNo: row.customerNo,
    name: row.name,
    category: row.category,
    contactName: row.contactName ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    siteName: row.siteName ?? "",
    address: row.address ?? "",
    invoiceTitle: row.invoiceTitle ?? "",
    taxNo: row.taxNo ?? "",
    remarks: row.remarks ?? "",
  };
}

function editablePayloadFromForm(
  form: CustomerFormState,
): Omit<Customer, "id" | "customerNo" | "createdAt" | "updatedAt"> {
  const trim = (v: string) => v.trim();
  return {
    name: trim(form.name),
    category: form.category,
    contactName: trim(form.contactName) || undefined,
    phone: trim(form.phone) || undefined,
    email: trim(form.email) || undefined,
    siteName: trim(form.siteName) || undefined,
    address: trim(form.address) || undefined,
    invoiceTitle: trim(form.invoiceTitle) || undefined,
    taxNo: trim(form.taxNo) || undefined,
    remarks: trim(form.remarks) || undefined,
  };
}

function CustomerFormFields({
  form,
  onChange,
  readOnly,
  categoryOptions,
}: {
  form: CustomerFormState;
  onChange: (next: CustomerFormState) => void;
  readOnly?: boolean;
  categoryOptions: { value: string; label: string }[];
}) {
  const { t } = useI18n();
  const patch = (partial: Partial<CustomerFormState>) => onChange({ ...form, ...partial });

  return (
    <div className="space-y-6">
      <FormSection title={t("customers.sectionBasic")}>
        <FormFieldGrid>
          <FormField label={t("customers.customerNo")} hint={t("customers.customerNoAutoHint")}>
            <input
              className={inputClass}
              value={form.customerNo}
              readOnly
              disabled
              tabIndex={-1}
            />
          </FormField>
          <FormField label={t("common.name")} required>
            <input
              className={inputClass}
              required
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              readOnly={readOnly}
              disabled={readOnly}
            />
          </FormField>
          <FormField label={t("common.category")}>
            <Select
              value={form.category}
              onChange={(v) => patch({ category: v })}
              options={categoryOptions}
              placeholder={t("form.selectPlaceholder")}
              disabled={readOnly}
            />
          </FormField>
        </FormFieldGrid>
      </FormSection>

      <FormSection title={t("customers.sectionContact")}>
        <FormFieldGrid>
          <FormField label={t("contracts.contactName")}>
            <input
              className={inputClass}
              value={form.contactName}
              onChange={(e) => patch({ contactName: e.target.value })}
              readOnly={readOnly}
              disabled={readOnly}
            />
          </FormField>
          <FormField label={t("customers.phone")}>
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => patch({ phone: e.target.value })}
              readOnly={readOnly}
              disabled={readOnly}
            />
          </FormField>
          <FormField label={t("login.email")}>
            <input
              className={inputClass}
              type="email"
              value={form.email}
              onChange={(e) => patch({ email: e.target.value })}
              readOnly={readOnly}
              disabled={readOnly}
            />
          </FormField>
        </FormFieldGrid>
      </FormSection>

      <FormSection title={t("customers.sectionSite")}>
        <FormFieldGrid>
          <FormField label={t("customers.siteName")}>
            <input
              className={inputClass}
              value={form.siteName}
              onChange={(e) => patch({ siteName: e.target.value })}
              placeholder={t("customers.siteNamePlaceholder")}
              readOnly={readOnly}
              disabled={readOnly}
            />
          </FormField>
        </FormFieldGrid>
        <FormFieldFull>
          <FormField label={t("customers.address")}>
            <input
              className={inputClass}
              value={form.address}
              onChange={(e) => patch({ address: e.target.value })}
              readOnly={readOnly}
              disabled={readOnly}
            />
          </FormField>
        </FormFieldFull>
      </FormSection>

      <FormSection title={t("customers.sectionInvoice")}>
        <FormFieldGrid>
          <FormField label={t("customers.invoiceTitle")}>
            <input
              className={inputClass}
              value={form.invoiceTitle}
              onChange={(e) => patch({ invoiceTitle: e.target.value })}
              readOnly={readOnly}
              disabled={readOnly}
            />
          </FormField>
          <FormField label={t("customers.taxNo")}>
            <input
              className={inputClass}
              value={form.taxNo}
              onChange={(e) => patch({ taxNo: e.target.value })}
              readOnly={readOnly}
              disabled={readOnly}
            />
          </FormField>
        </FormFieldGrid>
      </FormSection>

      <FormField label={t("customers.remarks")}>
        <textarea
          className={textareaClass}
          rows={3}
          value={form.remarks}
          onChange={(e) => patch({ remarks: e.target.value })}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </FormField>
    </div>
  );
}

export function CustomerCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { t } = useI18n();
  const { addCustomer, customers, customerCategories } = useMockStore();
  const [form, setForm] = useState<CustomerFormState>(emptyForm);

  const categoryOptions = useMemo(
    () => customerCategories.map((c) => ({ value: c.name, label: c.name })),
    [customerCategories],
  );

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm(),
      customerNo: nextCustomerNo(customers),
    });
  }, [open, customers]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const assignedNo = nextCustomerNo(customers);
    const row = addCustomer({
      customerNo: assignedNo,
      ...editablePayloadFromForm(form),
    });
    onCreated?.(row.id);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("customers.new")}
      size="lg"
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="customer-create-form" className="ui-btn-primary">
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="customer-create-form" className="space-y-4" onSubmit={handleSubmit}>
        <CustomerFormFields
          form={form}
          onChange={setForm}
          categoryOptions={categoryOptions}
        />
      </form>
    </Modal>
  );
}

export function CustomerDetailModal({
  open,
  onClose,
  id,
  readOnly = false,
}: {
  open: boolean;
  onClose: () => void;
  id: string | null;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const { customers, updateCustomer, customerCategories, receivables, payables } =
    useMockStore();
  const row = id ? customers.find((c) => c.id === id) : undefined;
  const [form, setForm] = useState<CustomerFormState>(emptyForm);
  const [saved, setSaved] = useState(false);

  const categoryOptions = useMemo(
    () => customerCategories.map((c) => ({ value: c.name, label: c.name })),
    [customerCategories],
  );

  const settlement = useMemo(() => {
    if (!row) return null;
    const map = buildCustomerSettlementMap(receivables, payables);
    return getCustomerSettlement(map, row.name);
  }, [row, receivables, payables]);

  const statusLabel = getSettlementStatusLabel();

  useEffect(() => {
    if (!open || !row) return;
    setForm(formFromCustomer(row));
    setSaved(false);
  }, [open, row]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (!row) return;
    updateCustomer(row.id, editablePayloadFromForm(form));
    setSaved(true);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={row ? `${t("form.customerDetail")} · ${row.customerNo}` : t("form.customerDetail")}
      size="lg"
      footer={
        row ? (
          <>
            <button type="button" className="ui-btn-secondary" onClick={onClose}>
              {t("common.close")}
            </button>
            {!readOnly ? (
              <button type="submit" form="customer-edit-form" className="ui-btn-primary">
                {t("common.save")}
              </button>
            ) : null}
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
        <form id="customer-edit-form" className="space-y-4" onSubmit={handleSubmit}>
          {settlement ? (
            <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-chip/50 px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted">
                  {t("customers.detailSettlement")}
                </span>
                <StatusBadge tone={settleTone(settlement.status)}>
                  {settlement.status === "none"
                    ? t("customers.settleNone")
                    : statusLabel[settlement.status]}
                </StatusBadge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[11px] text-muted">{t("customers.colArBalance")}</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                    {formatMoney(settlement.arBalance)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted">{t("customers.colApBalance")}</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                    {formatMoney(settlement.apBalance)}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <CustomerFormFields
            form={form}
            onChange={setForm}
            readOnly={readOnly}
            categoryOptions={categoryOptions}
          />
          {saved ? <p className="text-sm text-success">{t("common.saved")}</p> : null}
        </form>
      )}
    </Modal>
  );
}
