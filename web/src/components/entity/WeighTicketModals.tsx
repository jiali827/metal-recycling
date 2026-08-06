"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  DateTimePicker,
  FormField,
  FormFieldFull,
  FormFieldGrid,
  FormSection,
  InputWithUnit,
  OptionField,
  Select,
  SearchableSelect,
  inputClass,
} from "@/components/ui/CrudUi";
import { contractFieldsForWeighTicket } from "@/lib/contract-form";
import { nowLocalDateTime } from "@/lib/date";
import { formatKg, formatMoney } from "@/lib/format";
import { useMockStore } from "@/lib/mock-store";
import { useMoneyUnits } from "@/lib/use-money-units";
import { useI18n } from "@/lib/i18n";
import type { TicketDirection, TicketStatus } from "@/lib/types";

const NO_CONTRACT = "";

function WeighDateTimeField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <FormField label={label} required>
      <DateTimePicker value={value} onChange={onChange} />
    </FormField>
  );
}

export function WeighTicketCreateModal({
  open,
  onClose,
  onCreated,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
  preset?: {
    contractNo?: string;
    direction?: TicketDirection;
    customerName?: string;
  };
}) {
  const { t } = useI18n();
  const { addWeighTicket, customers, contracts, materialTypes } = useMockStore();
  const moneyUnits = useMoneyUnits();
  const [bxNo, setBxNo] = useState("");
  const [contractNo, setContractNo] = useState(NO_CONTRACT);
  const [direction, setDirection] = useState<TicketDirection>("purchase");
  const [date, setDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [plate, setPlate] = useState("");
  const [materialSummary, setMaterialSummary] = useState("");
  const [grossKg, setGrossKg] = useState("");
  const [tareKg, setTareKg] = useState("");
  const [deductionKg, setDeductionKg] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [remarks, setRemarks] = useState("");

  const directionOptions = useMemo(
    () => [
      { value: "purchase", label: t("common.purchase") },
      { value: "sale", label: t("common.sale") },
    ],
    [t],
  );

  const applyContractFields = (fields: ReturnType<typeof contractFieldsForWeighTicket>) => {
    setDirection(fields.direction);
    setCustomerName(fields.customerName);
    if (fields.materialSummary) setMaterialSummary(fields.materialSummary);
    if (fields.unitPrice) setUnitPrice(fields.unitPrice);
  };

  const contractLocked = Boolean(
    contractNo && contracts.some((c) => c.no === contractNo),
  );

  useEffect(() => {
    if (!open) return;
    setBxNo("");
    setContractNo(preset?.contractNo ?? NO_CONTRACT);
    setDirection(preset?.direction ?? "purchase");
    setDate(nowLocalDateTime());
    setCustomerName(preset?.customerName ?? "");
    setPlate("");
    setMaterialSummary("");
    setGrossKg("");
    setTareKg("");
    setDeductionKg("");
    setUnitPrice("");
    setRemarks("");
  }, [open, preset]);

  useEffect(() => {
    if (!open || !preset?.contractNo) return;
    const contract = contracts.find((c) => c.no === preset.contractNo);
    if (contract) applyContractFields(contractFieldsForWeighTicket(contract));
  }, [open, preset?.contractNo, contracts]);

  const netKg = useMemo(() => {
    return Math.max(
      0,
      (Number(grossKg) || 0) -
        (Number(tareKg) || 0) -
        Math.abs(Number(deductionKg) || 0),
    );
  }, [grossKg, tareKg, deductionKg]);

  const amount = useMemo(
    () => netKg * (Number(unitPrice) || 0),
    [netKg, unitPrice],
  );

  const customerOptions = customers.map((c) => ({ value: c.name, label: c.name }));
  const materialOptions = materialTypes.map((m) => ({ value: m.name, label: m.name }));
  const contractOptions = [
    { value: NO_CONTRACT, label: t("form.noContract") },
    ...contracts.map((c) => ({
      value: c.no,
      label: `${c.no} · ${c.customerName}`,
    })),
  ];

  function handleContractChange(no: string) {
    setContractNo(no);
    if (!no) return;
    const contract = contracts.find((c) => c.no === no);
    if (contract) applyContractFields(contractFieldsForWeighTicket(contract));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const row = addWeighTicket({
      bxNo,
      direction,
      date,
      customerName,
      plate: plate || "-",
      materialSummary,
      grossKg: Number(grossKg) || 0,
      tareKg: Number(tareKg) || 0,
      deductionKg: Number(deductionKg) || 0,
      netKg,
      amount,
      contractNo: contractNo || "-",
      status: "normal",
      remarks: remarks || undefined,
    });
    onCreated?.(row.id);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("weighTickets.new")}
      size="xl"
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="weigh-create-form" className="ui-btn-primary">
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="weigh-create-form" onSubmit={handleSubmit}>
        <FormSection title={t("form.sectionBasic")}>
          <FormFieldGrid>
            <FormField label={t("fields.bxNo")} required>
              <input className={inputClass} required value={bxNo} onChange={(e) => setBxNo(e.target.value)} />
            </FormField>
            <FormField label={t("fields.plate")}>
              <input
                className={inputClass}
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder={t("form.platePlaceholder")}
              />
            </FormField>
            <FormField label={t("form.relatedContract")}>
              <SearchableSelect
                value={contractNo}
                onChange={handleContractChange}
                options={contractOptions}
              />
            </FormField>
            <FormField label={t("menu.customers")} required>
              <SearchableSelect
                value={customerName}
                onChange={setCustomerName}
                options={customerOptions}
                disabled={contractLocked}
              />
            </FormField>
            {contractLocked ? (
              <FormFieldFull>
                <p className="text-xs text-muted">{t("form.contractLinkedHint")}</p>
              </FormFieldFull>
            ) : null}
            <FormField label={t("menu.materialTypes")} required>
              <Select
                value={materialSummary}
                onChange={setMaterialSummary}
                options={materialOptions}
                disabled={contractLocked}
              />
            </FormField>
            <FormField label={t("fields.direction")}>
              <OptionField
                value={direction}
                onChange={(v) => setDirection(v as TicketDirection)}
                options={directionOptions}
                disabled={contractLocked}
              />
            </FormField>
          </FormFieldGrid>
        </FormSection>
        <FormSection title={t("form.sectionWeigh")}>
          <FormFieldGrid>
            <FormField label={t("fields.gross")} required>
              <InputWithUnit
                type="number"
                value={grossKg}
                onChange={(e) => setGrossKg(e.target.value)}
                unit={t("form.unitKg")}
              />
            </FormField>
            <FormField label={t("fields.tare")} required>
              <InputWithUnit
                type="number"
                value={tareKg}
                onChange={(e) => setTareKg(e.target.value)}
                unit={t("form.unitKg")}
              />
            </FormField>
            <FormField label={t("fields.deduction")}>
              <InputWithUnit
                type="number"
                value={deductionKg}
                onChange={(e) => setDeductionKg(e.target.value)}
                unit={t("form.unitKg")}
              />
            </FormField>
            <FormField label={t("fields.unitPrice")} required>
              <InputWithUnit
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                unit={moneyUnits.moneyPerKg}
                disabled={contractLocked}
              />
            </FormField>
            <FormField label={t("fields.net")}>
              <div className="ui-form-readonly tabular-nums">{formatKg(netKg)}</div>
            </FormField>
            <FormField label={t("fields.amount")}>
              <div className="ui-form-readonly tabular-nums">{formatMoney(amount)}</div>
            </FormField>
            <WeighDateTimeField
              label={t("fields.weighDateTime")}
              value={date}
              onChange={setDate}
            />
          </FormFieldGrid>
        </FormSection>
        <FormSection title={t("form.sectionOptional")}>
          <FormField label={t("form.remarkOptional")}>
            <textarea
              className={`${inputClass} min-h-[4.5rem] resize-y`}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={t("form.remarkPlaceholder")}
            />
          </FormField>
        </FormSection>
      </form>
    </Modal>
  );
}

