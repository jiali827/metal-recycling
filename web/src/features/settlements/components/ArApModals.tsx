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
  SearchableSelect,
} from "@/shared/ui/CrudUi";
import { todayISO } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/format";
import { useMockStore } from "@/data/mock/store";
import { useMoneyUnits } from "@/shared/lib/use-money-units";
import { useI18n } from "@/shared/i18n";
import type { ArApItem, SettlementStatus, TicketDirection, WeighTicket } from "@/entities/types";

type ArApKind = "receivable" | "payable";

function ticketDirectionFor(kind: ArApKind): TicketDirection {
  return kind === "receivable" ? "sale" : "purchase";
}

function useWeighTicketOptions(
  kind: ArApKind,
  currentBxNo: string,
  excludeArApId?: string,
) {
  const { weighTickets, receivables, payables } = useMockStore();
  const direction = ticketDirectionFor(kind);

  return useMemo(() => {
    const arApList = kind === "receivable" ? receivables : payables;
    const usedBxNos = new Set(
      arApList
        .filter((item) => item.id !== excludeArApId)
        .map((item) => item.ticketBxNo)
        .filter(Boolean),
    );

    const eligible = weighTickets.filter(
      (ticket) =>
        ticket.direction === direction &&
        (ticket.status === "normal" || ticket.bxNo === currentBxNo) &&
        (!usedBxNos.has(ticket.bxNo) || ticket.bxNo === currentBxNo),
    );

    const options = eligible.map((ticket) => ({
      value: ticket.bxNo,
      label: `BX${ticket.bxNo} · ${ticket.customerName} · ${formatMoney(ticket.amount)}`,
    }));

    if (currentBxNo && !options.some((opt) => opt.value === currentBxNo)) {
      options.unshift({ value: currentBxNo, label: `BX${currentBxNo}` });
    }

    const byBxNo = new Map(eligible.map((ticket) => [ticket.bxNo, ticket]));
    return { options, byBxNo };
  }, [weighTickets, receivables, payables, kind, direction, currentBxNo, excludeArApId]);
}

function applyTicketDefaults(
  ticket: WeighTicket | undefined,
  setCustomerName: (name: string) => void,
  setAmount: (amount: string) => void,
  setDate?: (date: string) => void,
) {
  if (!ticket) return;
  setCustomerName(ticket.customerName);
  setAmount(String(ticket.amount));
  setDate?.(ticket.date.slice(0, 10) || todayISO());
}

