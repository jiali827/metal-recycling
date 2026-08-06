"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import {
  DatePicker,
  FormField,
  FormFieldFull,
  FormFieldGrid,
  FormSection,
  InputWithUnit,
  OptionField,
  Select,
  SearchableSelect,
  inputClass,
} from "@/shared/ui/CrudUi";
import {
  ContractUploadZone,
  type ContractAttachmentValue,
} from "@/features/contracts/components/ContractUploadZone";
import { todayISO } from "@/shared/lib/date";
import { useMockStore } from "@/data/mock/store";
import { useI18n } from "@/shared/i18n";
import type { ContractStatus, ContractType } from "@/entities/types";

export function ContractCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { t } = useI18n();
  const { addContract, customers } = useMockStore();
  const [no, setNo] = useState("");
  const [type, setType] = useState<ContractType>("purchase");
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState<ContractStatus>("draft");
  const [plannedKg, setPlannedKg] = useState("");
  const [unitPriceSummary, setUnitPriceSummary] = useState("");
  const [date, setDate] = useState("");
  const [attachment, setAttachment] = useState<ContractAttachmentValue | null>(null);

  const typeOptions = useMemo(
    () => [
      { value: "purchase", label: t("common.purchase") },
      { value: "sale", label: t("common.sale") },
    ],
    [t],
  );

  const statusCreateOptions = useMemo(
    () => [
      { value: "draft", label: t("status.draft") },
      { value: "active", label: t("status.active") },
      { value: "fulfilling", label: t("status.fulfilling") },
    ],
    [t],
  );

  useEffect(() => {
    if (!open) return;
    setNo("");
    setType("purchase");
    setCustomerId("");
    setStatus("draft");
    setPlannedKg("");
    setUnitPriceSummary("");
    setDate(todayISO());
    setAttachment(null);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const customer = customers.find((c) => c.id === customerId);
    const row = addContract({
      no,
      type,
      customerId,
      customerName: customer?.name ?? t("form.unnamedCustomer"),
      status,
      plannedKg: Number(plannedKg) || 0,
      fulfilledKg: 0,
      unitPriceSummary,
      date,
      attachmentName: attachment?.fileName,
      attachmentDataUrl: attachment?.dataUrl,
    });
    onCreated?.(row.id);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("contracts.new")}
      size="lg"
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="contract-create-form" className="ui-btn-primary">
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="contract-create-form" onSubmit={handleSubmit}>
        <FormSection title={t("form.contractDetail")}>
          <FormFieldGrid>
            <FormField label={t("fields.contractNo")} required>
              <input className={inputClass} required value={no} onChange={(e) => setNo(e.target.value)} />
            </FormField>
            <FormField label={t("form.plannedKg")} required>
              <InputWithUnit
                type="number"
                required
                value={plannedKg}
                onChange={(e) => setPlannedKg(e.target.value)}
                unit={t("form.unitKg")}
              />
            </FormField>
            <FormField label={t("form.counterpartyCustomer")} required>
              <SearchableSelect
                value={customerId}
                onChange={setCustomerId}
                options={customers.map((c) => ({ value: c.id, label: c.name }))}
                placeholder={t("form.selectCustomer")}
              />
            </FormField>
            <FormField label={t("common.type")}>
              <OptionField
                value={type}
                onChange={(v) => setType(v as ContractType)}
                options={typeOptions}
              />
            </FormField>
            <FormFieldFull>
              <FormField label={t("form.unitPriceSummary")} required>
                <input
                  className={inputClass}
                  required
                  value={unitPriceSummary}
                  onChange={(e) => setUnitPriceSummary(e.target.value)}
                />
              </FormField>
            </FormFieldFull>
            <FormField label={t("common.status")}>
              <OptionField
                value={status}
                onChange={(v) => setStatus(v as ContractStatus)}
                options={statusCreateOptions}
              />
            </FormField>
            <FormField label={t("fields.signedDate")} required>
              <DatePicker value={date} onChange={setDate} />
            </FormField>
          </FormFieldGrid>
        </FormSection>
        <FormSection title={t("form.sectionOptional")}>
          <FormField label={t("contracts.uploadTitle")}>
            <ContractUploadZone value={attachment} onChange={setAttachment} />
          </FormField>
        </FormSection>
      </form>
    </Modal>
  );
}

