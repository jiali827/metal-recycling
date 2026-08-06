"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import { Checkbox, FormField, Switch, inputClass } from "@/shared/ui/CrudUi";
import { useMockStore } from "@/data/mock/store";
import { useI18n } from "@/shared/i18n";

export function MaterialTypeCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { t } = useI18n();
  const { addMaterialType } = useMockStore();
  const [name, setName] = useState("");
  const [forPurchase, setForPurchase] = useState(false);
  const [forSale, setForSale] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setForPurchase(false);
    setForSale(false);
    setEnabled(false);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const row = addMaterialType({
      name,
      forPurchase,
      forSale,
      enabled,
    });
    onCreated?.(row.id);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("materialTypes.new")}
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="material-create-form" className="ui-btn-primary">
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="material-create-form" className="space-y-4" onSubmit={handleSubmit}>
        <FormField label={t("common.name")} required>
          <input className={inputClass} required value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label={t("form.usage")}>
          <div className="mt-2 flex flex-col gap-2.5">
            <Checkbox
              checked={forPurchase}
              onChange={setForPurchase}
              label={t("form.forPurchase")}
            />
            <Checkbox checked={forSale} onChange={setForSale} label={t("form.forSale")} />
          </div>
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

export function MaterialTypeDetailModal({
  open,
  onClose,
  id,
}: {
  open: boolean;
  onClose: () => void;
  id: string | null;
}) {
  const { t } = useI18n();
  const { materialTypes, updateMaterialType } = useMockStore();
  const row = id ? materialTypes.find((m) => m.id === id) : undefined;
  const [name, setName] = useState("");
  const [forPurchase, setForPurchase] = useState(false);
  const [forSale, setForSale] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    setName(row.name);
    setForPurchase(row.forPurchase);
    setForSale(row.forSale);
    setEnabled(row.enabled);
    setSaved(false);
  }, [open, row]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    updateMaterialType(row.id, {
      name,
      forPurchase,
      forSale,
      enabled,
    });
    setSaved(true);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("form.materialDetail")}
      footer={
        row ? (
          <>
            <button type="button" className="ui-btn-secondary" onClick={onClose}>
              {t("common.close")}
            </button>
            <button type="submit" form="material-edit-form" className="ui-btn-primary">
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
        <form id="material-edit-form" className="space-y-4" onSubmit={handleSubmit}>
          <FormField label={t("common.name")} required>
            <input className={inputClass} required value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label={t("form.usage")}>
            <div className="mt-2 flex flex-col gap-2.5">
              <Checkbox
                checked={forPurchase}
                onChange={setForPurchase}
                label={t("form.forPurchase")}
              />
              <Checkbox checked={forSale} onChange={setForSale} label={t("form.forSale")} />
            </div>
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
          {saved ? <p className="text-sm text-success">{t("common.saved")}</p> : null}
        </form>
      )}
    </Modal>
  );
}
