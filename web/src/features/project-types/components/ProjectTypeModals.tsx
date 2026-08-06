"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import { FormField, Switch, inputClass } from "@/shared/ui/CrudUi";
import { useMockStore } from "@/data/mock/store";
import { useI18n } from "@/shared/i18n";

export function ProjectTypeCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { t } = useI18n();
  const { addProjectType } = useMockStore();
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName("");
    setEnabled(true);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const row = addProjectType({
      name,
      enabled,
    });
    onCreated?.(row.id);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("projectTypes.new")}
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="project-type-create-form" className="ui-btn-primary">
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="project-type-create-form" className="space-y-4" onSubmit={handleSubmit}>
        <FormField label={t("common.name")} required>
          <input className={inputClass} required value={name} onChange={(e) => setName(e.target.value)} />
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

export function ProjectTypeDetailModal({
  open,
  onClose,
  id,
}: {
  open: boolean;
  onClose: () => void;
  id: string | null;
}) {
  const { t } = useI18n();
  const { projectTypes, updateProjectType } = useMockStore();
  const row = id ? projectTypes.find((p) => p.id === id) : undefined;
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    setName(row.name);
    setEnabled(row.enabled);
    setSaved(false);
  }, [open, row]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    updateProjectType(row.id, {
      name,
      enabled,
    });
    setSaved(true);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("form.projectDetail")}
      footer={
        row ? (
          <>
            <button type="button" className="ui-btn-secondary" onClick={onClose}>
              {t("common.close")}
            </button>
            <button type="submit" form="project-type-edit-form" className="ui-btn-primary">
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
        <form id="project-type-edit-form" className="space-y-4" onSubmit={handleSubmit}>
          <FormField label={t("common.name")} required>
            <input className={inputClass} required value={name} onChange={(e) => setName(e.target.value)} />
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