export function ContractDetailModal({
  open,
  onClose,
  id,
}: {
  open: boolean;
  onClose: () => void;
  id: string | null;
}) {
  const { t } = useI18n();
  const { contracts, customers, updateContract } = useMockStore();
  const row = id ? contracts.find((c) => c.id === id) : undefined;
  const [no, setNo] = useState("");
  const [type, setType] = useState<ContractType>("purchase");
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState<ContractStatus>("active");
  const [plannedKg, setPlannedKg] = useState("0");
  const [fulfilledKg, setFulfilledKg] = useState("0");
  const [unitPriceSummary, setUnitPriceSummary] = useState("");
  const [date, setDate] = useState("");
  const [attachment, setAttachment] = useState<ContractAttachmentValue | null>(null);
  const [saved, setSaved] = useState(false);

  const typeOptions = useMemo(
    () => [
      { value: "purchase", label: t("common.purchase") },
      { value: "sale", label: t("common.sale") },
    ],
    [t],
  );

  const statusEditOptions = useMemo(
    () => [
      { value: "draft", label: t("status.draft") },
      { value: "active", label: t("status.active") },
      { value: "fulfilling", label: t("status.fulfilling") },
      { value: "completed", label: t("status.completed") },
      { value: "closed", label: t("status.closed") },
    ],
    [t],
  );

  useEffect(() => {
    if (!open || !row) return;
    setNo(row.no);
    setType(row.type);
    setCustomerId(row.customerId);
    setStatus(row.status);
    setPlannedKg(String(row.plannedKg));
    setFulfilledKg(String(row.fulfilledKg));
    setUnitPriceSummary(row.unitPriceSummary);
    setDate(row.date);
    setAttachment(
      row.attachmentName
        ? { fileName: row.attachmentName, dataUrl: row.attachmentDataUrl }
        : null,
    );
    setSaved(false);
  }, [open, row]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    const customer = customers.find((c) => c.id === customerId);
    updateContract(row.id, {
      no,
      type,
      customerId,
      customerName: customer?.name ?? row.customerName,
      status,
      plannedKg: Number(plannedKg) || 0,
      fulfilledKg: Number(fulfilledKg) || 0,
      unitPriceSummary,
      date,
      attachmentName: attachment?.fileName,
      attachmentDataUrl: attachment?.dataUrl,
    });
    setSaved(true);
  }

  const customerOptions = customers.map((c) => ({ value: c.id, label: c.name }));
  if (row && !customers.some((c) => c.id === customerId)) {
    customerOptions.push({ value: customerId, label: row.customerName });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={row ? `${t("form.contractDetail")} · ${row.no}` : t("form.contractDetail")}
      size="lg"
      footer={
        row ? (
          <>
            <button type="button" className="ui-btn-secondary" onClick={onClose}>
              {t("common.close")}
            </button>
            <button type="submit" form="contract-edit-form" className="ui-btn-primary">
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
        <form id="contract-edit-form" onSubmit={handleSubmit}>
          <FormSection title={t("form.contractDetail")}>
            <FormFieldGrid>
              <FormField label={t("fields.contractNo")} required>
                <input className={inputClass} required value={no} onChange={(e) => setNo(e.target.value)} />
              </FormField>
              <FormField label={t("form.plannedKg")} required>
                <InputWithUnit
                  type="number"
                  required
                  value={plannedKg}
                  onChange={(e) => setPlannedKg(e.target.value)}
                  unit={t("form.unitKg")}
                />
              </FormField>
              <FormField label={t("form.counterpartyCustomer")} required>
                <SearchableSelect value={customerId} onChange={setCustomerId} options={customerOptions} />
              </FormField>
              <FormField label={t("common.type")}>
                <OptionField
                  value={type}
                  onChange={(v) => setType(v as ContractType)}
                  options={typeOptions}
                />
              </FormField>
              <FormFieldFull>
                <FormField label={t("form.unitPriceSummary")} required>
                  <input
                    className={inputClass}
                    required
                    value={unitPriceSummary}
                    onChange={(e) => setUnitPriceSummary(e.target.value)}
                  />
                </FormField>
              </FormFieldFull>
              <FormField label={t("common.status")}>
                <Select
                  value={status}
                  onChange={(v) => setStatus(v as ContractStatus)}
                  options={statusEditOptions}
                />
              </FormField>
              <FormField label={t("form.fulfilledKg")}>
                <InputWithUnit
                  type="number"
                  value={fulfilledKg}
                  onChange={(e) => setFulfilledKg(e.target.value)}
                  unit={t("form.unitKg")}
                />
              </FormField>
              <FormField label={t("fields.signedDate")} required>
                <DatePicker value={date} onChange={setDate} />
              </FormField>
            </FormFieldGrid>
          </FormSection>
          <FormSection title={t("form.sectionOptional")}>
            <FormField label={t("contracts.uploadTitle")}>
              <ContractUploadZone value={attachment} onChange={setAttachment} />
            </FormField>
          </FormSection>
          {saved ? <p className="text-sm text-success">{t("common.saved")}</p> : null}
        </form>
      )}
    </Modal>
  );
}
