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
import { useMoneyUnits } from "@/shared/lib/use-money-units";
import { defaultTypeForMiscKind, MISC_KINDS } from "@/entities/payment/meta";
import {
  buildAllocationSummary,
  paymentSettlementDocId,
} from "@/entities/settlement";
import {
  localizeAllocationSummary,
  localizeMiscKind,
  useI18n,
} from "@/shared/i18n";
import type {
  ArApItem,
  PaymentCategory,
  PaymentMiscKind,
  PaymentRecord,
  PaymentType,
} from "@/entities/types";

type SettlementTargetOption = ArApItem & { lockedType: PaymentType };

function usePaymentFormOptions(t: ReturnType<typeof useI18n>["t"]) {
  return useMemo(
    () => ({
      categoryOptions: [
        { value: "settlement", label: t("payments.categorySettlement") },
        { value: "misc", label: t("payments.categoryMisc") },
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
      miscKindOptions: MISC_KINDS.map((kind) => ({
        value: kind,
        label: localizeMiscKind(kind),
      })),
    }),
    [t],
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

/** 编辑时：当前余额 = 目标金额 − 其他收付款对该结算单的已核金额 */
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
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  return Math.max(0, item.amount - others);
}

function isValidSettlementAmount(amount: number, maxBalance: number) {
  return amount > 0 && amount <= maxBalance + 1e-9;
}

export function PaymentCreateModal({
  open,
  onClose,
  onCreated,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
  preset?: {
    settlementDocId?: string;
    type?: PaymentType;
    category?: PaymentCategory;
  };
}) {
  const { t } = useI18n();
  const { addPayment, receivables, payables } = useMockStore();
  const moneyUnits = useMoneyUnits();
  const { categoryOptions, typeOptions, methodOptions, miscKindOptions } =
    usePaymentFormOptions(t);

  const [category, setCategory] = useState<PaymentCategory>("settlement");
  const [type, setType] = useState<PaymentType>("receipt");
  const [method, setMethod] = useState("現金");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [settlementDocId, setSettlementDocId] = useState("");
  const [allocationSummary, setAllocationSummary] = useState("");
  const [miscKind, setMiscKind] = useState<PaymentMiscKind>("other_expense");
  const [counterparty, setCounterparty] = useState("");

  const isMisc = category === "misc";

  const openTargets = useMemo(
    () => collectOpenTargets(receivables, payables),
    [receivables, payables],
  );

  const settlementOptions = useMemo(
    () =>
      openTargets.map((item) => ({
        value: item.settlementDocId,
        label: arApOptionLabel(item),
      })),
    [openTargets],
  );

  const selectedSettlement = openTargets.find(
    (item) => item.settlementDocId === settlementDocId,
  );

  const maxBalance = selectedSettlement?.balance ?? 0;

  useEffect(() => {
    if (!open) return;
    const initialCategory = preset?.category ?? "settlement";
    const initialMiscKind: PaymentMiscKind = "other_expense";
    const presetDocId = preset?.settlementDocId ?? "";
    const pool = collectOpenTargets(receivables, payables);
    const presetItem = presetDocId
      ? pool.find((row) => row.settlementDocId === presetDocId)
      : undefined;
    const initialType =
      presetItem?.lockedType ??
      preset?.type ??
      (initialCategory === "misc"
        ? defaultTypeForMiscKind(initialMiscKind)
        : "receipt");

    setCategory(initialCategory);
    setType(initialType);
    setMethod("現金");
    setDate(nowLocalDateTime());
    setAllocationSummary("");
    setMiscKind(initialMiscKind);

    if (initialCategory !== "misc") {
      setSettlementDocId(presetItem?.settlementDocId ?? "");
      setCounterparty(presetItem?.customerName ?? "");
      setAmount(presetItem ? String(presetItem.balance) : "");
    } else {
      setSettlementDocId("");
      setCounterparty("");
      setAmount("");
    }
  }, [open, preset, receivables, payables]);

  function applySettlementTarget(docId: string) {
    setSettlementDocId(docId);
    if (!docId) {
      setAmount("");
      return;
    }
    const item = openTargets.find((row) => row.settlementDocId === docId);
    if (!item) return;
    setType(item.lockedType);
    setCounterparty(item.customerName);
    setAmount(String(item.balance));
  }

  function handleCategoryChange(next: PaymentCategory) {
    setCategory(next);
    setSettlementDocId("");
    setAllocationSummary("");
    setAmount("");
    if (next === "misc") {
      const kind: PaymentMiscKind = "other_expense";
      setMiscKind(kind);
      setType(defaultTypeForMiscKind(kind));
      setCounterparty("");
    } else {
      setType(preset?.type ?? "receipt");
      setCounterparty("");
    }
  }

  function handleMiscKindChange(kind: PaymentMiscKind) {
    setMiscKind(kind);
    setType(defaultTypeForMiscKind(kind));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isMisc) {
      if (!miscKind) return;
    } else {
      if (!selectedSettlement) return;
      const payAmount = Number(amount) || 0;
      if (!isValidSettlementAmount(payAmount, selectedSettlement.balance)) return;
    }

    const payAmount = Number(amount) || 0;
    const summary = isMisc
      ? allocationSummary || "-"
      : buildAllocationSummary(
          selectedSettlement!.settlementDocNo,
          payAmount,
          selectedSettlement!.amount,
        );

    const row = addPayment({
      date,
      category,
      type: isMisc ? type : selectedSettlement!.lockedType,
      method,
      amount: payAmount,
      counterparty: isMisc ? counterparty : selectedSettlement!.customerName,
      allocationSummary: summary,
      ...(isMisc
        ? {
            miscKind,
            settlementDocId: undefined,
            settlementDocNo: undefined,
            contractNo: undefined,
          }
        : {
            settlementDocId: selectedSettlement!.settlementDocId,
            settlementDocNo: selectedSettlement!.settlementDocNo,
            contractNo: selectedSettlement!.contractNo,
            miscKind: undefined,
          }),
    });
    onCreated?.(row.id);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("payments.new")}
      size="lg"
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="payment-create-form" className="ui-btn-primary">
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="payment-create-form" onSubmit={handleSubmit}>
        <FormSection title={isMisc ? t("form.sectionBasic") : undefined}>
          <FormFieldGrid>
            <FormField label={t("payments.colCategory")} required>
              <OptionField
                value={category}
                onChange={(v) => handleCategoryChange(v as PaymentCategory)}
                options={categoryOptions}
              />
            </FormField>
            {isMisc ? (
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
                    value={miscKind}
                    onChange={(v) => handleMiscKindChange(v as PaymentMiscKind)}
                    options={miscKindOptions}
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
                  />
                </FormField>
                <FormField label={t("common.type")}>
                  <div className="ui-form-readonly">
                    {type === "receipt" ? t("common.receipt") : t("common.payment")}
                  </div>
                </FormField>
                <FormField label={t("form.method")}>
                  <OptionField value={method} onChange={setMethod} options={methodOptions} />
                </FormField>
                <FormField label={t("fields.amount")} required>
                  <InputWithUnit
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedSettlement ? maxBalance : undefined}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    unit={moneyUnits.money}
                  />
                </FormField>
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
                  </FormFieldFull>
                ) : null}
              </>
            )}
          </FormFieldGrid>
        </FormSection>
        {isMisc ? (
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
  const { payments, receivables, payables, updatePayment } = useMockStore();
  const moneyUnits = useMoneyUnits();
  const { categoryOptions, typeOptions, methodOptions, miscKindOptions } =
    usePaymentFormOptions(t);
  const row = id ? payments.find((p) => p.id === id) : undefined;

  const [category, setCategory] = useState<PaymentCategory>("settlement");
  const [date, setDate] = useState("");
  const [type, setType] = useState<PaymentType>("receipt");
  const [method, setMethod] = useState("現金");
  const [amount, setAmount] = useState("0");
  const [settlementDocId, setSettlementDocId] = useState("");
  const [allocationSummary, setAllocationSummary] = useState("");
  const [miscKind, setMiscKind] = useState<PaymentMiscKind>("other_expense");
  const [counterparty, setCounterparty] = useState("");
  const [saved, setSaved] = useState(false);

  const isMisc = category === "misc";

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

  const settlementOptions = useMemo(
    () =>
      settlementPool.map((item) => ({
        value: item.settlementDocId,
        label: arApOptionLabel(item),
      })),
    [settlementPool],
  );

  const selectedSettlement = settlementPool.find(
    (item) => item.settlementDocId === settlementDocId,
  );

  const maxBalance = selectedSettlement
    ? editableBalanceForTarget(selectedSettlement, payments, row?.id)
    : 0;

  useEffect(() => {
    if (!open || !row) return;
    setCategory(row.category ?? "settlement");
    setDate(row.date);
    setType(row.type);
    setMethod(row.method);
    setAmount(String(row.amount));
    setSettlementDocId(paymentSettlementDocId(row));
    setCounterparty(row.counterparty);
    setAllocationSummary(
      row.allocationSummary === "-"
        ? ""
        : row.category === "misc"
          ? row.allocationSummary
          : localizeAllocationSummary(row.allocationSummary),
    );
    setMiscKind(row.miscKind ?? "other_expense");
    setSaved(false);
  }, [open, row]);

  function applySettlementTarget(docId: string) {
    setSettlementDocId(docId);
    if (!docId) {
      setAmount("");
      return;
    }
    const item = settlementPool.find((r) => r.settlementDocId === docId);
    if (!item) return;
    setType(item.lockedType);
    setCounterparty(item.customerName);
    const bal = editableBalanceForTarget(item, payments, row?.id);
    setAmount(String(bal));
  }

  function handleCategoryChange(next: PaymentCategory) {
    setCategory(next);
    if (next === "misc") {
      setSettlementDocId("");
      if (!miscKind) setMiscKind("other_expense");
    } else {
      setMiscKind("other_expense");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (!row) return;
    if (isMisc) {
      if (!miscKind) return;
    } else {
      if (!selectedSettlement) return;
      const payAmount = Number(amount) || 0;
      if (!isValidSettlementAmount(payAmount, maxBalance)) return;
    }

    const payAmount = Number(amount) || 0;
    const summary = isMisc
      ? allocationSummary || "-"
      : buildAllocationSummary(
          selectedSettlement!.settlementDocNo,
          payAmount,
          selectedSettlement!.amount,
        );

    updatePayment(row.id, {
      category,
      date,
      type: isMisc ? type : selectedSettlement!.lockedType,
      method,
      amount: payAmount,
      counterparty: isMisc ? counterparty : selectedSettlement!.customerName,
      allocationSummary: summary,
      ...(isMisc
        ? {
            miscKind,
            settlementDocId: undefined,
            settlementDocNo: undefined,
            contractNo: undefined,
          }
        : {
            settlementDocId: selectedSettlement!.settlementDocId,
            settlementDocNo: selectedSettlement!.settlementDocNo,
            contractNo: selectedSettlement!.contractNo,
            miscKind: undefined,
          }),
    });
    setSaved(true);
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
            {!readOnly ? (
              <button type="submit" form="payment-edit-form" className="ui-btn-primary">
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
        <form id="payment-edit-form" onSubmit={handleSubmit}>
          <FormSection title={isMisc ? t("form.sectionBasic") : undefined}>
            <FormFieldGrid>
              <FormField label={t("payments.colCategory")} required>
                <OptionField
                  value={category}
                  onChange={(v) => handleCategoryChange(v as PaymentCategory)}
                  options={categoryOptions}
                  disabled={readOnly}
                />
              </FormField>
              {isMisc ? (
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
                      value={miscKind}
                      onChange={(v) => setMiscKind(v as PaymentMiscKind)}
                      options={miscKindOptions}
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
                  <FormField label={t("common.type")}>
                    <div className="ui-form-readonly">
                      {type === "receipt" ? t("common.receipt") : t("common.payment")}
                    </div>
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
                      max={selectedSettlement ? maxBalance : undefined}
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
                  {selectedSettlement ? (
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
                    </FormFieldFull>
                  ) : null}
                </>
              )}
            </FormFieldGrid>
          </FormSection>
          {isMisc ? (
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
          {saved ? <p className="text-sm text-success">{t("common.saved")}</p> : null}
        </form>
      )}
    </Modal>
  );
}