function ArApCreateForm({
  formId,
  partyLabel,
  kind,
  open,
  onSubmit,
  preset,
}: {
  formId: string;
  partyLabel: string;
  kind: ArApKind;
  open: boolean;
  onSubmit: (payload: Omit<ArApItem, "id" | "createdAt" | "updatedAt">) => void;
  preset?: { customerName?: string; ticketBxNo?: string };
}) {
  const { t } = useI18n();
  const { customers, weighTickets } = useMockStore();
  const moneyUnits = useMoneyUnits();
  const [ticketBxNo, setTicketBxNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");
  const [settledAmount, setSettledAmount] = useState("");
  const [status, setStatus] = useState<SettlementStatus>("open");
  const [date, setDate] = useState("");

  const { options: ticketOptions, byBxNo } = useWeighTicketOptions(kind, ticketBxNo);

  const statusCreateOptions = useMemo(
    () => [
      { value: "open", label: t("status.open") },
      { value: "partial", label: t("status.partial") },
      { value: "settled", label: t("status.settled") },
    ],
    [t],
  );

  useEffect(() => {
    if (!open) return;
    const presetBx = preset?.ticketBxNo ?? "";
    const direction = ticketDirectionFor(kind);
    const ticket = presetBx
      ? weighTickets.find((row) => row.bxNo === presetBx && row.direction === direction)
      : undefined;

    setTicketBxNo(presetBx);
    setCustomerName("");
    setAmount("");
    setSettledAmount("");
    setStatus("open");
    setDate(todayISO());

    if (ticket) {
      applyTicketDefaults(ticket, setCustomerName, setAmount);
    } else if (preset?.customerName) {
      setCustomerName(preset.customerName);
    }
  }, [open, customers, preset, kind, weighTickets]);

  const linkedTicket = ticketBxNo ? byBxNo.get(ticketBxNo) : undefined;
  const ticketLinked = Boolean(ticketBxNo);

  const customerOptions = customers.map((c) => ({ value: c.name, label: c.name }));
  if (
    customerName &&
    !customers.some((c) => c.name === customerName)
  ) {
    customerOptions.push({ value: customerName, label: customerName });
  }

  function handleTicketChange(nextBxNo: string) {
    setTicketBxNo(nextBxNo);
    const ticket = byBxNo.get(nextBxNo);
    if (ticket) {
      applyTicketDefaults(ticket, setCustomerName, setAmount);
    } else {
      setCustomerName("");
      setAmount("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticketBxNo.trim() || !customerName.trim()) return;
    const amt = Number(amount) || 0;
    const settled = Number(settledAmount) || 0;
    onSubmit({
      ticketBxNo,
      customerName,
      amount: amt,
      settledAmount: settled,
      balance: Math.max(0, amt - settled),
      status,
      date,
    });
  }

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <FormSection title={t("form.sectionBasic")}>
        <FormFieldGrid>
          <FormField label={t("form.relatedTicket")} required>
            <SearchableSelect
              value={ticketBxNo}
              onChange={handleTicketChange}
              options={ticketOptions}
              placeholder={t("form.ticketSelectPlaceholder")}
              searchPlaceholder={t("form.ticketSearchPlaceholder")}
            />
          </FormField>
          <FormField label={t("fields.arApDate")} required>
            <DatePicker value={date} onChange={setDate} />
          </FormField>
          <FormField
            label={partyLabel}
            required
            hint={ticketLinked ? t("form.fromLinkedTicket") : undefined}
          >
            <SearchableSelect
              value={customerName}
              onChange={setCustomerName}
              options={customerOptions}
              disabled={ticketLinked}
              placeholder={
                ticketLinked
                  ? customerName || t("form.selectPlaceholder")
                  : t("form.selectTicketFirst")
              }
            />
          </FormField>
          <FormField
            label={t("fields.amount")}
            required
            hint={ticketLinked ? t("form.fromLinkedTicket") : undefined}
          >
            <InputWithUnit
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              unit={moneyUnits.money}
              disabled={ticketLinked}
              placeholder={ticketLinked ? undefined : t("form.selectTicketFirst")}
            />
          </FormField>
          <FormField label={t("form.settledAmount")}>
            <InputWithUnit
              type="number"
              step="0.01"
              value={settledAmount}
              onChange={(e) => setSettledAmount(e.target.value)}
              unit={moneyUnits.money}
            />
          </FormField>
          <FormFieldFull>
            <FormField label={t("common.status")}>
              <OptionField
                value={status}
                onChange={(v) => setStatus(v as SettlementStatus)}
                options={statusCreateOptions}
              />
            </FormField>
          </FormFieldFull>
          {linkedTicket ? (
            <FormFieldFull>
              <p className="rounded-[8px] bg-chip px-3 py-2 text-xs text-muted">
                {t("form.ticketSummary", {
                  no: `BX${linkedTicket.bxNo}`,
                  net: String(linkedTicket.netKg),
                  amount: formatMoney(linkedTicket.amount),
                })}
              </p>
            </FormFieldFull>
          ) : null}
        </FormFieldGrid>
      </FormSection>
    </form>
  );
}

function ArApEditForm({
  formId,
  partyLabel,
  kind,
  open,
  row,
  onSave,
}: {
  formId: string;
  partyLabel: string;
  kind: ArApKind;
  open: boolean;
  row: ArApItem;
  onSave: (patch: Partial<ArApItem>) => void;
}) {
  const { t } = useI18n();
  const { customers } = useMockStore();
  const moneyUnits = useMoneyUnits();
  const [ticketBxNo, setTicketBxNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("0");
  const [settledAmount, setSettledAmount] = useState("0");
  const [status, setStatus] = useState<SettlementStatus>("open");
  const [date, setDate] = useState("");
  const [saved, setSaved] = useState(false);

  const { options: ticketOptions, byBxNo } = useWeighTicketOptions(
    kind,
    ticketBxNo,
    row.id,
  );

  const statusEditOptions = useMemo(
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
    setTicketBxNo(row.ticketBxNo);
    setCustomerName(row.customerName);
    setAmount(String(row.amount));
    setSettledAmount(String(row.settledAmount));
    setStatus(row.status);
    setDate(row.date);
    setSaved(false);
  }, [open, row]);

  const customerOptions = customers.map((c) => ({ value: c.name, label: c.name }));
  if (customerName && !customers.some((c) => c.name === customerName)) {
    customerOptions.push({ value: customerName, label: customerName });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticketBxNo.trim() || !customerName.trim()) return;
    const amt = Number(amount) || 0;
    const settled = Number(settledAmount) || 0;
    onSave({
      ticketBxNo,
      customerName,
      amount: amt,
      settledAmount: settled,
      balance: Math.max(0, amt - settled),
      status,
      date,
    });
    setSaved(true);
  }

  const linkedTicket = ticketBxNo ? byBxNo.get(ticketBxNo) : undefined;

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <FormSection title={t("form.sectionBasic")}>
        <FormFieldGrid>
          <FormField label={t("form.relatedTicket")} required>
            <SearchableSelect
              value={ticketBxNo}
              onChange={() => {}}
              options={ticketOptions}
              placeholder={t("form.ticketSelectPlaceholder")}
              searchPlaceholder={t("form.ticketSearchPlaceholder")}
              disabled
            />
          </FormField>
          <FormField label={t("fields.arApDate")} required>
            <DatePicker value={date} onChange={setDate} />
          </FormField>
          <FormField
            label={partyLabel}
            required
            hint={t("form.fromLinkedTicket")}
          >
            <SearchableSelect
              value={customerName}
              onChange={setCustomerName}
              options={customerOptions}
              disabled
            />
          </FormField>
          <FormField
            label={t("fields.amount")}
            required
            hint={t("form.fromLinkedTicket")}
          >
            <InputWithUnit
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
                options={statusEditOptions}
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
          {linkedTicket ? (
            <FormFieldFull>
              <p className="rounded-[8px] bg-chip px-3 py-2 text-xs text-muted">
                {t("form.ticketSummary", {
                  no: `BX${linkedTicket.bxNo}`,
                  net: String(linkedTicket.netKg),
                  amount: formatMoney(linkedTicket.amount),
                })}
              </p>
            </FormFieldFull>
          ) : null}
        </FormFieldGrid>
      </FormSection>
      {saved ? <p className="text-sm text-success">{t("common.saved")}</p> : null}
    </form>
  );
}

