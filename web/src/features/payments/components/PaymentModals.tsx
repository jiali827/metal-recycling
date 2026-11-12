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
  SearchableSelect,
  Select,
  inputClass,
} from "@/shared/ui/CrudUi";
import { formatMoney } from "@/shared/lib/format";
import { nowLocalDateTime } from "@/shared/lib/date";
import { useMockStore } from "@/data/mock/store";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { useMoneyUnits } from "@/shared/lib/use-money-units";
import {
  defaultTypeForMiscCategory,
  miscCategorySelectOptions,
  resolveMiscCategoryForSave,
} from "@/entities/payment/misc-category";
import {
  buildAllocationSummary,
  paymentEffectiveSettled,
  paymentSettlementDocId,
} from "@/entities/settlement";
import {
  localizeAllocationSummary,
  useI18n,
} from "@/shared/i18n";
import type {
  ArApItem,
  PaymentCategory,
  PaymentCreateKind,
  PaymentMiscCategory,
  PaymentRecord,
  PaymentType,
} from "@/entities/types";
import { CorrectionInfo } from "@/features/correction/components/CorrectionInfo";

type SettlementTargetOption = ArApItem & { lockedType: PaymentType };

function usePaymentFormOptions(
  t: ReturnType<typeof useI18n>["t"],
  categories: PaymentMiscCategory[],
) {
  return useMemo(
    () => ({
      categoryOptions: [
        { value: "settlement", label: t("payments.categorySettlement") },
        { value: "misc", label: t("payments.categoryMisc") },
        { value: "salary", label: t("payments.categorySalary") },
      ],
      typeOptions: [
        { value: "receipt", label: t("common.receipt") },
        { value: "payment", label: t("common.payment") },
      ],
      methodOptions: [
        { value: "現金", label: t("form.methodCash") },
        { value: "支票", label: t("form.methodCheque") },
        { value: "轉賬", label: t("form.methodTransfer") },
      ],
      miscKindOptions: miscCategorySelectOptions(categories),
    }),
    [t, categories],
  );
}

function arApOptionLabel(item: ArApItem) {
  return `${item.settlementDocNo} · ${item.customerName} · ${formatMoney(item.balance)}`;
}

function collectOpenTargets(
  receivables: ArApItem[],
  payables: ArApItem[],
): SettlementTargetOption[] {
  const openish = (item: ArApItem) =>
    item.status === "open" || item.status === "partial";
  return [
    ...receivables.filter(openish).map((item) => ({ ...item, lockedType: "receipt" as const })),
    ...payables.filter(openish).map((item) => ({ ...item, lockedType: "payment" as const })),
  ];
}

function filterSettlementTargets(
  targets: SettlementTargetOption[],
  paymentType: PaymentType,
) {
  return targets.filter((item) => item.lockedType === paymentType);
}

/** 编辑时：当前余额 = 目标金额 − 其他收付款对该结算单的有效核销额（实收+减免） */
function editableBalanceForTarget(
  item: ArApItem,
  payments: PaymentRecord[],
  excludePaymentId?: string,
): number {
  const others = payments
    .filter(
      (p) =>
        p.category === "settlement" &&
        paymentSettlementDocId(p) === item.settlementDocId &&
        p.id !== excludePaymentId,
    )
    .reduce((sum, p) => sum + paymentEffectiveSettled(p), 0);
  return Math.max(0, item.amount - others);
}

/** WV03：有效核销额 = 实收实付 + 减免；不得超过往来余额；合计须大于 0 */
function isValidSettlementPayment(
  amount: number,
  waiverAmount: number,
  maxBalance: number,
) {
  const effective = amount + waiverAmount;
  return (
    amount >= 0 &&
    waiverAmount >= 0 &&
    effective > 0 &&
    effective <= maxBalance + 1e-9
  );
}

/** 减免不设金额上限（v1.2 取消 WV06 上限），仅要求留痕 */