export function WeighTicketDetailModal({
  open,
  onClose,
  id,
}: {
  open: boolean;
  onClose: () => void;
  id: string | null;
}) {
  const { t } = useI18n();
  const { weighTickets, updateWeighTicket, customers, contracts, materialTypes } =
    useMockStore();
  const moneyUnits = useMoneyUnits();
  const row = id ? weighTickets.find((ticket) => ticket.id === id) : undefined;

  const [bxNo, setBxNo] = useState("");
  const [contractNo, setContractNo] = useState(NO_CONTRACT);
  const [direction, setDirection] = useState<TicketDirection>("purchase");
  const [date, setDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [plate, setPlate] = useState("");
  const [materialSummary, setMaterialSummary] = useState("");
  const [grossKg, setGrossKg] = useState("0");
  const [tareKg, setTareKg] = useState("0");
  const [deductionKg, setDeductionKg] = useState("0");
  const [unitPrice, setUnitPrice] = useState("0");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState<TicketStatus>("normal");
  const [saved, setSaved] = useState(false);

  const directionOptions = useMemo(
    () => [
      { value: "purchase", label: t("common.purchase") },
      { value: "sale", label: t("common.sale") },
    ],
    [t],
  );

  const ticketStatusOptions = useMemo(
    () => [
      { value: "normal", label: t("status.normal") },
      { value: "void", label: t("status.void") },
    ],
    [t],
  );

  const applyContractFields = (fields: ReturnType<typeof contractFieldsForWeighTicket>) => {
    setDirection(fields.direction);
    setCustomerName(fields.customerName);
    if (fields.materialSummary) setMaterialSummary(fields.materialSummary);
    if (fields.unitPrice) setUnitPrice(fields.unitPrice);
  };

  const contractLocked = Boolean(
    contractNo && contracts.some((c) => c.no === contractNo),
  );

  useEffect(() => {
    if (!open || !row) return;
    setBxNo(row.bxNo);
    setDirection(row.direction);
    setDate(row.date);
    setCustomerName(row.customerName);
    setPlate(row.plate === "-" ? "" : row.plate);
    setMaterialSummary(row.materialSummary);
    setGrossKg(String(row.grossKg));
    setTareKg(String(row.tareKg));
    setDeductionKg(String(row.deductionKg));
    const derivedUnit =
      row.netKg > 0 ? Number((row.amount / row.netKg).toFixed(4)) : 0;
    setUnitPrice(String(derivedUnit));
    setContractNo(row.contractNo === "-" ? NO_CONTRACT : row.contractNo);
    setRemarks(row.remarks ?? "");
    setStatus(row.status);
    setSaved(false);
  }, [open, row]);

  const netKg = useMemo(() => {
    return Math.max(
      0,
      (Number(grossKg) || 0) -
        (Number(tareKg) || 0) -
        Math.abs(Number(deductionKg) || 0),
    );
  }, [grossKg, tareKg, deductionKg]);

  const amount = useMemo(
    () => netKg * (Number(unitPrice) || 0),
    [netKg, unitPrice],
  );

  const customerOptions = customers.map((c) => ({ value: c.name, label: c.name }));
  if (customerName && !customers.some((c) => c.name === customerName)) {
    customerOptions.push({ value: customerName, label: customerName });
  }

  const materialOptions = materialTypes.map((m) => ({ value: m.name, label: m.name }));
  if (materialSummary && !materialTypes.some((m) => m.name === materialSummary)) {
    materialOptions.push({ value: materialSummary, label: materialSummary });
  }

  const contractOptions = [
    { value: NO_CONTRACT, label: t("form.noContract") },
    ...contracts.map((c) => ({
      value: c.no,
      label: `${c.no} · ${c.customerName}`,
    })),
  ];
  if (contractNo && !contracts.some((c) => c.no === contractNo)) {
    contractOptions.push({ value: contractNo, label: contractNo });
  }

  function handleContractChange(no: string) {
    setContractNo(no);
    if (!no) return;
    const contract = contracts.find((c) => c.no === no);
    if (contract) applyContractFields(contractFieldsForWeighTicket(contract));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    updateWeighTicket(row.id, {
      bxNo,
      direction,
      date,
      customerName,
      plate: plate || "-",
      materialSummary,
      grossKg: Number(grossKg) || 0,
      tareKg: Number(tareKg) || 0,
      deductionKg: Number(deductionKg) || 0,
      netKg,
      amount,
      contractNo: contractNo || "-",
      status,
      remarks: remarks || undefined,
    });
    setSaved(true);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={row ? `${t("form.weighDetail")} · BX${row.bxNo}` : t("form.weighDetail")}
      size="xl"
      footer={
        row ? (
          <>
            <button type="button" className="ui-btn-secondary" onClick={onClose}>
              {t("common.close")}
            </button>
            <button type="submit" form="weigh-edit-form" className="ui-btn-primary">
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
        <form id="weigh-edit-form" onSubmit={handleSubmit}>
          <FormSection title={t("form.sectionBasic")}>
            <FormFieldGrid>
              <FormField label={t("fields.bxNo")} required>
                <input
                  className={inputClass}
                  required
                  value={bxNo}
                  onChange={(e) => setBxNo(e.target.value)}
                />
              </FormField>
              <FormField label={t("fields.plate")}>
                <input
                  className={inputClass}
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder={t("form.platePlaceholder")}
                />
              </FormField>
              <FormField label={t("form.relatedContract")}>
                <SearchableSelect
                  value={contractNo}
                  onChange={handleContractChange}
                  options={contractOptions}
                />
              </FormField>
              <FormField label={t("menu.customers")} required>
                <SearchableSelect
                  value={customerName}
                  onChange={setCustomerName}
                  options={customerOptions}
                  disabled={contractLocked}
                />
              </FormField>
              {contractLocked ? (
                <FormFieldFull>
                  <p className="text-xs text-muted">{t("form.contractLinkedHint")}</p>
                </FormFieldFull>
              ) : null}
              <FormField label={t("menu.materialTypes")} required>
                <Select
                  value={materialSummary}
                  onChange={setMaterialSummary}
                  options={materialOptions}
                  disabled={contractLocked}
                />
              </FormField>
              <FormField label={t("fields.direction")}>
                <OptionField
                  value={direction}
                  onChange={(v) => setDirection(v as TicketDirection)}
                  options={directionOptions}
                  disabled={contractLocked}
                />
              </FormField>
              <FormField label={t("common.status")}>
                <OptionField
                  value={status}
                  onChange={(v) => setStatus(v as TicketStatus)}
                  options={ticketStatusOptions}
                />
              </FormField>
            </FormFieldGrid>
          </FormSection>
          <FormSection title={t("form.sectionWeigh")}>
            <FormFieldGrid>
              <FormField label={t("fields.gross")} required>
                <InputWithUnit
                  type="number"
                  value={grossKg}
                  onChange={(e) => setGrossKg(e.target.value)}
                  unit={t("form.unitKg")}
                />
              </FormField>
              <FormField label={t("fields.tare")} required>
                <InputWithUnit
                  type="number"
                  value={tareKg}
                  onChange={(e) => setTareKg(e.target.value)}
                  unit={t("form.unitKg")}
                />
              </FormField>
              <FormField label={t("fields.deduction")}>
                <InputWithUnit
                  type="number"
                  value={deductionKg}
                  onChange={(e) => setDeductionKg(e.target.value)}
                  unit={t("form.unitKg")}
                />
              </FormField>
              <FormField label={t("fields.unitPrice")} required>
                <InputWithUnit
                  type="number"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  unit={moneyUnits.moneyPerKg}
                  disabled={contractLocked}
                />
              </FormField>
              <FormField label={t("fields.net")}>
                <div className="ui-form-readonly tabular-nums">{formatKg(netKg)}</div>
              </FormField>
              <FormField label={t("fields.amount")}>
                <div className="ui-form-readonly tabular-nums">{formatMoney(amount)}</div>
              </FormField>
              <WeighDateTimeField
                label={t("fields.weighDateTime")}
                value={date}
                onChange={setDate}
              />
            </FormFieldGrid>
          </FormSection>
          <FormSection title={t("form.sectionOptional")}>
            <FormField label={t("form.remarkOptional")}>
              <textarea
                className={`${inputClass} min-h-[4.5rem] resize-y`}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={t("form.remarkPlaceholder")}
              />
            </FormField>
          </FormSection>
          {saved ? <p className="text-sm text-success">{t("common.saved")}</p> : null}
        </form>
      )}
    </Modal>
  );
}
