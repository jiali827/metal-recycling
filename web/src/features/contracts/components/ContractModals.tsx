"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash } from "@phosphor-icons/react";
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
import { useMoneyUnits } from "@/shared/lib/use-money-units";
import { useMockStore } from "@/data/mock/store";
import { useI18n } from "@/shared/i18n";
import {
  ensureSaleLineAmounts,
} from "@/entities/contract/form";
import {
  nextPurchaseContractNo,
  yearFromQuotedOn,
} from "@/entities/contract/purchase-no";
import {
  kgToTons,
  purchaseValidity,
  saleContractReadyToComplete,
  saleFulfillmentPhase,
  saleLineAmount,
  tonsToKg,
} from "@/entities/contract/summaries";
import {
  purchaseValidityTone,
  saleFulfillmentTone,
} from "@/entities/contract/status";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import type {
  PurchaseContractLine,
  PurchaseContractStatus,
  PurchasePriceMode,
  SaleContractLine,
  SaleContractStatus,
} from "@/entities/types";
import type { ReactNode } from "react";

const CONTRACT_MODAL_BODY =
  "ui-modal-body flex min-h-0 flex-1 flex-col overflow-hidden px-7 pb-4 pt-2";

function purchaseValidityText(
  v: ReturnType<typeof purchaseValidity>,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (v === "expired") return t("contracts.validityExpired");
  if (v === "no_expiry") return t("contracts.validityNoExpiry");
  return t("contracts.validityInForce");
}

function saleFulfillmentText(
  phase: ReturnType<typeof saleFulfillmentPhase>,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (phase === "in_progress") return t("contracts.fulfillmentInProgress");
  if (phase === "ready") return t("contracts.fulfillmentReady");
  if (phase === "over") return t("contracts.fulfillmentOver");
  return t("contracts.fulfillmentNone");
}

function ContractModalSplit({
  attachment,
  onAttachmentChange,
  children,
}: {
  attachment: ContractAttachmentValue | null;
  onAttachmentChange: (value: ContractAttachmentValue | null) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto lg:grid lg:grid-cols-2 lg:overflow-hidden">
      <div className="min-h-[240px] shrink-0 lg:min-h-0 lg:h-full lg:overflow-hidden">
        <ContractUploadZone
          variant="panel"
          value={attachment}
          onChange={onAttachmentChange}
        />
      </div>
      <div className="ui-scrollbar-overlay ui-scrollbar-hidden space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pl-1.5 lg:pr-1">
        {children}
      </div>
    </div>
  );
}
function newLineId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

function emptyPurchaseLine(): PurchaseContractLine {
  return {
    id: newLineId("pcl"),
    materialName: "",
    priceMode: "ex_yard",
    unitPrice: 0,
  };
}

function emptySaleLine(): SaleContractLine {
  return {
    id: newLineId("scl"),
    materialName: "",
    plannedQty: 0,
    qtyUnit: "kg",
    unitPrice: 0,
    fulfilledQty: 0,
  };
}

function buildProjectOptions(
  projectTypes: { name: string; enabled: boolean }[],
  current?: string,
) {
  const opts = projectTypes
    .filter((p) => p.enabled)
    .map((p) => ({ value: p.name, label: p.name }));
  if (current && !opts.some((o) => o.value === current)) {
    opts.unshift({ value: current, label: current });
  }
  // 不插入 value="" 的 "—" 伪选项：空态走 placeholder + 清空按钮，避免 SearchableSelect 用 "—" 当搜索词滤光选项
  return opts;
}

/* ───────────── Purchase ───────────── */

