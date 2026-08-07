"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import { FormField, inputClass } from "@/shared/ui/CrudUi";
import { useI18n } from "@/shared/i18n";

export function CustomerCategoryFormModal({
  open,
  onClose,
  title,
  formId,
  initialName,
  usageCount,
  onSubmit,
  duplicateError,
  readOnly = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  formId: string;
  initialName: string;
  usageCount?: number;
  onSubmit: (name: string) => boolean;
  duplicateError?: string;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setError("");
  }, [open, initialName]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("customers.categoryNameRequired"));
      return;
    }
    if (onSubmit(trimmed)) {
      onClose();
    } else if (duplicateError) {
      setError(duplicateError);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {readOnly ? t("common.close") : t("common.cancel")}
          </button>
          {!readOnly ? (
            <button type="submit" form={formId} className="ui-btn-primary">
              {t("common.save")}
            </button>
          ) : null}
        </>
      }
    >
      <form id={formId} className="space-y-3" onSubmit={handleSubmit}>
        <FormField label={t("customers.categoryColName")} required={!readOnly}>
          <input
            className={inputClass}
            required={!readOnly}
            value={name}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
          />
        </FormField>
        {usageCount && usageCount > 0 ? (
          <p className="text-xs leading-relaxed text-muted">
            {t("customers.categoryRenameHint", { count: usageCount })}
          </p>
        ) : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </form>
    </Modal>
  );
}