export function PaymentCreateModal({
  open,
  onClose,
  onCreated,
  createKind = "settlement",
  preset,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
  createKind?: PaymentCreateKind;
  preset?: {
    settlementDocId?: string;
    type?: PaymentType;
    category?: PaymentCategory;
  };
}) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const { addPayment, confirmPayment, receivables, payables, employees, paymentMiscCategories } = useMockStore();
  const moneyUnits = useMoneyUnits();
  const { typeOptions, methodOptions, miscKindOptions } = usePaymentFormOptions(t, paymentMiscCategories);

  const effectiveKind: PaymentCreateKind =
    preset?.category === "salary"
      ? "salary"
      : preset?.category === "misc"
        ? "misc"
        : preset?.category === "settlement"
          ? "settlement"
          : createKind;

  const isSettlement = effectiveKind === "settlement";
  const isMisc = effectiveKind === "misc";
  const isSalary = effectiveKind === "salary";

  const [type, setType] = useState<PaymentType>("receipt");
  const [method, setMethod] = useState("現金");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [waiverAmount, setWaiverAmount] = useState("");
  const [waiverReason, setWaiverReason] = useState("");
  const [waiverTouched, setWaiverTouched] = useState(false);
  const [settlementDocId, setSettlementDocId] = useState("");
  const [allocationSummary, setAllocationSummary] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [miscKindId, setMiscKindId] = useState("");

  const openTargets = useMemo(
    () => collectOpenTargets(receivables, payables),
    [receivables, payables],
  );

  const filteredOpenTargets = useMemo(
    () => filterSettlementTargets(openTargets, type),
    [openTargets, type],
  );

  const settlementOptions = useMemo(
    () =>
      filteredOpenTargets.map((item) => ({
        value: item.settlementDocId,
        label: arApOptionLabel(item),
      })),
    [filteredOpenTargets],
  );

  const selectedSettlement = filteredOpenTargets.find(
    (item) => item.settlementDocId === settlementDocId,
  );

  const maxBalance = selectedSettlement?.balance ?? 0;

  const employeeOptions = useMemo(
    () =>
      employees
        .filter((emp) => emp.status === "active")
        .map((emp) => ({
          value: emp.id,
          label:
            emp.monthlySalary != null
              ? `${emp.name} · ${formatMoney(emp.monthlySalary)}`
              : emp.name,
        })),
    [employees],
  );

  const selectedEmployee = employees.find((emp) => emp.id === employeeId);

  useEffect(() => {
    if (!open) return;
    const initialMiscKindId =
      paymentMiscCategories.length > 0
        ? paymentMiscCategories.find((c) => c.enabled)?.id ?? ""
        : "";
    const presetDocId = preset?.settlementDocId ?? "";
    const pool = collectOpenTargets(receivables, payables);
    const presetItem = presetDocId
      ? pool.find((row) => row.settlementDocId === presetDocId)
      : undefined;
    const initialType =
      presetItem?.lockedType ??
      preset?.type ??
      (isMisc
        ? (() => {
            const firstCat = paymentMiscCategories.find((c) => c.enabled);
            return firstCat ? defaultTypeForMiscCategory(firstCat) : "payment";
          })()
        : isSalary
          ? "payment"
          : "receipt");

    setType(initialType);
    setMethod("現金");
    setDate(nowLocalDateTime());
    setAllocationSummary("");
    setMiscKindId(initialMiscKindId);
    setEmployeeId("");
    setWaiverAmount("");
    setWaiverReason("");
    setWaiverTouched(false);

    if (isSalary) {
      setSettlementDocId("");
      setCounterparty("");
      setAmount("");
    } else if (isMisc) {
      setSettlementDocId("");
      setCounterparty("");
      setAmount("");
    } else {
      setSettlementDocId(presetItem?.settlementDocId ?? "");
      setCounterparty(presetItem?.customerName ?? "");
      setAmount(presetItem ? String(presetItem.balance) : "");
    }
  }, [open, preset, receivables, payables, isMisc, isSalary]);

  function handleSettlementTypeChange(next: PaymentType) {
    setType(next);
    setSettlementDocId("");
    setCounterparty("");
    setAmount("");
    setWaiverAmount("");
    setWaiverReason("");
    setWaiverTouched(false);
  }

  function applySettlementTarget(docId: string) {
    setSettlementDocId(docId);
    setWaiverAmount("");
    setWaiverReason("");
    setWaiverTouched(false);
    if (!docId) {
      setAmount("");
      setCounterparty("");
      return;
    }
    const item = filteredOpenTargets.find((row) => row.settlementDocId === docId);
    if (!item) return;
    setCounterparty(item.customerName);
    setAmount(String(item.balance));
  }

  /** 金额变化时自动预填抹零差额（余额 − 实收）；手动改过减免后不再自动覆盖 */
  function handleSettlementAmountChange(value: string) {
    setAmount(value);
    if (waiverTouched || !selectedSettlement) return;
    const diff = Math.max(0, selectedSettlement.balance - (Number(value) || 0));
    setWaiverAmount(diff > 0 ? String(Math.round(diff * 100) / 100) : "");
  }

  function applyEmployee(id: string) {
    setEmployeeId(id);
    if (!id) {
      setCounterparty("");
      setAmount("");
      return;
    }
    const emp = employees.find((row) => row.id === id);
    if (!emp) return;
    setCounterparty(emp.name);
    setAmount(emp.monthlySalary != null ? String(emp.monthlySalary) : "");
  }

  function handleMiscKindChange(kindId: string) {
    setMiscKindId(kindId);
    const cat = paymentMiscCategories.find((c) => c.id === kindId);
    if (cat) {
      setType(defaultTypeForMiscCategory(cat));
    }
  }

  async function handleSubmit(e: React.FormEvent, shouldConfirm = false) {
    e.preventDefault();
    const payAmount = Number(amount) || 0;
    const waiver = isSettlement ? Math.max(0, Number(waiverAmount) || 0) : 0;
    if (payAmount <= 0 && waiver <= 0) return;

    async function confirmBeforeSave() {
      return !shouldConfirm || await confirm({ title: "确认收付款", message: "确认后收付款将锁定并正式入账，后续修改只能走纠错删除。", confirmLabel: "确认并入账" });
    }

    if (isSalary) {
      if (!selectedEmployee) return;
      if (!await confirmBeforeSave()) return;
      const row = addPayment({
        date,
        category: "salary",
        type: "payment",
        method,
        amount: payAmount,
        counterparty: selectedEmployee.name,
        employeeId: selectedEmployee.id,
        allocationSummary: allocationSummary || "-",
        miscKind: undefined,
        miscKindId: undefined,
        miscKindName: undefined,
        settlementDocId: undefined,
        settlementDocNo: undefined,
        contractNo: undefined,
      });
      if (shouldConfirm) confirmPayment(row.id);
      onCreated?.(row.id);
      onClose();
      return;
    }

    if (isMisc) {
      if (!miscKindId) return;
    } else {
      if (!selectedSettlement) return;
      if (!isValidSettlementPayment(payAmount, waiver, selectedSettlement.balance)) return;
    }
    if (!await confirmBeforeSave()) return;

    const summary = isMisc
      ? allocationSummary || "-"
      : buildAllocationSummary(
          selectedSettlement!.settlementDocNo,
          payAmount,
          selectedSettlement!.amount,
          waiver,
        );

    const row = addPayment({
      date,
      category: isMisc ? "misc" : "settlement",
      type,
      method,
      amount: payAmount,
      counterparty: isMisc ? counterparty : selectedSettlement!.customerName,
      allocationSummary: summary,
      ...(isMisc
        ? {
            ...(resolveMiscCategoryForSave(miscKindId, paymentMiscCategories) ?? {}),
            miscKind: undefined,
            settlementDocId: undefined,
            settlementDocNo: undefined,
            contractNo: undefined,
            employeeId: undefined,
          }
        : {
            settlementDocId: selectedSettlement!.settlementDocId,
            settlementDocNo: selectedSettlement!.settlementDocNo,
            contractNo: selectedSettlement!.contractNo,
            waiverAmount: waiver > 0 ? waiver : undefined,
            waiverReason: waiver > 0 ? waiverReason.trim() || "抹零" : undefined,
            miscKindId: undefined,
            miscKindName: undefined,
            miscKind: undefined,
            employeeId: undefined,
          }),
    });
    if (shouldConfirm) confirmPayment(row.id);
    onCreated?.(row.id);
    onClose();
  }

  const payAmountForHint = Number(amount) || 0;
  const waiverForHint = Math.max(0, Number(waiverAmount) || 0);

  const modalTitle = isSalary
    ? t("payments.newSalary")
    : isMisc
      ? t("payments.newMisc")
      : t("payments.newSettlement");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modalTitle}
      size="lg"
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="payment-create-form" className="ui-btn-primary">
            {t("common.save")}
          </button>
          <button type="button" className="ui-btn-primary" onClick={() => void handleSubmit({ preventDefault() {} } as React.FormEvent, true)}>
            确认并入账
          </button>
        </>
      }
    >
      <form id="payment-create-form" onSubmit={handleSubmit}>
        <FormSection title={isMisc || isSalary ? t("form.sectionBasic") : undefined}>
          <FormFieldGrid>
            {isSalary ? (
              <>
                <FormField label={t("payments.salaryEmployee")} required hint={t("payments.salaryEmployeeHint")}>
                  <SearchableSelect
                    value={employeeId}
                    onChange={applyEmployee}
                    options={employeeOptions}
                    placeholder={t("form.selectPlaceholder")}
                    searchPlaceholder={t("form.selectPlaceholder")}
                  />
                </FormField>
                <FormField label={t("common.type")}>
                  <div className="ui-form-readonly">{t("common.payment")}</div>
                </FormField>
                <FormField label={t("form.method")}>
                  <OptionField value={method} onChange={setMethod} options={methodOptions} />
                </FormField>
                <FormField label={t("fields.amount")} required>
                  <InputWithUnit
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    unit={moneyUnits.money}
                  />
                </FormField>
                <FormField label={t("fields.paymentDateTime")} required>
                  <DateTimePicker value={date} onChange={setDate} />
                </FormField>
                {selectedEmployee?.salaryEffectiveDate ? (
                  <FormFieldFull>
                    <p className="rounded-[8px] bg-chip px-3 py-2 text-xs text-muted">
                      {t("form.salaryEffectiveDate")}: {selectedEmployee.salaryEffectiveDate}
                    </p>
                  </FormFieldFull>
                ) : null}
              </>
            ) : isMisc ? (
              <>
                <FormField label={t("common.type")}>
                  <OptionField
                    value={type}
                    onChange={(v) => setType(v as PaymentType)}
                    options={typeOptions}
                  />
                </FormField>
                <FormField label={t("form.method")}>
                  <OptionField value={method} onChange={setMethod} options={methodOptions} />
                </FormField>
                <FormField label={t("fields.amount")} required>
                  <InputWithUnit
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    unit={moneyUnits.money}
                  />
                </FormField>
                <FormField label={t("fields.paymentDateTime")} required>
                  <DateTimePicker value={date} onChange={setDate} />
                </FormField>
                <FormField label={t("form.partyMisc")} required>
                  <input
                    className={inputClass}
                    required
                    value={counterparty}
                    onChange={(e) => setCounterparty(e.target.value)}
                    placeholder={t("form.partyMiscPlaceholder")}
                  />
                </FormField>
                <FormField label={t("form.miscKind")} required>
                  <Select
                    value={miscKindId}
                    onChange={(v) => handleMiscKindChange(v)}
                    options={miscKindOptions}
                  />
                </FormField>
              </>
            ) : (
              <>
                <FormField label={t("common.type")} required>
                  <OptionField
                    value={type}
                    onChange={(v) => handleSettlementTypeChange(v as PaymentType)}
                    options={typeOptions}
                  />
                </FormField>
                <FormField label={t("form.relatedSettlementDoc")} required>
                  <SearchableSelect
                    value={settlementDocId}
                    onChange={applySettlementTarget}
                    options={settlementOptions}
                    placeholder={t("form.settleSelectPlaceholder")}
                    searchPlaceholder={t("form.selectPlaceholder")}
                    allowClear
                    clearValue=""
                  />
                </FormField>
                <FormField label={t("form.method")}>
                  <OptionField value={method} onChange={setMethod} options={methodOptions} />
                </FormField>
                <FormField label={t("fields.amount")} required>
                  <InputWithUnit
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedSettlement ? maxBalance : undefined}
                    required
                    value={amount}
                    onChange={(e) => handleSettlementAmountChange(e.target.value)}
                    unit={moneyUnits.money}
                  />
                </FormField>
                {selectedSettlement ? (
                  <>
                    <FormField label={t("payments.waiverAmount")}>
                      <InputWithUnit
                        type="number"
                        step="0.01"
                        min="0"
                        value={waiverAmount}
                        onChange={(e) => {
                          setWaiverAmount(e.target.value);
                          setWaiverTouched(true);
                        }}
                        unit={moneyUnits.money}
                      />
                    </FormField>
                    <FormField label={t("payments.waiverReason")}>
                      <input
                        className={inputClass}
                        value={waiverReason}
                        onChange={(e) => setWaiverReason(e.target.value)}
                        placeholder={t("payments.waiverReasonPlaceholder")}
                      />
                    </FormField>
                  </>
                ) : null}
                <FormField label={t("fields.paymentDateTime")} required>
                  <DateTimePicker value={date} onChange={setDate} />
                </FormField>
                {selectedSettlement ? (
                  <FormFieldFull>
                    <p className="rounded-[8px] bg-chip px-3 py-2 text-xs text-muted">
                      {selectedSettlement.customerName}
                      {selectedSettlement.contractNo
                        ? ` · ${selectedSettlement.contractNo}`
                        : ""}
                      {" · "}
                      {t("form.settleBalanceHint", {
                        balance: formatMoney(selectedSettlement.balance),
                        amount: formatMoney(selectedSettlement.amount),
                      })}
                    </p>
                    <p className="mt-1 rounded-[8px] bg-chip px-3 py-2 text-xs text-muted">
                      {t("payments.settleComposition", {
                        paid: formatMoney(payAmountForHint),
                        waiver: formatMoney(waiverForHint),
                        total: formatMoney(payAmountForHint + waiverForHint),
                      })}
                    </p>
                  </FormFieldFull>
                ) : null}
              </>
            )}
          </FormFieldGrid>
        </FormSection>
        {isMisc || isSalary ? (
          <FormSection title={t("form.sectionOptional")}>
            <FormFieldFull>
              <FormField label={t("form.miscRemark")}>
                <textarea
                  className={`${inputClass} min-h-[4.5rem] resize-y`}
                  value={allocationSummary}
                  onChange={(e) => setAllocationSummary(e.target.value)}
                  placeholder={t("form.miscRemarkPlaceholder")}
                />
              </FormField>
            </FormFieldFull>
          </FormSection>
        ) : null}
      </form>
    </Modal>
  );
}

