"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import {
  FormField,
  FormFieldFull,
  FormFieldGrid,
  FormSection,
  InputWithUnit,
  OptionField,
  TextInput,
} from "@/shared/ui/CrudUi";
import { formatMoney } from "@/shared/lib/format";
import { useMockStore } from "@/data/mock/store";
import { useMoneyUnits } from "@/shared/lib/use-money-units";
import { useI18n } from "@/shared/i18n";
import type { ArApItem, SettlementStatus } from "@/entities/types";

function ArApDetailForm({
  partyLabel,
  open,
  row,
}: {
  partyLabel: string;
  open: boolean;
  row: ArApItem;
}) {
  const { t } = useI18n();
  const moneyUnits = useMoneyUnits();
  const [settlementDocNo, setSettlementDocNo] = useState("");
  const [contractNo, setContractNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("0");
  const [settledAmount, setSettledAmount] = useState("0");
  const [status, setStatus] = useState<SettlementStatus>("open");
  const [date, setDate] = useState("");

  const statusOptions = useMemo(
    () => [
      { value: "open", label: t("status.open") },
      { value: "partial", label: t("status.partial") },
      { value: "settled", label: t("status.settled") },
      { value: "void", label: t("status.void") },
    ],
    [t],
  );

  useEffect(() => {
    if (!open || !row) return;
    setSettlementDocNo(row.settlementDocNo);
    setContractNo(row.contractNo ?? "");
    setCustomerName(row.customerName);
    setAmount(String(row.amount));
    setSettledAmount(String(row.settledAmount));
    setStatus(row.status);
    setDate(row.date);
  }, [open, row]);

  return (
    <FormSection>
      <FormFieldGrid>
        <FormField label={t("form.relatedSettlementDoc")}>
          <TextInput value={settlementDocNo} disabled onChange={() => {}} />
        </FormField>
        <FormField label={t("fields.contractNo")}>
          <TextInput value={contractNo || "—"} disabled onChange={() => {}} />
        </FormField>
        <FormField label={partyLabel}>
          <TextInput value={customerName} disabled onChange={() => {}} />
        </FormField>
        <FormField label={t("fields.arApDate")}>
          <TextInput value={date} disabled onChange={() => {}} />
        </FormField>
        <FormField label={t("fields.amount")}>
          <InputWithUnit
            type="number"
            step="0.01"
            value={amount}
            onChange={() => {}}
            unit={moneyUnits.money}
            disabled
          />
        </FormField>
        <FormField
          label={t("form.settledAmount")}
          hint={t("form.settledFromPayments")}
        >
          <InputWithUnit
            type="number"
            step="0.01"
            value={settledAmount}
            onChange={() => {}}
            unit={moneyUnits.money}
            disabled
          />
        </FormField>
        <FormFieldFull>
          <FormField label={t("common.status")} hint={t("form.settledFromPayments")}>
            <OptionField
              value={status}
              onChange={() => {}}
              options={statusOptions}
              disabled
            />
          </FormField>
        </FormFieldFull>
        <FormFieldFull>
          <p className="rounded-[8px] bg-chip px-3 py-2 text-sm text-muted">
            {t("form.balanceLabel")}
            <strong className="text-foreground">
              {formatMoney(
                Math.max(0, (Number(amount) || 0) - (Number(settledAmount) || 0)),
              )}
            </strong>
          </p>
        </FormFieldFull>
      </FormFieldGrid>
    </FormSection>
  );
}

export function ReceivableCreateModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
  preset?: { customerName?: string; settlementDocId?: string };
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("common.new")}
      size="lg"
      footer={
        <button type="button" className="ui-btn-secondary" onClick={onClose}>
          {t("common.close")}
        </button>
      }
    >
      <p className="text-sm text-muted">{t("form.arApAutoHint")}</p>
    </Modal>
  );
}

export function ReceivableDetailModal({
  open,
  onClose,
  id,
}: {
  open: boolean;
  onClose: () => void;
  id: string | null;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const { receivables } = useMockStore();
  const row = id ? receivables.find((r) => r.id === id) : undefined;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("form.receivableDetail")}
      size="lg"
      footer={
        <button type="button" className="ui-btn-secondary" onClick={onClose}>
          {t("common.close")}
        </button>
      }
    >
      {!row ? (
        <p className="text-sm text-muted">{t("common.notFoundHint")}</p>
      ) : (
        <ArApDetailForm partyLabel={t("menu.customers")} open={open} row={row} />
      )}
    </Modal>
  );
}

export function PayableCreateModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
  preset?: { customerName?: string; settlementDocId?: string };
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("common.new")}
      size="lg"
      footer={
        <button type="button" className="ui-btn-secondary" onClick={onClose}>
          {t("common.close")}
        </button>
      }
    >
      <p className="text-sm text-muted">{t("form.arApAutoHint")}</p>
    </Modal>
  );
}

export function PayableDetailModal({
  open,
  onClose,
  id,
}: {
  open: boolean;
  onClose: () => void;
  id: string | null;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const { payables } = useMockStore();
  const row = id ? payables.find((r) => r.id === id) : undefined;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("form.payableDetail")}
      size="lg"
      footer={
        <button type="button" className="ui-btn-secondary" onClick={onClose}>
          {t("common.close")}
        </button>
      }
    >
      {!row ? (
        <p className="text-sm text-muted">{t("common.notFoundHint")}</p>
      ) : (
        <ArApDetailForm partyLabel={t("form.supplier")} open={open} row={row} />
      )}
    </Modal>
  );
}
