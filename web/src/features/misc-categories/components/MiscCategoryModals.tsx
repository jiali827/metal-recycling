"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import { FormField, OptionField, Select, Switch, inputClass } from "@/shared/ui/CrudUi";
import { useMockStore } from "@/data/mock/store";
import { useI18n } from "@/shared/i18n";
import type { PaymentType } from "@/entities/types";

export function MiscCategoryCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { t } = useI18n();
  const { addPaymentMiscCategory } = useMockStore();
  const [name, setName] = useState("");
  const [defaultType, setDefaultType] = useState<PaymentType>("payment");
  const [enabled, setEnabled] = useState(true);

  const typeOptions = useMemo(
    () => [
      { value: "receipt", label: t("common.receipt") },
      { value: "payment", label: t("common.payment") },
    ],
    [t],
  );

  useEffect(() => {
    if (!open) return;
    setName("");
    setDefaultType("payment");
    setEnabled(true);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const row = addPaymentMiscCategory({
      name: name.trim(),
      defaultType,
      enabled,
    });
    onCreated?.(row.id);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("miscCategories.new")}
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="misc-category-create-form" className="ui-btn-primary">
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="misc-category-create-form" className="space-y-4" onSubmit={handleSubmit}>
        <FormField label={t("common.name")} required>
          <input
            className={inputClass}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("form.miscKind")}
          />
        </FormField>
        <FormField label={t("miscCategories.colDefaultType")}>
          <Select
            value={defaultType}
            onChange={(v) => setDefaultType(v as PaymentType)}
            options={typeOptions}
          />
        </FormField>
        <FormField label={t("form.enabledStatus")}>
          <div className="mt-2">
            <Switch
              checked={enabled}
              onChange={setEnabled}
              label={enabled ? t("form.enabled") : t("form.disabled")}
            />
          </div>
        </FormField>
      </form>
    </Modal>
  );
}

export function MiscCategoryDetailModal({
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
  const { paymentMiscCategories, payments, updatePaymentMiscCategory } = useMockStore();
  const row = id ? paymentMiscCategories.find((c) => c.id === id) : undefined;
  const [name, setName] = useState("");
  const [defaultType, setDefaultType] = useState<PaymentType>("payment");
  const [enabled, setEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  const typeOptions = useMemo(
    () => [
      { value: "receipt", label: t("common.receipt") },
      { value: "payment", label: t("common.payment") },
    ],
    [t],
  );

  const recordCount = useMemo(() => {
    if (!row) return 0;
    return payments.filter(
      (p) => p.category === "misc" && (p.miscKindId === row.id),
    ).length;
  }, [payments, row]);

  useEffect(() => {
    if (!open || !row) return;
    setName(row.name);
    setDefaultType(row.defaultType);
    setEnabled(row.enabled);
    setSaved(false);
  }, [open, row]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (!row) return;
    if (!name.trim()) return;
    updatePaymentMiscCategory(row.id, {
      name: name.trim(),
      defaultType,
      enabled,
    });
    setSaved(true);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("form.miscDetail")}
      footer={
        row ? (
          <>
            <button type="button" className="ui-btn-secondary" onClick={onClose}>
              {t("common.close")}
            </button>
            {!readOnly ? (
              <button type="submit" form="misc-category-edit-form" className="ui-btn-primary">
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
        <form id="misc-category-edit-form" className="space-y-4" onSubmit={handleSubmit}>
          <FormField label={t("common.name")} required>
            <input
              className={inputClass}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={readOnly}
              disabled={readOnly}
            />
          </FormField>
          <FormField label={t("miscCategories.colDefaultType")}>
            <Select
              value={defaultType}
              onChange={(v) => setDefaultType(v as PaymentType)}
              options={typeOptions}
              disabled={readOnly}
            />
          </FormField>
          <FormField label={t("form.enabledStatus")}>
            <div className="mt-2">
              <Switch
                checked={enabled}
                onChange={setEnabled}
                disabled={readOnly}
                label={enabled ? t("form.enabled") : t("form.disabled")}
              />
            </div>
          </FormField>
          {recordCount > 0 ? (
            <p className="text-xs text-muted">
              {t("payments.colMiscKind")}: {recordCount} {t("common.payment") || t("payments.colMiscKind")}
            </p>
          ) : null}
          {saved ? <p className="text-sm text-success">{t("common.saved")}</p> : null}
        </form>
      )}
    </Modal>
  );
}
