"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import { FormField, Select, inputClass } from "@/shared/ui/CrudUi";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import {
  buildCustomerSettlementMap,
  getCustomerSettlement,
  type CustomerSettleStatus,
} from "@/entities/settlement/customer-settlement";
import { formatMoney } from "@/shared/lib/format";
import { getSettlementStatusLabel, useI18n } from "@/shared/i18n";
import { useMockStore } from "@/data/mock/store";

function settleTone(
  status: CustomerSettleStatus,
): "default" | "success" | "warning" | "info" | "danger" {
  if (status === "settled") return "success";
  if (status === "partial") return "warning";
  if (status === "open") return "danger";
  return "default";
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
  const { addCustomer, customerCategories } = useMockStore();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [contact, setContact] = useState("");

  const categoryOptions = useMemo(
    () => customerCategories.map((c) => ({ value: c.name, label: c.name })),
    [customerCategories],
  );

  useEffect(() => {
    if (!open) return;
    setName("");
    setCategory("");
    setContact("");
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const row = addCustomer({ name, category, contact: contact || undefined });
    onCreated?.(row.id);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("customers.new")}
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
        <FormField label={t("common.name")} required>
          <input className={inputClass} required value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label={t("common.contact")}>
          <input className={inputClass} value={contact} onChange={(e) => setContact(e.target.value)} />
        </FormField>
        <FormField label={t("common.category")}>
          <Select
            value={category}
            onChange={setCategory}
            options={categoryOptions}
            placeholder={t("form.selectPlaceholder")}
          />
        </FormField>
      </form>
    </Modal>
  );
}

export function CustomerDetailModal({
  open,
  onClose,
  id,
}: {
  open: boolean;
  onClose: () => void;
  id: string | null;
}) {
  const { t } = useI18n();
  const { customers, updateCustomer, customerCategories, receivables, payables } =
    useMockStore();
  const row = id ? customers.find((c) => c.id === id) : undefined;
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [contact, setContact] = useState("");
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
    setName(row.name);
    setCategory(row.category);
    setContact(row.contact ?? "");
    setSaved(false);
  }, [open, row]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    updateCustomer(row.id, { name, category, contact: contact || undefined });
    setSaved(true);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={row ? `${t("form.customerDetail")} · ${row.name}` : t("form.customerDetail")}
      footer={
        row ? (
          <>
            <button type="button" className="ui-btn-secondary" onClick={onClose}>
              {t("common.close")}
            </button>
            <button type="submit" form="customer-edit-form" className="ui-btn-primary">
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
                  <div className="text-[11px] text-muted">
                    {t("customers.colArBalance")}
                  </div>
                  <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                    {formatMoney(settlement.arBalance)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted">
                    {t("customers.colApBalance")}
                  </div>
                  <div className="mt-0.5 font-semibold tabular-nums text-foreground">
                    {formatMoney(settlement.apBalance)}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <FormField label={t("common.name")} required>
            <input className={inputClass} required value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label={t("common.contact")}>
            <input className={inputClass} value={contact} onChange={(e) => setContact(e.target.value)} />
          </FormField>
          <FormField label={t("common.category")}>
            <Select
              value={category}
              onChange={setCategory}
              options={categoryOptions}
              placeholder={t("form.selectPlaceholder")}
            />
          </FormField>
          {saved ? <p className="text-sm text-success">{t("common.saved")}</p> : null}
        </form>
      )}
    </Modal>
  );
}
