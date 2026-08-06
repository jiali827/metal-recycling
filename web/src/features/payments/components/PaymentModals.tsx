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
  paymentTicketBxNo,
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
  PaymentType,
} from "@/entities/types";

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
  return `BX${item.ticketBxNo} · ${item.customerName} · ${formatMoney(item.balance)}`;
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
    counterparty?: string;
    type?: PaymentType;
    category?: PaymentCategory;
    ticketBxNo?: string;
  };
}) {
  const { t } = useI18n();
  const { addPayment, customers, receivables, payables } = useMockStore();
  const moneyUnits = useMoneyUnits();
  const { categoryOptions, typeOptions, methodOptions, miscKindOptions } =
    usePaymentFormOptions(t);

  const [category, setCategory] = useState<PaymentCategory>("settlement");
  const [type, setType] = useState<PaymentType>("receipt");
  const [method, setMethod] = useState("現金");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [ticketBxNo, setTicketBxNo] = useState("");
  const [allocationSummary, setAllocationSummary] = useState("");
  const [miscKind, setMiscKind] = useState<PaymentMiscKind>("other_expense");

  const isMisc = category === "misc";

  const openSettlements = useMemo(() => {
    const list = type === "receipt" ? receivables : payables;
    return list.filter(
      (item) => item.status === "open" || item.status === "partial",
    );
  }, [type, receivables, payables]);

  const settlementOptions = useMemo(
    () =>
      openSettlements.map((item) => ({
        value: item.ticketBxNo,
        label: arApOptionLabel(item),
      })),
    [openSettlements],
  );

  const selectedSettlement = openSettlements.find(
    (item) => item.ticketBxNo === ticketBxNo,
  );

  useEffect(() => {
    if (!open) return;
    const initialCategory = preset?.category ?? "settlement";
    const initialMiscKind: PaymentMiscKind = "other_expense";
    const initialType =
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

    const presetBx = preset?.ticketBxNo ?? "";
    setTicketBxNo(presetBx);
    if (initialCategory !== "misc" && presetBx) {
      const pool = initialType === "receipt" ? receivables : payables;
      const item = pool.find((row) => row.ticketBxNo === presetBx);
      setCounterparty(item?.customerName ?? preset?.counterparty ?? "");
      setAmount(item ? String(item.balance) : "");
    } else {
      setCounterparty(preset?.counterparty ?? "");
      setAmount("");
    }
  }, [open, preset, receivables, payables]);

  function handleCategoryChange(next: PaymentCategory) {
    setCategory(next);
    setTicketBxNo("");
    setAllocationSummary("");
    setAmount("");
    if (next === "misc") {
      const kind: PaymentMiscKind = "other_expense";
      setMiscKind(kind);
      setType(defaultTypeForMiscKind(kind));
      setCounterparty("");
    } else {
      setType(preset?.type ?? "receipt");
      setCounterparty(preset?.counterparty ?? "");
    }
  }

  function handleTypeChange(next: PaymentType) {
    setType(next);
    if (!isMisc) {
      setTicketBxNo("");
      setAmount("");
      if (!preset?.counterparty) setCounterparty("");
    }
  }

  function handleTicketChange(bxNo: string) {
    setTicketBxNo(bxNo);
    const item = openSettlements.find((row) => row.ticketBxNo === bxNo);
    if (item) {
      setCounterparty(item.customerName);
      setAmount(String(item.balance));
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
    } else if (!ticketBxNo.trim()) {
      return;
    }

    const payAmount = Number(amount) || 0;
    const summary = isMisc
      ? allocationSummary || "-"
      : buildAllocationSummary(
          ticketBxNo,
          payAmount,
          selectedSettlement?.amount ?? payAmount,
        );

    const row = addPayment({
      date,
      category,
      type,
      method,
      amount: payAmount,
      counterparty,
      allocationSummary: summary,
      ...(isMisc
        ? { miscKind, ticketBxNo: undefined }
        : { ticketBxNo, miscKind: undefined }),
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
            <FormField label={t("common.type")}>
              <OptionField
                value={type}
                onChange={(v) => handleTypeChange(v as PaymentType)}
                options={typeOptions}
              />
            </FormField>
            <FormField label={t("fields.paymentDateTime")} required>
              <DateTimePicker value={date} onChange={setDate} />
            </FormField>
            {isMisc ? (
              <>
                <FormField label={t("form.miscKind")} required>
                  <Select
                    value={miscKind}
                    onChange={(v) => handleMiscKindChange(v as PaymentMiscKind)}
                    options={miscKindOptions}
                  />
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
              </>
            ) : (
              <>
                <FormField label={t("form.relatedTicket")} required>
                  <SearchableSelect
                    value={ticketBxNo}
                    onChange={handleTicketChange}
                    options={settlementOptions}
                    placeholder={t("form.settleSelectPlaceholder")}
                    searchPlaceholder={t("form.ticketSearchPlaceholder")}
                  />
                </FormField>
                <FormField label={t("form.party")} required>
                  <SearchableSelect
                    value={counterparty}
                    onChange={setCounterparty}
                    options={customers.map((c) => ({
                      value: c.name,
                      label: c.name,
                    }))}
                    disabled={Boolean(ticketBxNo)}
                  />
                </FormField>
              </>
            )}
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
            <FormField label={t("form.method")}>
              <OptionField value={method} onChange={setMethod} options={methodOptions} />
            </FormField>
            {!isMisc && selectedSettlement ? (
              <FormFieldFull>
                <p className="rounded-[8px] bg-chip px-3 py-2 text-xs text-muted">
                  {t("form.settleBalanceHint", {
                    balance: formatMoney(selectedSettlement.balance),
                    amount: formatMoney(selectedSettlement.amount),
                  })}
                </p>
              </FormFieldFull>
            ) : null}
          </FormFieldGrid>
        </FormSection>
        {isMisc ? (
          <FormSection title={t("form.sectionOptional")}>
            <FormField label={t("form.miscRemark")}>
              <input
                className={inputClass}
                value={allocationSummary}
                onChange={(e) => setAllocationSummary(e.target.value)}
                placeholder={t("form.miscRemarkPlaceholder")}
              />
            </FormField>
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
}: {
  open: boolean;
  onClose: () => void;
  id: string | null;
}) {
  const { t } = useI18n();
  const { payments, customers, receivables, payables, updatePayment } = useMockStore();
  const moneyUnits = useMoneyUnits();
  const { categoryOptions, typeOptions, methodOptions, miscKindOptions } =
    usePaymentFormOptions(t);
  const row = id ? payments.find((p) => p.id === id) : undefined;

  const [category, setCategory] = useState<PaymentCategory>("settlement");
  const [date, setDate] = useState("");
  const [type, setType] = useState<PaymentType>("receipt");
  const [method, setMethod] = useState("現金");
  const [amount, setAmount] = useState("0");
  const [counterparty, setCounterparty] = useState("");
  const [ticketBxNo, setTicketBxNo] = useState("");
  const [allocationSummary, setAllocationSummary] = useState("");
  const [miscKind, setMiscKind] = useState<PaymentMiscKind>("other_expense");
  const [saved, setSaved] = useState(false);

  const isMisc = category === "misc";

  const settlementPool = useMemo(() => {
    const list = type === "receipt" ? receivables : payables;
    return list.filter(
      (item) =>
        item.status === "open" ||
        item.status === "partial" ||
        item.status === "settled" ||
        item.ticketBxNo === ticketBxNo,
    );
  }, [type, receivables, payables, ticketBxNo]);

  const settlementOptions = useMemo(
    () =>
      settlementPool.map((item) => ({
        value: item.ticketBxNo,
        label: arApOptionLabel(item),
      })),
    [settlementPool],
  );

  const selectedSettlement = settlementPool.find(
    (item) => item.ticketBxNo === ticketBxNo,
  );

  useEffect(() => {
    if (!open || !row) return;
    setCategory(row.category ?? "settlement");
    setDate(row.date);
    setType(row.type);
    setMethod(row.method);
    setAmount(String(row.amount));
    setCounterparty(row.counterparty);
    setTicketBxNo(paymentTicketBxNo(row));
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

  function handleCategoryChange(next: PaymentCategory) {
    setCategory(next);
    if (next === "misc") {
      setTicketBxNo("");
      if (!miscKind) setMiscKind("other_expense");
    } else {
      setMiscKind("other_expense");
    }
  }

  function handleTicketChange(bxNo: string) {
    setTicketBxNo(bxNo);
    const item = settlementPool.find((r) => r.ticketBxNo === bxNo);
    if (item) setCounterparty(item.customerName);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    if (isMisc) {
      if (!miscKind) return;
    } else if (!ticketBxNo.trim()) {
      return;
    }

    const payAmount = Number(amount) || 0;
    const summary = isMisc
      ? allocationSummary || "-"
      : buildAllocationSummary(
          ticketBxNo,
          payAmount,
          selectedSettlement?.amount ?? payAmount,
        );

    updatePayment(row.id, {
      category,
      date,
      type,
      method,
      amount: payAmount,
      counterparty,
      allocationSummary: summary,
      ...(isMisc
        ? { miscKind, ticketBxNo: undefined }
        : { ticketBxNo, miscKind: undefined }),
    });
    setSaved(true);
  }

  const partyOptions = customers.map((c) => ({ value: c.name, label: c.name }));
  if (counterparty && !customers.some((c) => c.name === counterparty)) {
    partyOptions.push({ value: counterparty, label: counterparty });
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
            <button type="submit" form="payment-edit-form" className="ui-btn-primary">
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
        <form id="payment-edit-form" onSubmit={handleSubmit}>
          <FormSection title={isMisc ? t("form.sectionBasic") : undefined}>
            <FormFieldGrid>
              <FormField label={t("payments.colCategory")} required>
                <OptionField
                  value={category}
                  onChange={(v) => handleCategoryChange(v as PaymentCategory)}
                  options={categoryOptions}
                />
              </FormField>
              <FormField label={t("common.type")}>
                <OptionField
                  value={type}
                  onChange={(v) => setType(v as PaymentType)}
                  options={typeOptions}
                />
              </FormField>
              <FormField label={t("fields.paymentDateTime")} required>
                <DateTimePicker value={date} onChange={setDate} />
              </FormField>
              {isMisc ? (
                <>
                  <FormField label={t("form.miscKind")} required>
                    <Select
                      value={miscKind}
                      onChange={(v) => setMiscKind(v as PaymentMiscKind)}
                      options={miscKindOptions}
                    />
                  </FormField>
                  <FormField label={t("form.partyMisc")} required>
                    <input
                      className={inputClass}
                      required
                      value={counterparty}
                      onChange={(e) => setCounterparty(e.target.value)}
                    />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label={t("form.relatedTicket")} required>
                    <SearchableSelect
                      value={ticketBxNo}
                      onChange={handleTicketChange}
                      options={settlementOptions}
                      placeholder={t("form.settleSelectPlaceholder")}
                      searchPlaceholder={t("form.ticketSearchPlaceholder")}
                    />
                  </FormField>
                  <FormField label={t("form.party")} required>
                    <SearchableSelect
                      value={counterparty}
                      onChange={setCounterparty}
                      options={partyOptions}
                      disabled={Boolean(ticketBxNo)}
                    />
                  </FormField>
                </>
              )}
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
              <FormField label={t("form.method")}>
                <OptionField value={method} onChange={setMethod} options={methodOptions} />
              </FormField>
            </FormFieldGrid>
          </FormSection>
          {isMisc ? (
            <FormSection title={t("form.sectionOptional")}>
              <FormField label={t("form.miscRemark")}>
                <input
                  className={inputClass}
                  value={allocationSummary}
                  onChange={(e) => setAllocationSummary(e.target.value)}
                />
              </FormField>
            </FormSection>
          ) : null}
          {saved ? <p className="text-sm text-success">{t("common.saved")}</p> : null}
        </form>
      )}
    </Modal>
  );
}