export function PurchaseContractCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { t } = useI18n();
  const {
    addPurchaseContract,
    purchaseContracts,
    customers,
    projectTypes,
    tenant,
  } = useMockStore();
  const [no, setNo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [contactName, setContactName] = useState("");
  const [project, setProject] = useState("");
  const [status, setStatus] = useState<PurchaseContractStatus>("active");
  const [quotedOn, setQuotedOn] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<PurchaseContractLine[]>([emptyPurchaseLine()]);
  const [attachment, setAttachment] = useState<ContractAttachmentValue | null>(null);
  const [noError, setNoError] = useState("");

  const priceModeOptions = useMemo(
    () => [
      { value: "ex_yard", label: t("contracts.priceModeExYard") },
      { value: "collect", label: t("contracts.priceModeCollect") },
      { value: "other", label: t("contracts.priceModeOther") },
    ],
    [t],
  );

  useEffect(() => {
    if (!open) return;
    const quoted = todayISO();
    setCustomerId("");
    setContactName("");
    setProject("");
    setStatus("active");
    setQuotedOn(quoted);
    setValidUntil("");
    setRemarks("");
    setLines([emptyPurchaseLine()]);
    setAttachment(null);
    setNoError("");
    setNo(
      nextPurchaseContractNo(purchaseContracts, {
        abbr: tenant.abbr,
        year: yearFromQuotedOn(quoted),
      }),
    );
  }, [open, purchaseContracts, tenant.abbr]);

  useEffect(() => {
    if (!open) return;
    const next = nextPurchaseContractNo(purchaseContracts, {
      abbr: tenant.abbr,
      year: yearFromQuotedOn(quotedOn, todayISO()),
    });
    setNo(next);
    if (next) setNoError("");
  }, [open, quotedOn, purchaseContracts, tenant.abbr]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0 || lines.some((l) => !(l.materialTypeId || l.materialName.trim()))) return;
    const assignedNo = nextPurchaseContractNo(purchaseContracts, {
      abbr: tenant.abbr,
      year: yearFromQuotedOn(quotedOn, todayISO()),
    });
    if (!assignedNo) {
      setNoError(t("contracts.purchaseNoNeedAbbr"));
      return;
    }
    const customer = customers.find((c) => c.id === customerId);
    const row = addPurchaseContract({
      no: assignedNo,
      customerId,
      customerName: customer?.name ?? t("form.unnamedCustomer"),
      contactName: contactName || undefined,
      project: project || undefined,
      status,
      quotedOn,
      validUntil: validUntil || undefined,
      currency: tenant.currency,
      lines,
      remarks: remarks || undefined,
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
      title={t("contracts.newPurchase")}
      size="3xl"
      bodyClassName={CONTRACT_MODAL_BODY}
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="purchase-contract-create" className="ui-btn-primary">
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="purchase-contract-create" onSubmit={handleSubmit} className="flex h-full min-h-0 flex-1 flex-col">
        <ContractModalSplit attachment={attachment} onAttachmentChange={setAttachment}>
          <FormSection title={t("form.contractDetail")}>
            <FormFieldGrid>
              <FormField
                label={t("fields.contractNo")}
                required
                hint={t("contracts.purchaseNoAutoHint")}
                error={noError || undefined}
              >
                <input
                  className={inputClass}
                  value={no}
                  readOnly
                  disabled
                  aria-readonly
                />
              </FormField>
              <FormField label={t("contracts.project")}>
                <SearchableSelect
                  value={project}
                  onChange={setProject}
                  options={buildProjectOptions(projectTypes, project)}
                  placeholder={t("form.selectPlaceholder")}
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
              <FormField label={t("contracts.contactName")}>
                <input className={inputClass} value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </FormField>
              <FormField label={t("contracts.quotedOn")} required>
                <DatePicker value={quotedOn} onChange={setQuotedOn} />
              </FormField>
              <FormField label={t("contracts.validUntil")}>
                <DatePicker value={validUntil} onChange={setValidUntil} />
              </FormField>
              <FormField label={t("common.status")}>
                <OptionField
                  value={status}
                  onChange={(v) => setStatus(v as PurchaseContractStatus)}
                  options={[
                    { value: "draft", label: t("status.draft") },
                    { value: "active", label: t("contracts.statusEnabled") },
                    { value: "closed", label: t("status.closed") },
                  ]}
                  aria-label={t("common.status")}
                />
              </FormField>
              <FormField label={t("contracts.validity")}>
                {(() => {
                  const v = purchaseValidity({ validUntil }, todayISO());
                  return (
                    <div className="ui-form-value">
                      <StatusBadge tone={purchaseValidityTone(v)}>
                        {purchaseValidityText(v, t)}
                      </StatusBadge>
                    </div>
                  );
                })()}
              </FormField>
            </FormFieldGrid>
          </FormSection>
          <FormSection title={t("contracts.lines")}>
            <PurchaseLinesEditor lines={lines} onChange={setLines} priceModeOptions={priceModeOptions} />
          </FormSection>
          <FormSection title={t("form.sectionOptional")}>
            <FormField label={t("contracts.remarks")}>
              <textarea
                className={inputClass}
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </FormField>
          </FormSection>
        </ContractModalSplit>
      </form>
    </Modal>
  );
}

export function PurchaseContractDetailModal({
  open,
  onClose,
  id,
  readOnly = false
}: {
  open: boolean;
  onClose: () => void;
  id: string | null;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const { purchaseContracts, customers, projectTypes, updatePurchaseContract } = useMockStore();
  const row = id ? purchaseContracts.find((c) => c.id === id) : undefined;
  const [no, setNo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [contactName, setContactName] = useState("");
  const [project, setProject] = useState("");
  const [status, setStatus] = useState<PurchaseContractStatus>("active");
  const [quotedOn, setQuotedOn] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<PurchaseContractLine[]>([]);
  const [attachment, setAttachment] = useState<ContractAttachmentValue | null>(null);
  const [saved, setSaved] = useState(false);

  const priceModeOptions = useMemo(
    () => [
      { value: "ex_yard", label: t("contracts.priceModeExYard") },
      { value: "collect", label: t("contracts.priceModeCollect") },
      { value: "other", label: t("contracts.priceModeOther") },
    ],
    [t],
  );

  useEffect(() => {
    if (!open || !row) return;
    setNo(row.no);
    setCustomerId(row.customerId);
    setContactName(row.contactName ?? "");
    setProject(row.project ?? "");
    setStatus(row.status);
    setQuotedOn(row.quotedOn);
    setValidUntil(row.validUntil ?? "");
    setRemarks(row.remarks ?? "");
    setLines(row.lines.map((l) => ({ ...l })));
    setAttachment(
      row.attachmentName
        ? { fileName: row.attachmentName, dataUrl: row.attachmentDataUrl }
        : null,
    );
    setSaved(false);
  }, [open, row]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (!row || lines.length === 0) return;
    const customer = customers.find((c) => c.id === customerId);
    updatePurchaseContract(row.id, {
      no: row.no,
      customerId,
      customerName: customer?.name ?? row.customerName,
      contactName: contactName || undefined,
      project: project || undefined,
      status,
      quotedOn,
      validUntil: validUntil || undefined,
      lines,
      remarks: remarks || undefined,
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
      title={t("contracts.purchaseTab")}
      size="3xl"
      bodyClassName={CONTRACT_MODAL_BODY}
      footer={
        row ? (
          <>
            <button type="button" className="ui-btn-secondary" onClick={onClose}>
              {t("common.close")}
            </button>
            {!readOnly ? (
            <button type="submit" form="purchase-contract-edit" className="ui-btn-primary">
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
        <form id="purchase-contract-edit" onSubmit={handleSubmit} className="flex h-full min-h-0 flex-1 flex-col">
          <ContractModalSplit attachment={attachment} onAttachmentChange={setAttachment}>
            <FormSection title={t("form.contractDetail")}>
              <FormFieldGrid>
                <FormField
                  label={t("fields.contractNo")}
                  required
                  hint={t("contracts.purchaseNoAutoHint")}
                >
                  <input
                    className={inputClass}
                    value={no}
                    readOnly
                    disabled
                    aria-readonly
                  />
                </FormField>
                <FormField label={t("contracts.project")}>
                  <SearchableSelect
                    value={project}
                    onChange={setProject}
                    options={buildProjectOptions(projectTypes, project)}
                    placeholder={t("form.selectPlaceholder")}
                  />
                </FormField>
                <FormField label={t("form.counterpartyCustomer")} required>
                  <SearchableSelect value={customerId} onChange={setCustomerId} options={customerOptions} />
                </FormField>
                <FormField label={t("contracts.contactName")}>
                  <input className={inputClass} value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </FormField>
                <FormField label={t("contracts.quotedOn")} required>
                  <DatePicker value={quotedOn} onChange={setQuotedOn} />
                </FormField>
                <FormField label={t("contracts.validUntil")}>
                  <DatePicker value={validUntil} onChange={setValidUntil} />
                </FormField>
                <FormField label={t("common.status")}>
                  <OptionField
                    value={status}
                    onChange={(v) => setStatus(v as PurchaseContractStatus)}
                    options={[
                      { value: "draft", label: t("status.draft") },
                      { value: "active", label: t("contracts.statusEnabled") },
                      { value: "closed", label: t("status.closed") },
                    ]}
                    aria-label={t("common.status")}
                  />
                </FormField>
                <FormField label={t("contracts.validity")}>
                  {(() => {
                    const v = purchaseValidity({ validUntil }, todayISO());
                    return (
                      <div className="ui-form-value">
                        <StatusBadge tone={purchaseValidityTone(v)}>
                          {purchaseValidityText(v, t)}
                        </StatusBadge>
                      </div>
                    );
                  })()}
                </FormField>
              </FormFieldGrid>
            </FormSection>
            <FormSection title={t("contracts.lines")}>
              <PurchaseLinesEditor lines={lines} onChange={setLines} priceModeOptions={priceModeOptions} />
            </FormSection>
            <FormSection title={t("form.sectionOptional")}>
              <FormField label={t("contracts.remarks")}>
                <textarea
                  className={inputClass}
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </FormField>
            </FormSection>
            {saved ? <p className="text-sm text-success">{t("common.saved")}</p> : null}
          </ContractModalSplit>
        </form>
      )}
    </Modal>
  );
}

function PurchaseLinesEditor({
  lines,
  onChange,
  priceModeOptions,
}: {
  lines: PurchaseContractLine[];
  onChange: (lines: PurchaseContractLine[]) => void;
  priceModeOptions: { value: string; label: string }[];
}) {
  const { t } = useI18n();
  const { materialTypes } = useMockStore();
  const moneyUnits = useMoneyUnits();
  const priceUnit = moneyUnits.moneyPerTon(t("contracts.unitTon"));
  const options = useMemo(() => {
    const list = materialTypes
      .filter((m) => m.enabled && m.forPurchase)
      .map((m) => ({ value: m.id, label: m.name }));
    for (const line of lines) {
      if (
        line.materialTypeId &&
        !list.some((o) => o.value === line.materialTypeId)
      ) {
        list.push({
          value: line.materialTypeId,
          label: line.materialName || line.materialTypeId,
        });
      } else if (
        !line.materialTypeId &&
        line.materialName &&
        !list.some((o) => o.label === line.materialName)
      ) {
        list.push({ value: `name:${line.materialName}`, label: line.materialName });
      }
    }
    return list;
  }, [materialTypes, lines]);

  const colClass = "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2";

  return (
    <div className="space-y-2">
      <div className={`${colClass} text-xs font-medium text-muted`}>
        <span>
          {t("menu.materialTypes")}
          <span className="text-danger"> *</span>
        </span>
        <span>{t("contracts.priceMode")}</span>
        <span>
          {t("contracts.unitPrice")}（{priceUnit}）
          <span className="text-danger"> *</span>
        </span>
        <span className="sr-only">{t("common.delete")}</span>
      </div>
      {lines.map((line, idx) => {
        const selectValue =
          line.materialTypeId ||
          (line.materialName ? `name:${line.materialName}` : "");
        return (
          <div key={line.id} className={colClass}>
            <SearchableSelect
              value={selectValue}
              onChange={(v) => {
                const next = [...lines];
                if (v.startsWith("name:")) {
                  next[idx] = {
                    ...line,
                    materialTypeId: undefined,
                    materialName: v.slice(5),
                  };
                } else {
                  const mt = materialTypes.find((m) => m.id === v);
                  next[idx] = {
                    ...line,
                    materialTypeId: v || undefined,
                    materialName: mt?.name ?? line.materialName,
                  };
                }
                onChange(next);
              }}
              options={options}
              placeholder={t("form.selectPlaceholder")}
            />
            <Select
              value={line.priceMode}
              onChange={(v) => {
                const next = [...lines];
                next[idx] = { ...line, priceMode: v as PurchasePriceMode };
                onChange(next);
              }}
              options={priceModeOptions}
            />
            <input
              className={inputClass}
              type="number"
              required
              min={0}
              step="0.01"
              value={line.unitPrice || ""}
              onChange={(e) => {
                const next = [...lines];
                next[idx] = { ...line, unitPrice: Number(e.target.value) || 0 };
                onChange(next);
              }}
            />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
              aria-label={t("common.delete")}
              disabled={lines.length <= 1}
              onClick={() => onChange(lines.filter((l) => l.id !== line.id))}
            >
              <Trash size={16} />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        className="ui-btn-secondary"
        onClick={() => onChange([...lines, emptyPurchaseLine()])}
      >
        {t("contracts.addLine")}
      </button>
    </div>
  );
}

/* ───────────── Sale ───────────── */

export function SaleContractCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { t } = useI18n();
  const { addSaleContract, customers, tenant } = useMockStore();
  const moneyUnits = useMoneyUnits();
  const [no, setNo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState<SaleContractStatus>("active");
  const [signedOn, setSignedOn] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [fulfillBy, setFulfillBy] = useState("");
  const [tolerancePercent, setTolerancePercent] = useState("10");
  const [totalAmount, setTotalAmount] = useState("");
  const [lines, setLines] = useState<SaleContractLine[]>([emptySaleLine()]);
  const [attachment, setAttachment] = useState<ContractAttachmentValue | null>(null);

  useEffect(() => {
    if (!open) return;
    setNo("");
    setCustomerId("");
    setStatus("active");
    setSignedOn(todayISO());
    setPaymentTerms("");
    setFulfillBy("");
    setTolerancePercent("10");
    setTotalAmount("");
    setLines([emptySaleLine()]);
    setAttachment(null);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      lines.length === 0 ||
      lines.some((l) => !(l.materialTypeId || l.materialName.trim()) || l.plannedQty <= 0)
    )
      return;
    const customer = customers.find((c) => c.id === customerId);
    const withAmounts = ensureSaleLineAmounts(lines);
    const row = addSaleContract({
      no,
      customerId,
      customerName: customer?.name ?? t("form.unnamedCustomer"),
      status,
      signedOn,
      paymentTerms: paymentTerms || undefined,
      fulfillBy: fulfillBy || undefined,
      tolerancePercent: tolerancePercent === "" ? undefined : Number(tolerancePercent),
      currency: tenant.currency,
      totalAmount: totalAmount === "" ? undefined : Number(totalAmount),
      lines: withAmounts,
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
      title={t("contracts.newSale")}
      size="3xl"
      bodyClassName={CONTRACT_MODAL_BODY}
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="sale-contract-create" className="ui-btn-primary">
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="sale-contract-create" onSubmit={handleSubmit} className="flex h-full min-h-0 flex-1 flex-col">
        <ContractModalSplit attachment={attachment} onAttachmentChange={setAttachment}>
          <FormSection title={t("form.contractDetail")}>
            <FormFieldGrid>
              <FormField label={t("fields.contractNo")} required>
                <input className={inputClass} required value={no} onChange={(e) => setNo(e.target.value)} />
              </FormField>
              <FormField label={t("form.counterpartyCustomer")} required>
                <SearchableSelect
                  value={customerId}
                  onChange={setCustomerId}
                  options={customers.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder={t("form.selectCustomer")}
                />
              </FormField>
              <FormField label={t("contracts.tolerancePercent")}>
                <InputWithUnit
                  type="number"
                  value={tolerancePercent}
                  onChange={(e) => setTolerancePercent(e.target.value)}
                  unit="%"
                />
              </FormField>
              <FormField label={t("contracts.totalAmount")}>
                <InputWithUnit
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  unit={moneyUnits.money}
                />
              </FormField>
              <FormFieldFull>
                <FormField label={t("contracts.paymentTerms")}>
                  <input className={inputClass} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                </FormField>
              </FormFieldFull>
              <FormField label={t("fields.signedDate")} required>
                <DatePicker value={signedOn} onChange={setSignedOn} />
              </FormField>
              <FormField label={t("contracts.fulfillBy")}>
                <DatePicker value={fulfillBy} onChange={setFulfillBy} />
              </FormField>
              <FormField label={t("common.status")}>
                <OptionField
                  value={status}
                  onChange={(v) => setStatus(v as SaleContractStatus)}
                  options={[
                    { value: "draft", label: t("status.draft") },
                    { value: "active", label: t("status.active") },
                  ]}
                  aria-label={t("common.status")}
                />
              </FormField>
              <FormField label={t("contracts.fulfillment")}>
                {(() => {
                  const phase = saleFulfillmentPhase({
                    id: "new",
                    no,
                    customerId,
                    customerName: "",
                    status,
                    signedOn,
                    currency: tenant.currency,
                    lines,
                    tolerancePercent:
                      tolerancePercent === "" ? undefined : Number(tolerancePercent),
                    createdAt: "",
                    updatedAt: "",
                  });
                  return (
                    <div className="ui-form-value">
                      <StatusBadge tone={saleFulfillmentTone(phase)}>
                        {saleFulfillmentText(phase, t)}
                      </StatusBadge>
                    </div>
                  );
                })()}
              </FormField>
            </FormFieldGrid>
          </FormSection>
          <FormSection title={t("contracts.lines")}>
            <SaleLinesEditor lines={lines} onChange={setLines} showFulfilled={false} />
          </FormSection>
        </ContractModalSplit>
      </form>
    </Modal>
  );
}

export function SaleContractDetailModal({
  open,
  onClose,
  id,
  readOnly = false
}: {
  open: boolean;
  onClose: () => void;
  id: string | null;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const { saleContracts, customers, updateSaleContract, weighTickets, tenant } = useMockStore();
  const moneyUnits = useMoneyUnits();
  const row = id ? saleContracts.find((c) => c.id === id) : undefined;
  const [no, setNo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState<SaleContractStatus>("active");
  const [signedOn, setSignedOn] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [fulfillBy, setFulfillBy] = useState("");
  const [tolerancePercent, setTolerancePercent] = useState("10");
  const [totalAmount, setTotalAmount] = useState("");
  const [lines, setLines] = useState<SaleContractLine[]>([]);
  const [attachment, setAttachment] = useState<ContractAttachmentValue | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    setNo(row.no);
    setCustomerId(row.customerId);
    setStatus(row.status);
    setSignedOn(row.signedOn);
    setPaymentTerms(row.paymentTerms ?? "");
    setFulfillBy(row.fulfillBy ?? "");
    setTolerancePercent(row.tolerancePercent == null ? "" : String(row.tolerancePercent));
    setTotalAmount(row.totalAmount == null ? "" : String(row.totalAmount));
    setLines(row.lines.map((l) => ({ ...l })));
    setAttachment(
      row.attachmentName
        ? { fileName: row.attachmentName, dataUrl: row.attachmentDataUrl }
        : null,
    );
    setSaved(false);
  }, [open, row]);

  function lineHasTickets(lineId: string) {
    return weighTickets.some((t) => t.saleContractLineId === lineId);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (!row || lines.length === 0) return;
    const customer = customers.find((c) => c.id === customerId);
    const withAmounts = ensureSaleLineAmounts(
      lines.map((l) => ({
        ...l,
        fulfilledQty: row.lines.find((x) => x.id === l.id)?.fulfilledQty ?? l.fulfilledQty,
      })),
    );
    updateSaleContract(row.id, {
      no,
      customerId,
      customerName: customer?.name ?? row.customerName,
      status,
      signedOn,
      paymentTerms: paymentTerms || undefined,
      fulfillBy: fulfillBy || undefined,
      tolerancePercent: tolerancePercent === "" ? undefined : Number(tolerancePercent),
      totalAmount: totalAmount === "" ? undefined : Number(totalAmount),
      currency: tenant.currency,
      lines: withAmounts,
      attachmentName: attachment?.fileName,
      attachmentDataUrl: attachment?.dataUrl,
    });
    setSaved(true);
  }

  const customerOptions = customers.map((c) => ({ value: c.id, label: c.name }));
  if (row && !customers.some((c) => c.id === customerId)) {
    customerOptions.push({ value: customerId, label: row.customerName });
  }

  const readyHint =
    row &&
    saleContractReadyToComplete({
      ...row,
      lines,
      tolerancePercent: tolerancePercent === "" ? undefined : Number(tolerancePercent),
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("contracts.saleTab")}
      size="3xl"
      bodyClassName={CONTRACT_MODAL_BODY}
      footer={
        row ? (
          <>
            <button type="button" className="ui-btn-secondary" onClick={onClose}>
              {t("common.close")}
            </button>
            {!readOnly ? (
            <button type="submit" form="sale-contract-edit" className="ui-btn-primary">
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
        <form id="sale-contract-edit" onSubmit={handleSubmit} className="flex h-full min-h-0 flex-1 flex-col">
          <ContractModalSplit attachment={attachment} onAttachmentChange={setAttachment}>
            {readyHint && status !== "completed" && status !== "closed" ? (
              <p className="rounded-[var(--radius-control)] bg-brand-soft px-3 py-2 text-sm text-foreground">
                {t("contracts.readyToCompleteHint")}
              </p>
            ) : null}
            <FormSection title={t("form.contractDetail")}>
              <FormFieldGrid>
                <FormField label={t("fields.contractNo")} required>
                  <input className={inputClass} required value={no} onChange={(e) => setNo(e.target.value)} />
                </FormField>
                <FormField label={t("form.counterpartyCustomer")} required>
                  <SearchableSelect value={customerId} onChange={setCustomerId} options={customerOptions} />
                </FormField>
                <FormField label={t("contracts.tolerancePercent")}>
                  <InputWithUnit
                    type="number"
                    value={tolerancePercent}
                    onChange={(e) => setTolerancePercent(e.target.value)}
                    unit="%"
                  />
                </FormField>
                <FormField label={t("contracts.totalAmount")}>
                  <InputWithUnit
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    unit={moneyUnits.money}
                  />
                </FormField>
                <FormFieldFull>
                  <FormField label={t("contracts.paymentTerms")}>
                    <input className={inputClass} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                  </FormField>
                </FormFieldFull>
                <FormField label={t("fields.signedDate")} required>
                  <DatePicker value={signedOn} onChange={setSignedOn} />
                </FormField>
                <FormField label={t("contracts.fulfillBy")}>
                  <DatePicker value={fulfillBy} onChange={setFulfillBy} />
                </FormField>
                <FormFieldFull>
                  <FormField label={t("common.status")}>
                    <OptionField
                      value={status}
                      onChange={(v) => setStatus(v as SaleContractStatus)}
                      options={[
                        { value: "draft", label: t("status.draft") },
                        { value: "active", label: t("status.active") },
                        { value: "completed", label: t("status.completed") },
                        { value: "closed", label: t("status.closed") },
                      ]}
                      aria-label={t("common.status")}
                    />
                  </FormField>
                </FormFieldFull>
                <FormField label={t("contracts.fulfillment")}>
                  {(() => {
                    const phase = saleFulfillmentPhase({
                      ...row,
                      lines,
                      tolerancePercent:
                        tolerancePercent === "" ? undefined : Number(tolerancePercent),
                    });
                    return (
                      <div className="ui-form-value">
                        <StatusBadge tone={saleFulfillmentTone(phase)}>
                          {saleFulfillmentText(phase, t)}
                        </StatusBadge>
                      </div>
                    );
                  })()}
                </FormField>
              </FormFieldGrid>
            </FormSection>
            <FormSection title={t("contracts.lines")}>
              <SaleLinesEditor
                lines={lines}
                onChange={setLines}
                showFulfilled
                canRemoveLine={(lineId) => !lineHasTickets(lineId)}
              />
            </FormSection>
            {saved ? <p className="text-sm text-success">{t("common.saved")}</p> : null}
          </ContractModalSplit>
        </form>
      )}
    </Modal>
  );
}

function SaleLinesEditor({
  lines,
  onChange,
  showFulfilled,
  canRemoveLine,
}: {
  lines: SaleContractLine[];
  onChange: (lines: SaleContractLine[]) => void;
  showFulfilled: boolean;
  canRemoveLine?: (lineId: string) => boolean;
}) {
  const { t } = useI18n();
  const { materialTypes } = useMockStore();
  const moneyUnits = useMoneyUnits();
  const priceUnit = moneyUnits.moneyPerTon(t("contracts.unitTon"));
  const options = useMemo(() => {
    const list = materialTypes
      .filter((m) => m.enabled && m.forSale)
      .map((m) => ({ value: m.id, label: m.name }));
    for (const line of lines) {
      if (
        line.materialTypeId &&
        !list.some((o) => o.value === line.materialTypeId)
      ) {
        list.push({
          value: line.materialTypeId,
          label: line.materialName || line.materialTypeId,
        });
      } else if (
        !line.materialTypeId &&
        line.materialName &&
        !list.some((o) => o.label === line.materialName)
      ) {
        list.push({ value: `name:${line.materialName}`, label: line.materialName });
      }
    }
    return list;
  }, [materialTypes, lines]);

  const colClass = showFulfilled
    ? "grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2"
    : "grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2";

  return (
    <div className="space-y-2">
      <div className={`${colClass} text-xs font-medium text-muted`}>
        <span>
          {t("menu.materialTypes")}
          <span className="text-danger"> *</span>
        </span>
        <span>
          {t("contracts.plannedTons")}（{t("contracts.unitTon")}）
          <span className="text-danger"> *</span>
        </span>
        <span>
          {t("contracts.unitPrice")}（{priceUnit}）
          <span className="text-danger"> *</span>
        </span>
        {showFulfilled ? (
          <span>
            {t("contracts.fulfilledTons")}（{t("contracts.unitTon")}）
          </span>
        ) : null}
        <span className="sr-only">{t("common.delete")}</span>
      </div>
      {lines.map((line, idx) => {
        const tons = line.plannedQty ? String(kgToTons(line.plannedQty)) : "";
        const selectValue =
          line.materialTypeId ||
          (line.materialName ? `name:${line.materialName}` : "");
        return (
          <div key={line.id} className={colClass}>
            <SearchableSelect
              value={selectValue}
              onChange={(v) => {
                const next = [...lines];
                if (v.startsWith("name:")) {
                  next[idx] = {
                    ...line,
                    materialTypeId: undefined,
                    materialName: v.slice(5),
                  };
                } else {
                  const mt = materialTypes.find((m) => m.id === v);
                  next[idx] = {
                    ...line,
                    materialTypeId: v || undefined,
                    materialName: mt?.name ?? line.materialName,
                  };
                }
                onChange(next);
              }}
              options={options}
              placeholder={t("form.selectPlaceholder")}
            />
            <input
              className={inputClass}
              type="number"
              required
              min={0}
              step="0.001"
              value={tons}
              onChange={(e) => {
                const plannedQty = tonsToKg(Number(e.target.value) || 0);
                const next = [...lines];
                next[idx] = {
                  ...line,
                  plannedQty,
                  lineAmount: saleLineAmount(plannedQty, line.unitPrice),
                };
                onChange(next);
              }}
            />
            <input
              className={inputClass}
              type="number"
              required
              min={0}
              step="0.01"
              value={line.unitPrice || ""}
              onChange={(e) => {
                const unitPrice = Number(e.target.value) || 0;
                const next = [...lines];
                next[idx] = {
                  ...line,
                  unitPrice,
                  lineAmount: saleLineAmount(line.plannedQty, unitPrice),
                };
                onChange(next);
              }}
            />
            {showFulfilled ? (
              <input
                className={`${inputClass} is-readonly`}
                type="text"
                value={kgToTons(line.fulfilledQty).toFixed(3)}
                readOnly
                tabIndex={-1}
              />
            ) : null}
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
              aria-label={t("common.delete")}
              disabled={
                lines.length <= 1 || (canRemoveLine ? !canRemoveLine(line.id) : false)
              }
              onClick={() => onChange(lines.filter((l) => l.id !== line.id))}
            >
              <Trash size={16} />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        className="ui-btn-secondary"
        onClick={() => onChange([...lines, emptySaleLine()])}
      >
        {t("contracts.addLine")}
      </button>
    </div>
  );
}

/** 项目全景等场景：按 id 路由到采购/销售详情 */
export function ContractDetailModal({
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
  const { purchaseContracts, saleContracts } = useMockStore();
  if (id && saleContracts.some((c) => c.id === id)) {
    return (
      <SaleContractDetailModal open={open} onClose={onClose} id={id} readOnly={readOnly} />
    );
  }
  if (id && purchaseContracts.some((c) => c.id === id)) {
    return (
      <PurchaseContractDetailModal open={open} onClose={onClose} id={id} readOnly={readOnly} />
    );
  }
  return (
    <PurchaseContractDetailModal open={open} onClose={onClose} id={id} readOnly={readOnly} />
  );
}