export function PaymentDetailModal({
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
  const confirm = useConfirm();
  const { payments, receivables, payables, employees, paymentMiscCategories, updatePayment, confirmPayment } = useMockStore();
  const moneyUnits = useMoneyUnits();
  const { typeOptions, methodOptions, miscKindOptions } = usePaymentFormOptions(t, paymentMiscCategories);
  const row = id ? payments.find((p) => p.id === id) : undefined;
  const locked = readOnly || row?.status !== "pending";

  const [category, setCategory] = useState<PaymentCategory>("settlement");
  const [date, setDate] = useState("");
  const [type, setType] = useState<PaymentType>("receipt");
  const [method, setMethod] = useState("現金");
  const [amount, setAmount] = useState("0");
  const [waiverAmount, setWaiverAmount] = useState("");
  const [waiverReason, setWaiverReason] = useState("");
  const [settlementDocId, setSettlementDocId] = useState("");
  const [allocationSummary, setAllocationSummary] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [miscKindId, setMiscKindId] = useState("");
  const [saved, setSaved] = useState(false);

  const isMisc = category === "misc";
  const isSalary = category === "salary";
  const detailPayAmount = Number(amount) || 0;
  const detailWaiver = isMisc || isSalary ? 0 : Math.max(0, Number(waiverAmount) || 0);

  // Detail modal: include the current category even if it's been deleted/disabled
  const detailMiscKindOptions = useMemo(
    () => miscCategorySelectOptions(paymentMiscCategories, {
      currentId: row?.miscKindId,
      currentName: row?.miscKindName,
    }),
    [paymentMiscCategories, row?.miscKindId, row?.miscKindName],
  );

  const settlementPool = useMemo(() => {
    const open = collectOpenTargets(receivables, payables);
    const currentId = settlementDocId || (row ? paymentSettlementDocId(row) : "");
    if (!currentId) return open;
    if (open.some((item) => item.settlementDocId === currentId)) return open;

    const fromAr = receivables.find((item) => item.settlementDocId === currentId);
    if (fromAr) {
      return [{ ...fromAr, lockedType: "receipt" as const }, ...open];
    }
    const fromAp = payables.find((item) => item.settlementDocId === currentId);
    if (fromAp) {
      return [{ ...fromAp, lockedType: "payment" as const }, ...open];
    }
    return open;
  }, [receivables, payables, settlementDocId, row]);

  const filteredSettlementPool = useMemo(() => settlementPool, [settlementPool]);

  const settlementOptions = useMemo(
    () =>
      filteredSettlementPool.map((item) => ({
        value: item.settlementDocId,
        label: arApOptionLabel(item),
      })),
    [filteredSettlementPool],
  );

  const selectedSettlement = filteredSettlementPool.find(
    (item) => item.settlementDocId === settlementDocId,
  );

  const maxBalance = selectedSettlement
    ? editableBalanceForTarget(selectedSettlement, payments, row?.id)
    : 0;

  const employeeOptions = useMemo(() => {
    const active = employees.filter((emp) => emp.status === "active");
    const current = row?.employeeId
      ? employees.find((emp) => emp.id === row.employeeId)
      : undefined;
    const list =
      current && !active.some((emp) => emp.id === current.id)
        ? [current, ...active]
        : active;
    return list.map((emp) => ({
      value: emp.id,
      label:
        emp.monthlySalary != null
          ? `${emp.name} · ${formatMoney(emp.monthlySalary)}`
          : emp.name,
    }));
  }, [employees, row?.employeeId]);

  const selectedEmployee = employees.find((emp) => emp.id === employeeId);

  useEffect(() => {
    if (!open || !row) return;
    setCategory(row.category ?? "settlement");
    setDate(row.date);
    setType(row.type);
    setMethod(row.method);
    setAmount(String(row.amount));
    setWaiverAmount(
      row.waiverAmount != null && row.waiverAmount > 0 ? String(row.waiverAmount) : "",
    );
    setWaiverReason(row.waiverReason ?? "");
    setSettlementDocId(paymentSettlementDocId(row));
    setCounterparty(row.counterparty);
    setEmployeeId(row.employeeId ?? "");
    setAllocationSummary(
      row.allocationSummary === "-"
        ? ""
        : row.category === "misc" || row.category === "salary"
          ? row.allocationSummary
          : localizeAllocationSummary(row.allocationSummary),
    );
    setMiscKindId(row.miscKindId ?? "");
    setSaved(false);
  }, [open, row]);

  function applySettlementTarget(docId: string) {
    setSettlementDocId(docId);
    if (!docId) {
      setAmount("");
      setWaiverAmount("");
      return;
    }
    const item = settlementPool.find((r) => r.settlementDocId === docId);
    if (!item) return;
    setType(item.lockedType);
    setCounterparty(item.customerName);
    const bal = editableBalanceForTarget(item, payments, row?.id);
    setAmount(String(bal));
    setWaiverAmount("");
  }

  function applyEmployee(id: string) {
    setEmployeeId(id);
    if (!id) {
      setCounterparty("");
      return;
    }
    const emp = employees.find((row) => row.id === id);
    if (!emp) return;
    setCounterparty(emp.name);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    if (!row) return;

    const payAmount = Number(amount) || 0;
    const waiver = !isMisc && !isSalary ? Math.max(0, Number(waiverAmount) || 0) : 0;
    if (payAmount <= 0 && waiver <= 0) return;

    if (isSalary) {
      if (!employeeId) return;
      const emp = employees.find((item) => item.id === employeeId);
      if (!emp) return;
      updatePayment(row.id, {
        category: "salary",
        date,
        type: "payment",
        method,
        amount: payAmount,
        counterparty: emp.name,
        employeeId,
        allocationSummary: allocationSummary || "-",
        waiverAmount: undefined,
        waiverReason: undefined,
        miscKind: undefined,
        miscKindId: undefined,
        miscKindName: undefined,
        settlementDocId: undefined,
        settlementDocNo: undefined,
        contractNo: undefined,
      });
      setSaved(true);
      return;
    }

    if (isMisc) {
      if (!miscKindId) return;
    } else {
      if (!selectedSettlement) return;
      if (!isValidSettlementPayment(payAmount, waiver, maxBalance)) return;
    }

    const summary = isMisc
      ? allocationSummary || "-"
      : buildAllocationSummary(
          selectedSettlement!.settlementDocNo,
          payAmount,
          selectedSettlement!.amount,
          waiver,
        );

    updatePayment(row.id, {
      category,
      date,
      type,
      method,
      amount: payAmount,
      counterparty: isMisc ? counterparty : selectedSettlement!.customerName,
      allocationSummary: summary,
      ...(isMisc
        ? {
            ...(resolveMiscCategoryForSave(miscKindId, paymentMiscCategories) ?? {}),
            miscKind: undefined,
            settlementDocId: undefined,
            settlementDocNo: undefined,
            contractNo: undefined,
            employeeId: undefined,
            waiverAmount: undefined,
            waiverReason: undefined,
          }
        : {
            settlementDocId: selectedSettlement!.settlementDocId,
            settlementDocNo: selectedSettlement!.settlementDocNo,
            contractNo: selectedSettlement!.contractNo,
            waiverAmount: waiver > 0 ? waiver : undefined,
            waiverReason: waiver > 0 ? waiverReason.trim() || "抹零" : undefined,
            miscKindId: undefined,
            miscKindName: undefined,
            miscKind: undefined,
            employeeId: undefined,
          }),
    });
    setSaved(true);
  }

  async function handleConfirm() {
    if (!row || locked) return;
    const ok = await confirm({ title: "确认收付款", message: "确认后收付款将锁定并正式入账，后续修改只能走纠错删除。", confirmLabel: "确认并入账" });
    if (ok) {
      confirmPayment(row.id);
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("form.paymentDetail")}
      size="lg"
      footer={
        row ? (
          <>
            <button type="button" className="ui-btn-secondary" onClick={onClose}>
              {t("common.close")}
            </button>
            {!locked ? (
              <button type="submit" form="payment-edit-form" className="ui-btn-primary">
                {t("common.save")}
              </button>
            ) : null}
            {!locked ? <button type="button" className="ui-btn-primary" onClick={() => void handleConfirm()}>确认并入账</button> : null}
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
        <form id="payment-edit-form" onSubmit={handleSubmit}>
          <fieldset disabled={locked} className="min-w-0 space-y-4 border-0 p-0">
          <FormSection title={isMisc || isSalary ? t("form.sectionBasic") : undefined}>
            <FormFieldGrid>
              {isSalary ? (
                <>
                  <FormField label={t("payments.salaryEmployee")} required hint={t("payments.salaryEmployeeHint")}>
                    <SearchableSelect
                      value={employeeId}
                      onChange={applyEmployee}
                      options={employeeOptions}
                      placeholder={t("form.selectPlaceholder")}
                      searchPlaceholder={t("form.selectPlaceholder")}
                      disabled={readOnly}
                    />
                  </FormField>
                  <FormField label={t("form.method")}>
                    <OptionField
                      value={method}
                      onChange={setMethod}
                      options={methodOptions}
                      disabled={readOnly}
                    />
                  </FormField>
                  <FormField label={t("fields.amount")} required>
                    <InputWithUnit
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      unit={moneyUnits.money}
                      disabled={readOnly}
                    />
                  </FormField>
                  <FormField label={t("fields.paymentDateTime")} required>
                    <DateTimePicker value={date} onChange={setDate} disabled={readOnly} />
                  </FormField>
                  {selectedEmployee?.salaryEffectiveDate ? (
                    <FormFieldFull>
                      <p className="rounded-[8px] bg-chip px-3 py-2 text-xs text-muted">
                        {t("form.salaryEffectiveDate")}: {selectedEmployee.salaryEffectiveDate}
                      </p>
                    </FormFieldFull>
                  ) : null}
                </>
              ) : isMisc ? (
                <>
                  <FormField label={t("common.type")}>
                    <OptionField
                      value={type}
                      onChange={(v) => setType(v as PaymentType)}
                      options={typeOptions}
                      disabled={readOnly}
                    />
                  </FormField>
                  <FormField label={t("form.method")}>
                    <OptionField
                      value={method}
                      onChange={setMethod}
                      options={methodOptions}
                      disabled={readOnly}
                    />
                  </FormField>
                  <FormField label={t("fields.amount")} required>
                    <InputWithUnit
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      unit={moneyUnits.money}
                      disabled={readOnly}
                    />
                  </FormField>
                  <FormField label={t("fields.paymentDateTime")} required>
                    <DateTimePicker value={date} onChange={setDate} disabled={readOnly} />
                  </FormField>
                  <FormField label={t("form.partyMisc")} required>
                    <input
                      className={inputClass}
                      required
                      value={counterparty}
                      onChange={(e) => setCounterparty(e.target.value)}
                      readOnly={readOnly}
                      disabled={readOnly}
                    />
                  </FormField>
                  <FormField label={t("form.miscKind")} required>
                    <Select
                      value={miscKindId}
                      onChange={(v) => setMiscKindId(v)}
                      options={detailMiscKindOptions}
                      disabled={readOnly}
                    />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label={t("form.relatedSettlementDoc")} required>
                    <SearchableSelect
                      value={settlementDocId}
                      onChange={applySettlementTarget}
                      options={settlementOptions}
                      placeholder={t("form.settleSelectPlaceholder")}
                      searchPlaceholder={t("form.selectPlaceholder")}
                      allowClear
                      clearValue=""
                      disabled={readOnly}
                    />
                  </FormField>
                  <FormField label={t("form.method")}>
                    <OptionField
                      value={method}
                      onChange={setMethod}
                      options={methodOptions}
                      disabled={readOnly}
                    />
                  </FormField>
                  <FormField label={t("fields.amount")} required>
                    <InputWithUnit
                      type="number"
                      step="0.01"
                      min="0"
                      max={selectedSettlement ? maxBalance : undefined}
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      unit={moneyUnits.money}
                      disabled={readOnly}
                    />
                  </FormField>
                  {selectedSettlement ? (
                    <FormField label={t("payments.waiverAmount")}>
                      <InputWithUnit
                        type="number"
                        step="0.01"
                        min="0"
                        value={waiverAmount}
                        onChange={(e) => setWaiverAmount(e.target.value)}
                        unit={moneyUnits.money}
                        disabled={readOnly}
                      />
                    </FormField>
                  ) : null}
                  <FormField label={t("fields.paymentDateTime")} required>
                    <DateTimePicker value={date} onChange={setDate} disabled={readOnly} />
                  </FormField>
                  {selectedSettlement ? (
                    <>
                      <FormField label={t("payments.waiverReason")}>
                        <input
                          className={inputClass}
                          value={waiverReason}
                          onChange={(e) => setWaiverReason(e.target.value)}
                          placeholder={t("payments.waiverReasonPlaceholder")}
                          readOnly={readOnly}
                          disabled={readOnly}
                        />
                      </FormField>
                      <FormFieldFull>
                        <p className="rounded-[8px] bg-chip px-3 py-2 text-xs text-muted">
                          {selectedSettlement.customerName}
                          {selectedSettlement.contractNo
                            ? ` · ${selectedSettlement.contractNo}`
                            : ""}
                          {" · "}
                          {t("form.settleBalanceHint", {
                            balance: formatMoney(maxBalance),
                            amount: formatMoney(selectedSettlement.amount),
                          })}
                        </p>
                        <p className="mt-1 rounded-[8px] bg-chip px-3 py-2 text-xs text-muted">
                          {t("payments.settleComposition", {
                            paid: formatMoney(detailPayAmount),
                            waiver: formatMoney(detailWaiver),
                            total: formatMoney(detailPayAmount + detailWaiver),
                          })}
                        </p>
                      </FormFieldFull>
                    </>
                  ) : null}
                </>
              )}
            </FormFieldGrid>
          </FormSection>
          {isMisc || isSalary ? (
            <FormSection title={t("form.sectionOptional")}>
              <FormFieldFull>
                <FormField label={t("form.miscRemark")}>
                  <textarea
                    className={`${inputClass} min-h-[4.5rem] resize-y`}
                    value={allocationSummary}
                    onChange={(e) => setAllocationSummary(e.target.value)}
                    placeholder={t("form.miscRemarkPlaceholder")}
                    readOnly={readOnly}
                    disabled={readOnly}
                  />
                </FormField>
              </FormFieldFull>
            </FormSection>
          ) : null}
          </fieldset>
          <div className="mt-6">
            <CorrectionInfo
              reason={row.voidReason}
              actor={row.voidedBy}
              at={row.voidedAt}
              batchId={row.reversalBatchId}
            />
          </div>
          {saved ? <p className="text-sm text-success">{t("common.saved")}</p> : null}
        </form>
      )}
    </Modal>
  );
}
