"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
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
} from "@/shared/ui/CrudUi";
import {
  contractFieldsForPurchaseLine,
  contractFieldsForSaleLine,
  contractFieldsForWeighTicketFromPurchase,
  contractFieldsForWeighTicketFromSale,
} from "@/entities/contract/form";
import { saleLineOverTolerance } from "@/entities/contract/summaries";
import { nextWeighTicketBxNo } from "@/entities/weigh-ticket/bx-no";
import { nowLocalDateTime } from "@/shared/lib/date";
import { formatKg, formatMoney } from "@/shared/lib/format";
import { useMockStore } from "@/data/mock/store";
import { useMoneyUnits } from "@/shared/lib/use-money-units";
import { useI18n } from "@/shared/i18n";
import type { TicketDirection, TicketStatus } from "@/entities/types";

const NO_CONTRACT = "";

type ContractFields = {
  direction: TicketDirection;
  customerName: string;
  materialSummary: string;
  unitPrice: string;
};

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
    saleContractId?: string;
    saleContractLineId?: string;
  };
}) {
  const { t } = useI18n();
  const { addWeighTicket, weighTickets, customers, purchaseContracts, saleContracts, materialTypes } =
    useMockStore();
  const moneyUnits = useMoneyUnits();
  const [bxNo, setBxNo] = useState("");
  const [contractNo, setContractNo] = useState(NO_CONTRACT);
  const [saleContractId, setSaleContractId] = useState(NO_CONTRACT);
  const [saleContractLineId, setSaleContractLineId] = useState(NO_CONTRACT);
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

  const applyContractFields = (fields: ContractFields) => {
    setDirection(fields.direction);
    setCustomerName(fields.customerName);
    if (fields.materialSummary) setMaterialSummary(fields.materialSummary);
    if (fields.unitPrice) setUnitPrice(fields.unitPrice);
  };

  const saleContract = saleContracts.find((c) => c.id === saleContractId);
  const saleLine = saleContract?.lines.find((l) => l.id === saleContractLineId);
  const contractLocked =
    (direction === "sale" && Boolean(saleContractId && saleContractLineId)) ||
    (direction === "purchase" &&
      Boolean(contractNo && purchaseContracts.some((c) => c.no === contractNo)));

  useEffect(() => {
    if (!open) return;
    setBxNo(nextWeighTicketBxNo(weighTickets));
    setContractNo(preset?.contractNo ?? NO_CONTRACT);
    setSaleContractId(preset?.saleContractId ?? NO_CONTRACT);
    setSaleContractLineId(preset?.saleContractLineId ?? NO_CONTRACT);
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
    if (preset.direction === "sale" || preset.saleContractId) {
      const sc =
        saleContracts.find((c) => c.id === preset.saleContractId) ||
        saleContracts.find((c) => c.no === preset.contractNo);
      if (sc) {
        setSaleContractId(sc.id);
        const line =
          sc.lines.find((l) => l.id === preset.saleContractLineId) ?? sc.lines[0];
        if (line) {
          setSaleContractLineId(line.id);
          applyContractFields(contractFieldsForSaleLine(sc, line));
        } else {
          applyContractFields(contractFieldsForWeighTicketFromSale(sc));
        }
      }
      return;
    }
    const pc = purchaseContracts.find((c) => c.no === preset.contractNo);
    if (pc) applyContractFields(contractFieldsForWeighTicketFromPurchase(pc));
  }, [open, preset, purchaseContracts, saleContracts]);

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
  const purchaseContractOptions = [
    { value: NO_CONTRACT, label: t("form.noContract") },
    ...purchaseContracts.map((c) => ({
      value: c.no,
      label: `${c.no} · ${c.customerName}`,
    })),
  ];
  const saleContractOptions = [
    { value: NO_CONTRACT, label: t("form.noContract") },
    ...saleContracts
      .filter((c) => c.status === "active" || c.status === "fulfilling")
      .map((c) => ({
        value: c.id,
        label: `${c.no} · ${c.customerName}`,
      })),
  ];
  const saleLineOptions =
    saleContract?.lines.map((l) => ({
      value: l.id,
      label: `${l.materialName} · ${l.plannedQty} KG`,
    })) ?? [];

  function handlePurchaseContractChange(no: string) {
    setContractNo(no);
    setSaleContractId(NO_CONTRACT);
    setSaleContractLineId(NO_CONTRACT);
    if (!no) return;
    const contract = purchaseContracts.find((c) => c.no === no);
    if (contract) applyContractFields(contractFieldsForWeighTicketFromPurchase(contract));
  }

  function handleSaleContractChange(id: string) {
    setSaleContractId(id);
    setSaleContractLineId(NO_CONTRACT);
    setContractNo(NO_CONTRACT);
    if (!id) return;
    const contract = saleContracts.find((c) => c.id === id);
    if (!contract) return;
    setContractNo(contract.no);
    const line = contract.lines[0];
    if (line) {
      setSaleContractLineId(line.id);
      applyContractFields(contractFieldsForSaleLine(contract, line));
    }
  }

  function handleSaleLineChange(lineId: string) {
    setSaleContractLineId(lineId);
    if (!saleContract || !lineId) return;
    const line = saleContract.lines.find((l) => l.id === lineId);
    if (line) applyContractFields(contractFieldsForSaleLine(saleContract, line));
  }

  function handleDirectionChange(v: TicketDirection) {
    setDirection(v);
    setContractNo(NO_CONTRACT);
    setSaleContractId(NO_CONTRACT);
    setSaleContractLineId(NO_CONTRACT);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (direction === "sale" && saleContractId && !saleContractLineId) return;
    if (direction === "sale" && saleContract && saleLine) {
      const projected = {
        ...saleLine,
        fulfilledQty: saleLine.fulfilledQty + netKg,
      };
      if (saleLineOverTolerance(projected, saleContract.tolerancePercent)) {
        window.alert(t("contracts.overToleranceHint"));
      }
    }
    const assignedBxNo = nextWeighTicketBxNo(weighTickets);
    const row = addWeighTicket({
      bxNo: assignedBxNo,
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
      saleContractId: direction === "sale" && saleContractId ? saleContractId : undefined,
      saleContractLineId:
        direction === "sale" && saleContractLineId ? saleContractLineId : undefined,
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
            <FormField label={t("fields.bxNo")} hint={t("form.bxNoAutoHint")}>
              <input
                className={inputClass}
                value={bxNo}
                readOnly
                disabled
                tabIndex={-1}
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
            <FormField label={t("fields.direction")}>
              <OptionField
                value={direction}
                onChange={(v) => handleDirectionChange(v as TicketDirection)}
                options={directionOptions}
                disabled={contractLocked}
              />
            </FormField>
            {direction === "purchase" ? (
              <FormField label={t("form.relatedContract")}>
                <SearchableSelect
                  value={contractNo}
                  onChange={handlePurchaseContractChange}
                  options={purchaseContractOptions}
                />
              </FormField>
            ) : (
              <>
                <FormField label={t("contracts.relatedSaleContract")}>
                  <SearchableSelect
                    value={saleContractId}
                    onChange={handleSaleContractChange}
                    options={saleContractOptions}
                  />
                </FormField>
                <FormField label={t("contracts.relatedSaleLine")}>
                  <SearchableSelect
                    value={saleContractLineId}
                    onChange={handleSaleLineChange}
                    options={[
                      { value: NO_CONTRACT, label: t("form.noContract") },
                      ...saleLineOptions,
                    ]}
                    disabled={!saleContractId}
                  />
                </FormField>
              </>
            )}
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
  const { weighTickets, updateWeighTicket, customers, purchaseContracts, saleContracts, materialTypes } =
    useMockStore();
  const moneyUnits = useMoneyUnits();
  const row = id ? weighTickets.find((ticket) => ticket.id === id) : undefined;

  const [bxNo, setBxNo] = useState("");
  const [contractNo, setContractNo] = useState(NO_CONTRACT);
  const [saleContractId, setSaleContractId] = useState(NO_CONTRACT);
  const [saleContractLineId, setSaleContractLineId] = useState(NO_CONTRACT);
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

  const applyContractFields = (fields: ContractFields) => {
    setDirection(fields.direction);
    setCustomerName(fields.customerName);
    if (fields.materialSummary) setMaterialSummary(fields.materialSummary);
    if (fields.unitPrice) setUnitPrice(fields.unitPrice);
  };

  const saleContract = saleContracts.find((c) => c.id === saleContractId);
  const contractLocked =
    (direction === "sale" && Boolean(saleContractId && saleContractLineId)) ||
    (direction === "purchase" &&
      Boolean(contractNo && purchaseContracts.some((c) => c.no === contractNo)));

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
    setSaleContractId(row.saleContractId ?? NO_CONTRACT);
    setSaleContractLineId(row.saleContractLineId ?? NO_CONTRACT);
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

  const purchaseContractOptions = [
    { value: NO_CONTRACT, label: t("form.noContract") },
    ...purchaseContracts.map((c) => ({
      value: c.no,
      label: `${c.no} · ${c.customerName}`,
    })),
  ];
  if (contractNo && !purchaseContracts.some((c) => c.no === contractNo)) {
    purchaseContractOptions.push({ value: contractNo, label: contractNo });
  }

  const saleContractOptions = [
    { value: NO_CONTRACT, label: t("form.noContract") },
    ...saleContracts
      .filter(
        (c) =>
          c.status === "active" ||
          c.status === "fulfilling" ||
          c.id === saleContractId,
      )
      .map((c) => ({
        value: c.id,
        label: `${c.no} · ${c.customerName}`,
      })),
  ];
  const saleLineOptions =
    saleContract?.lines.map((l) => ({
      value: l.id,
      label: `${l.materialName} · ${l.plannedQty} KG`,
    })) ?? [];

  function handlePurchaseContractChange(no: string) {
    setContractNo(no);
    setSaleContractId(NO_CONTRACT);
    setSaleContractLineId(NO_CONTRACT);
    if (!no) return;
    const contract = purchaseContracts.find((c) => c.no === no);
    if (contract) applyContractFields(contractFieldsForWeighTicketFromPurchase(contract));
  }

  function handleSaleContractChange(cid: string) {
    setSaleContractId(cid);
    setSaleContractLineId(NO_CONTRACT);
    if (!cid) {
      setContractNo(NO_CONTRACT);
      return;
    }
    const contract = saleContracts.find((c) => c.id === cid);
    if (!contract) return;
    setContractNo(contract.no);
    const line = contract.lines[0];
    if (line) {
      setSaleContractLineId(line.id);
      applyContractFields(contractFieldsForSaleLine(contract, line));
    }
  }

  function handleSaleLineChange(lineId: string) {
    setSaleContractLineId(lineId);
    if (!saleContract || !lineId) return;
    const line = saleContract.lines.find((l) => l.id === lineId);
    if (line) applyContractFields(contractFieldsForSaleLine(saleContract, line));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    if (direction === "sale" && saleContractId && !saleContractLineId) return;
    const saleLine = saleContract?.lines.find((l) => l.id === saleContractLineId);
    if (direction === "sale" && saleContract && saleLine) {
      const otherKg = weighTickets
        .filter(
          (t) =>
            t.id !== row.id &&
            t.status === "normal" &&
            t.saleContractLineId === saleLine.id,
        )
        .reduce((s, t) => s + t.netKg, 0);
      const projected = {
        ...saleLine,
        fulfilledQty: otherKg + (status === "normal" ? netKg : 0),
      };
      if (saleLineOverTolerance(projected, saleContract.tolerancePercent)) {
        window.alert(t("contracts.overToleranceHint"));
      }
    }
    updateWeighTicket(row.id, {
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
      saleContractId: direction === "sale" && saleContractId ? saleContractId : undefined,
      saleContractLineId:
        direction === "sale" && saleContractLineId ? saleContractLineId : undefined,
      status,
      remarks: remarks || undefined,
    });
    setSaved(true);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("form.weighDetail")}
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
              <FormField label={t("fields.bxNo")}>
                <input
                  className={inputClass}
                  value={bxNo}
                  readOnly
                  disabled
                  tabIndex={-1}
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
              <FormField label={t("fields.direction")}>
                <OptionField
                  value={direction}
                  onChange={(v) => {
                    setDirection(v as TicketDirection);
                    setContractNo(NO_CONTRACT);
                    setSaleContractId(NO_CONTRACT);
                    setSaleContractLineId(NO_CONTRACT);
                  }}
                  options={directionOptions}
                  disabled={contractLocked}
                />
              </FormField>
              {direction === "purchase" ? (
                <FormField label={t("form.relatedContract")}>
                  <SearchableSelect
                    value={contractNo}
                    onChange={handlePurchaseContractChange}
                    options={purchaseContractOptions}
                  />
                </FormField>
              ) : (
                <>
                  <FormField label={t("contracts.relatedSaleContract")}>
                    <SearchableSelect
                      value={saleContractId}
                      onChange={handleSaleContractChange}
                      options={saleContractOptions}
                    />
                  </FormField>
                  <FormField label={t("contracts.relatedSaleLine")}>
                    <SearchableSelect
                      value={saleContractLineId}
                      onChange={handleSaleLineChange}
                      options={[
                        { value: NO_CONTRACT, label: t("form.noContract") },
                        ...saleLineOptions,
                      ]}
                      disabled={!saleContractId}
                    />
                  </FormField>
                </>
              )}
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
