"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { Modal } from "@/shared/ui/Modal";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
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
import { useAuth } from "@/features/auth/provider";
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
import {
  buildContractRevision,
  contractHasActiveWeighings,
  diffPurchaseContract,
  diffSaleContract,
  type PurchaseRevisionInput,
  type SaleRevisionInput,
} from "@/entities/contract/revision";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { CorrectionInfo } from "@/features/correction/components/CorrectionInfo";
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
  disabled = false,
  children,
}: {
  attachment: ContractAttachmentValue | null;
  onAttachmentChange: (value: ContractAttachmentValue | null) => void;
  disabled?: boolean;
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
        <fieldset disabled={disabled} className="min-w-0 space-y-4 border-0 p-0">
          {children}
        </fieldset>
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
  const confirm = useConfirm();
  const {
    addPurchaseContract,
    confirmPurchaseContract,
    purchaseContracts,
    customers,
    projectTypes,
    tenant,
  } = useMockStore();
  const [no, setNo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [contactName, setContactName] = useState("");
  const [project, setProject] = useState("");
  const [status, setStatus] = useState<PurchaseContractStatus>("draft");
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
    setStatus("draft");
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

  async function saveContract(shouldConfirm = false) {
    if (lines.length === 0 || lines.some((l) => !(l.materialTypeId || l.materialName.trim()))) return;
    const assignedNo = nextPurchaseContractNo(purchaseContracts, {
      abbr: tenant.abbr,
      year: yearFromQuotedOn(quotedOn, todayISO()),
    });
    if (!assignedNo) {
      setNoError(t("contracts.purchaseNoNeedAbbr"));
      return;
    }
    if (shouldConfirm) {
      const ok = await confirm({ title: "确认合同", message: "确认后合同将锁定，过磅台账才可以关联合同。后续修改只能走纠错删除。", confirmLabel: "确认并锁定" });
      if (!ok) return;
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
    if (shouldConfirm) confirmPurchaseContract(row.id);
    onCreated?.(row.id);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); void saveContract(false); }

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
          <button type="button" className="ui-btn-primary" onClick={() => void saveContract(true)}>
            确认并锁定
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
  const confirm = useConfirm();
  const { purchaseContracts, customers, projectTypes, updatePurchaseContract, confirmPurchaseContract, weighTickets } = useMockStore();
  const { user } = useAuth();
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
  const [revisionMode, setRevisionMode] = useState(false);
  const [revisionReasonOpen, setRevisionReasonOpen] = useState(false);
  const locked = readOnly || row?.status !== "draft";
  const formDisabled = locked && !revisionMode;
  /** 已产生有效过磅记录的合同禁止变更（价格正源已落磅单） */
  const hasWeighings = useMemo(
    () => (row ? contractHasActiveWeighings(weighTickets, "purchase", row) : false),
    [weighTickets, row],
  );
  const canRevise = !readOnly && !!row && row.status !== "draft" && row.status !== "void" && !hasWeighings;
  const revisionLockedHint = !readOnly && !!row && row.status !== "draft" && row.status !== "void" && hasWeighings;

  const priceModeOptions = useMemo(
    () => [
      { value: "ex_yard", label: t("contracts.priceModeExYard") },
      { value: "collect", label: t("contracts.priceModeCollect") },
      { value: "other", label: t("contracts.priceModeOther") },
    ],
    [t],
  );

  const syncFromRow = useCallback(() => {
    if (!row) return;
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
    setRevisionMode(false);
    setRevisionReasonOpen(false);
  }, [row]);

  useEffect(() => {
    if (!open || !row) return;
    syncFromRow();
  }, [open, row, syncFromRow]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
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

  async function handleConfirm() {
    if (!row || locked) return;
    const ok = await confirm({ title: "确认合同", message: "确认后合同将锁定，后续修改只能走纠错删除。", confirmLabel: "确认并锁定" });
    if (ok) {
      confirmPurchaseContract(row.id);
      onClose();
    }
  }

  /** 由变更原因弹窗回调：返回错误文案（留在弹窗内提示）或 undefined（成功） */
  function submitRevision(rawReason: string): string | undefined {
    if (!row || !revisionMode) return undefined;
    const reason = rawReason.trim();
    if (!reason) return t("contracts.revisionReasonRequired");
    const customer = customers.find((c) => c.id === customerId);
    const after: PurchaseRevisionInput = {
      customerName: customer?.name ?? row.customerName,
      contactName,
      project,
      quotedOn,
      validUntil,
      remarks,
      lines: lines.map((l) => ({
        id: l.id,
        materialName: l.materialName,
        unitPrice: l.unitPrice,
        priceMode: l.priceMode,
        lineRemark: l.lineRemark,
      })),
    };
    const changes = diffPurchaseContract(row, after, t);
    if (changes.length === 0) {
      return t("contracts.noRevisionChanges");
    }
    const revision = buildContractRevision(changes, reason, user?.name);
    updatePurchaseContract(row.id, {
      no: row.no,
      customerId,
      customerName: after.customerName,
      contactName: contactName || undefined,
      project: project || undefined,
      status,
      quotedOn,
      validUntil: validUntil || undefined,
      lines,
      remarks: remarks || undefined,
      attachmentName: attachment?.fileName,
      attachmentDataUrl: attachment?.dataUrl,
      revisions: [...(row.revisions ?? []), revision],
    }, { allowNonDraft: true });
    setRevisionMode(false);
    setSaved(false);
    return undefined;
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
            {revisionMode ? (
              <>
                <button type="button" className="ui-btn-secondary" onClick={() => syncFromRow()}>
                  {t("contracts.revisionCancel")}
                </button>
                <button type="button" className="ui-btn-primary" onClick={() => setRevisionReasonOpen(true)}>
                  {t("contracts.revisionSave")}
                </button>
                <RevisionReasonDialog
                  open={revisionReasonOpen}
                  onClose={() => setRevisionReasonOpen(false)}
                  onSubmit={submitRevision}
                />
              </>
            ) : !locked ? (
              <>
                <button type="submit" form="purchase-contract-edit" className="ui-btn-primary">
                  {t("common.save")}
                </button>
                <button type="button" className="ui-btn-primary" onClick={() => void handleConfirm()}>确认并锁定</button>
              </>
            ) : canRevise ? (
              <button type="button" className="ui-btn-primary" onClick={() => setRevisionMode(true)}>
                {t("contracts.revise")}
              </button>
            ) : revisionLockedHint ? (
              <span className="text-xs text-muted">{t("contracts.revisionLockedByWeighing")}</span>
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
        <form id="purchase-contract-edit" onSubmit={revisionMode ? (e) => e.preventDefault() : handleSubmit} className="flex h-full min-h-0 flex-1 flex-col">
          <ContractModalSplit attachment={attachment} onAttachmentChange={setAttachment} disabled={formDisabled}>
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
                    disabled={revisionMode}
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
            <CorrectionInfo
              reason={row.voidReason}
              actor={row.voidedBy}
              at={row.voidedAt}
              batchId={row.reversalBatchId}
            />
            <FormSection title={t("contracts.revisionHistory")}>
              {row.revisions && row.revisions.length > 0 ? (
                <ul className="space-y-3">
                  {[...row.revisions].reverse().map((rev) => (
                    <li key={rev.id} className="rounded-[var(--radius-control)] border border-line bg-chip px-3 py-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span>{t("contracts.revisionAt")}: {rev.revisedAt}</span>
                        {rev.revisedBy ? <span>{t("contracts.revisionBy")}: {rev.revisedBy}</span> : null}
                        <span className="text-foreground">{rev.reason}</span>
                      </div>
                      <ul className="mt-2 space-y-1 text-sm">
                        {rev.changes.map((ch, i) => (
                          <li key={i} className="flex flex-wrap items-center gap-1">
                            <span className="font-medium">{ch.label}</span>
                            <span className="text-muted">{ch.from}</span>
                            <span aria-hidden>→</span>
                            <span className="text-foreground">{ch.to}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">{t("contracts.revisionHistoryEmpty")}</p>
              )}
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
  const confirm = useConfirm();
  const { addSaleContract, confirmSaleContract, customers, tenant } = useMockStore();
  const moneyUnits = useMoneyUnits();
  const [no, setNo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState<SaleContractStatus>("draft");
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
    setStatus("draft");
    setSignedOn(todayISO());
    setPaymentTerms("");
    setFulfillBy("");
    setTolerancePercent("10");
    setTotalAmount("");
    setLines([emptySaleLine()]);
    setAttachment(null);
  }, [open]);

  async function saveContract(shouldConfirm = false) {
    if (
      lines.length === 0 ||
      lines.some((l) => !(l.materialTypeId || l.materialName.trim()) || l.plannedQty <= 0)
    )
      return;
    if (shouldConfirm) {
      const ok = await confirm({ title: "确认合同", message: "确认后合同将锁定，过磅台账才可以关联合同。后续修改只能走纠错删除。", confirmLabel: "确认并锁定" });
      if (!ok) return;
    }
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
    if (shouldConfirm) confirmSaleContract(row.id);
    onCreated?.(row.id);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); void saveContract(false); }

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
          <button type="button" className="ui-btn-primary" onClick={() => void saveContract(true)}>
            确认并锁定
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
  const confirm = useConfirm();
  const { saleContracts, customers, updateSaleContract, confirmSaleContract, weighTickets, tenant } = useMockStore();
  const { user } = useAuth();
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
  const [revisionMode, setRevisionMode] = useState(false);
  const [revisionReasonOpen, setRevisionReasonOpen] = useState(false);
  const locked = readOnly || row?.status !== "draft";
  const formDisabled = locked && !revisionMode;
  /** 已产生有效过磅记录的合同禁止变更（价格正源已落磅单） */
  const hasWeighings = useMemo(
    () => (row ? contractHasActiveWeighings(weighTickets, "sale", row) : false),
    [weighTickets, row],
  );
  const canRevise = !readOnly && !!row && row.status !== "draft" && row.status !== "void" && !hasWeighings;
  const revisionLockedHint = !readOnly && !!row && row.status !== "draft" && row.status !== "void" && hasWeighings;

  const syncFromRow = useCallback(() => {
    if (!row) return;
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
    setRevisionMode(false);
    setRevisionReasonOpen(false);
  }, [row]);

  useEffect(() => {
    if (!open || !row) return;
    syncFromRow();
  }, [open, row, syncFromRow]);

  function lineHasTickets(lineId: string) {
    return weighTickets.some((t) => t.saleContractLineId === lineId);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
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

  async function handleConfirm() {
    if (!row || locked) return;
    const ok = await confirm({ title: "确认合同", message: "确认后合同将锁定，后续修改只能走纠错删除。", confirmLabel: "确认并锁定" });
    if (ok) {
      confirmSaleContract(row.id);
      onClose();
    }
  }

  /** 由变更原因弹窗回调：返回错误文案（留在弹窗内提示）或 undefined（成功） */
  function submitRevision(rawReason: string): string | undefined {
    if (!row || !revisionMode) return undefined;
    const reason = rawReason.trim();
    if (!reason) return t("contracts.revisionReasonRequired");
    const customer = customers.find((c) => c.id === customerId);
    const after: SaleRevisionInput = {
      customerName: customer?.name ?? row.customerName,
      paymentTerms,
      fulfillBy,
      tolerancePercent: tolerancePercent === "" ? undefined : Number(tolerancePercent),
      totalAmount: totalAmount === "" ? undefined : Number(totalAmount),
      signedOn,
      lines: lines.map((l) => ({
        id: l.id,
        materialName: l.materialName,
        unitPrice: l.unitPrice,
        plannedQty: l.plannedQty,
        lineRemark: l.lineRemark,
      })),
    };
    const changes = diffSaleContract(row, after, t);
    if (changes.length === 0) {
      return t("contracts.noRevisionChanges");
    }
    const withAmounts = ensureSaleLineAmounts(
      lines.map((l) => ({
        ...l,
        fulfilledQty: row.lines.find((x) => x.id === l.id)?.fulfilledQty ?? l.fulfilledQty,
      })),
    );
    const revision = buildContractRevision(changes, reason, user?.name);
    updateSaleContract(row.id, {
      no,
      customerId,
      customerName: after.customerName,
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
      revisions: [...(row.revisions ?? []), revision],
    }, { allowNonDraft: true });
    setRevisionMode(false);
    setSaved(false);
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
            {revisionMode ? (
              <>
                <button type="button" className="ui-btn-secondary" onClick={() => syncFromRow()}>
                  {t("contracts.revisionCancel")}
                </button>
                <button type="button" className="ui-btn-primary" onClick={() => setRevisionReasonOpen(true)}>
                  {t("contracts.revisionSave")}
                </button>
                <RevisionReasonDialog
                  open={revisionReasonOpen}
                  onClose={() => setRevisionReasonOpen(false)}
                  onSubmit={submitRevision}
                />
              </>
            ) : !locked ? (
              <>
                <button type="submit" form="sale-contract-edit" className="ui-btn-primary">
                  {t("common.save")}
                </button>
                <button type="button" className="ui-btn-primary" onClick={() => void handleConfirm()}>确认并锁定</button>
              </>
            ) : canRevise ? (
              <button type="button" className="ui-btn-primary" onClick={() => setRevisionMode(true)}>
                {t("contracts.revise")}
              </button>
            ) : revisionLockedHint ? (
              <span className="text-xs text-muted">{t("contracts.revisionLockedByWeighing")}</span>
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
        <form id="sale-contract-edit" onSubmit={revisionMode ? (e) => e.preventDefault() : handleSubmit} className="flex h-full min-h-0 flex-1 flex-col">
          <ContractModalSplit attachment={attachment} onAttachmentChange={setAttachment} disabled={formDisabled}>
            {revisionMode ? null : readyHint && status !== "completed" && status !== "closed" ? (
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
                      disabled={revisionMode}
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
            <CorrectionInfo
              reason={row.voidReason}
              actor={row.voidedBy}
              at={row.voidedAt}
              batchId={row.reversalBatchId}
            />
            <FormSection title={t("contracts.revisionHistory")}>
              {row.revisions && row.revisions.length > 0 ? (
                <ul className="space-y-3">
                  {[...row.revisions].reverse().map((rev) => (
                    <li key={rev.id} className="rounded-[var(--radius-control)] border border-line bg-chip px-3 py-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span>{t("contracts.revisionAt")}: {rev.revisedAt}</span>
                        {rev.revisedBy ? <span>{t("contracts.revisionBy")}: {rev.revisedBy}</span> : null}
                        <span className="text-foreground">{rev.reason}</span>
                      </div>
                      <ul className="mt-2 space-y-1 text-sm">
                        {rev.changes.map((ch, i) => (
                          <li key={i} className="flex flex-wrap items-center gap-1">
                            <span className="font-medium">{ch.label}</span>
                            <span className="text-muted">{ch.from}</span>
                            <span aria-hidden>→</span>
                            <span className="text-foreground">{ch.to}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">{t("contracts.revisionHistoryEmpty")}</p>
              )}
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

/** 变更原因弹窗：点「保存变更」后弹出，必填原因才真正提交 */
function RevisionReasonDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  /** 提交回调：返回错误文案则留在弹窗内提示；返回 undefined 表示成功并关闭 */
  onSubmit: (reason: string) => string | undefined;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setError("");
    }
  }, [open]);

  function handleConfirm() {
    const err = onSubmit(reason);
    if (err) {
      setError(err);
      return;
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("contracts.revisionReasonTitle")}
      size="md"
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="button" className="ui-btn-primary" onClick={handleConfirm}>
            {t("contracts.revisionSave")}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted">{t("contracts.reviseHint")}</p>
        <FormField label={t("contracts.revisionReason")} required>
          <textarea
            autoFocus
            className={inputClass}
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            placeholder={t("contracts.revisionReasonPlaceholder")}
          />
        </FormField>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </Modal>
  );
}