export function ReceivableCreateModal({
  open,
  onClose,
  onCreated,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
  preset?: { customerName?: string; ticketBxNo?: string };
}) {
  const { t } = useI18n();
  const { addReceivable } = useMockStore();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("common.new")}
      size="lg"
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="receivable-create-form" className="ui-btn-primary">
            {t("common.save")}
          </button>
        </>
      }
    >
      <ArApCreateForm
        formId="receivable-create-form"
        partyLabel={t("menu.customers")}
        kind="receivable"
        open={open}
        preset={preset}
        onSubmit={(payload) => {
          const row = addReceivable(payload);
          onCreated?.(row.id);
          onClose();
        }}
      />
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
}) {
  const { t } = useI18n();
  const { receivables, updateReceivable } = useMockStore();
  const row = id ? receivables.find((r) => r.id === id) : undefined;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={row ? `${t("form.receivableDetail")} · BX${row.ticketBxNo}` : t("form.receivableDetail")}
      size="lg"
      footer={
        row ? (
          <>
            <button type="button" className="ui-btn-secondary" onClick={onClose}>
              {t("common.close")}
            </button>
            <button type="submit" form="receivable-edit-form" className="ui-btn-primary">
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
        <ArApEditForm
          formId="receivable-edit-form"
          partyLabel={t("menu.customers")}
          kind="receivable"
          open={open}
          row={row}
          onSave={(patch) => updateReceivable(row.id, patch)}
        />
      )}
    </Modal>
  );
}

export function PayableCreateModal({
  open,
  onClose,
  onCreated,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
  preset?: { customerName?: string; ticketBxNo?: string };
}) {
  const { t } = useI18n();
  const { addPayable } = useMockStore();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("common.new")}
      size="lg"
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="payable-create-form" className="ui-btn-primary">
            {t("common.save")}
          </button>
        </>
      }
    >
      <ArApCreateForm
        formId="payable-create-form"
        partyLabel={t("form.supplier")}
        kind="payable"
        open={open}
        preset={preset}
        onSubmit={(payload) => {
          const row = addPayable(payload);
          onCreated?.(row.id);
          onClose();
        }}
      />
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
}) {
  const { t } = useI18n();
  const { payables, updatePayable } = useMockStore();
  const row = id ? payables.find((r) => r.id === id) : undefined;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={row ? `${t("form.payableDetail")} · BX${row.ticketBxNo}` : t("form.payableDetail")}
      size="lg"
      footer={
        row ? (
          <>
            <button type="button" className="ui-btn-secondary" onClick={onClose}>
              {t("common.close")}
            </button>
            <button type="submit" form="payable-edit-form" className="ui-btn-primary">
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
        <ArApEditForm
          formId="payable-edit-form"
          partyLabel={t("form.supplier")}
          kind="payable"
          open={open}
          row={row}
          onSave={(patch) => updatePayable(row.id, patch)}
        />
      )}
    </Modal>
  );
}
