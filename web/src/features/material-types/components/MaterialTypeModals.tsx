"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import {
  Checkbox,
  FormField,
  OptionField,
  Switch,
  inputClass,
} from "@/shared/ui/CrudUi";
import { useMockStore } from "@/data/mock/store";
import { useI18n } from "@/shared/i18n";
import type { MaterialMetalKind } from "@/entities/types";

function useMetalKindOptions(t: ReturnType<typeof useI18n>["t"]) {
  return useMemo(
    () => [
      { value: "copper", label: t("fields.materialMetalCopper") },
      { value: "aluminum", label: t("fields.materialMetalAluminum") },
      { value: "iron", label: t("fields.materialMetalIron") },
      { value: "other", label: t("fields.materialMetalOther") },
    ],
    [t],
  );
}

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
  const [metalKind, setMetalKind] = useState<MaterialMetalKind>("iron");
  const [name, setName] = useState("");
  const [openingStockKg, setOpeningStockKg] = useState("0");
  const [forPurchase, setForPurchase] = useState(false);
  const [forSale, setForSale] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const metalKindOptions = useMetalKindOptions(t);

  useEffect(() => {
    if (!open) return;
    setMetalKind("iron");
    setName("");
    setOpeningStockKg("0");
    setForPurchase(false);
    setForSale(false);
    setEnabled(false);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const opening = Math.max(0, Number(openingStockKg) || 0);
    const row = addMaterialType({
      metalKind,
      name,
      openingStockKg: opening,
      currentStockKg: opening,
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
        <FormField label={t("fields.materialMetalKind")} required>
          <OptionField
            value={metalKind}
            onChange={(v) => setMetalKind(v as MaterialMetalKind)}
            options={metalKindOptions}
          />
        </FormField>
        <FormField label={t("common.name")} required>
          <input
            className={inputClass}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <FormField label={t("fields.openingStockKg")}>
          <input
            className={inputClass}
            type="number"
            min={0}
            step="1"
            value={openingStockKg}
            onChange={(e) => setOpeningStockKg(e.target.value)}
          />
          <p className="text-xs text-muted">{t("form.stockLockedHint")}</p>
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
  readOnly = false,
}: {
  open: boolean;
  onClose: () => void;
  id: string | null;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const { materialTypes, updateMaterialType } = useMockStore();
  const row = id ? materialTypes.find((m) => m.id === id) : undefined;
  const [metalKind, setMetalKind] = useState<MaterialMetalKind>("iron");
  const [name, setName] = useState("");
  const [forPurchase, setForPurchase] = useState(false);
  const [forSale, setForSale] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [saved, setSaved] = useState(false);
  const metalKindOptions = useMetalKindOptions(t);

  useEffect(() => {
    if (!open || !row) return;
    setMetalKind(row.metalKind ?? "iron");
    setName(row.name);
    setForPurchase(row.forPurchase);
    setForSale(row.forSale);
    setEnabled(row.enabled);
    setSaved(false);
  }, [open, row]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (!row) return;
    updateMaterialType(row.id, {
      metalKind,
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
            {!readOnly ? (
              <button type="submit" form="material-edit-form" className="ui-btn-primary">
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
        <form id="material-edit-form" className="space-y-4" onSubmit={handleSubmit}>
          <FormField label={t("fields.materialMetalKind")} required>
            <OptionField
              value={metalKind}
              onChange={(v) => setMetalKind(v as MaterialMetalKind)}
              options={metalKindOptions}
              disabled={readOnly}
            />
          </FormField>
          <FormField label={t("common.name")} required>
            <input
              className={inputClass}
              required
              value={name}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
          <FormField label={t("fields.openingStockKg")}>
            <input
              className={inputClass}
              value={(row.openingStockKg ?? 0).toLocaleString("zh-HK")}
              readOnly
              disabled
            />
            <p className="text-xs text-muted">{t("form.stockLockedHint")}</p>
          </FormField>
          <FormField label={t("fields.currentStockKg")}>
            <input
              className={`${inputClass} ${(row.currentStockKg ?? 0) < 0 ? "text-danger" : ""}`}
              value={(row.currentStockKg ?? 0).toLocaleString("zh-HK")}
              readOnly
              disabled
            />
          </FormField>
          <FormField label={t("form.usage")}>
            <div className="mt-2 flex flex-col gap-2.5">
              <Checkbox
                checked={forPurchase}
                onChange={setForPurchase}
                label={t("form.forPurchase")}
                disabled={readOnly}
              />
              <Checkbox
                checked={forSale}
                onChange={setForSale}
                label={t("form.forSale")}
                disabled={readOnly}
              />
            </div>
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
          {saved ? <p className="text-sm text-success">{t("common.saved")}</p> : null}
        </form>
      )}
    </Modal>
  );
}
