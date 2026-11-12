"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import {
  DatePicker,
  DateRangePicker,
  FormField,
  FormFieldGrid,
  FormSection,
  SearchableSelect,
} from "@/shared/ui/CrudUi";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { useMockStore } from "@/data/mock/store";
import { useI18n } from "@/shared/i18n";
import { formatKg, formatMoney } from "@/shared/lib/format";
import { formatWeighDateTime, todayISO } from "@/shared/lib/date";
import {
  buildSettlementDocInput,
  listEligibleContracts,
  listEligibleTickets,
  resolveContractFromTickets,
  usedTicketIdsFromDocs,
  type BuildSettlementError,
} from "@/entities/settlement-doc";
import { TablePagination } from "@/shared/ui/TablePagination";
import type { WeighSettlementDoc, WeighSettlementKind } from "@/entities/types";

const TICKET_PAGE_SIZE = 10;

export function SettlementDocCreateModal({
  open,
  onClose,
  onCreated,
  onSaved,
  initialKind = "purchase",
  editingDoc = null,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string, opts?: { preview?: boolean }) => void;
  /** 编辑保存；preview 为 true 时跳转预览打印页 */
  onSaved?: (id: string, opts?: { preview?: boolean }) => void;
  initialKind?: WeighSettlementKind;
  editingDoc?: WeighSettlementDoc | null;
}) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const isEdit = Boolean(editingDoc);
  const {
    weighTickets,
    purchaseContracts,
    saleContracts,
    weighSettlementDocs,
    addWeighSettlementDoc,
    updateWeighSettlementDoc,
    confirmWeighSettlementDoc,
  } = useMockStore();

  useEffect(() => {
    if (open && editingDoc?.status === "confirmed") {
      onClose();
    }
  }, [open, editingDoc, onClose]);

  const [kind, setKind] = useState<WeighSettlementKind>(
    editingDoc?.kind ?? initialKind,
  );
  const [contractId, setContractId] = useState(editingDoc?.contractId ?? "");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    editingDoc?.ticketIds ?? [],
  );
  const [docDate, setDocDate] = useState(editingDoc?.docDate ?? todayISO());
  const [ticketPage, setTicketPage] = useState(1);

  const usedTicketIds = useMemo(
    () =>
      usedTicketIdsFromDocs(
        weighSettlementDocs,
        editingDoc?.ticketIds,
      ),
    [weighSettlementDocs, editingDoc],
  );

  const contractOptions = useMemo(() => {
    const list = listEligibleContracts({
      kind,
      purchaseContracts,
      saleContracts,
      tickets: weighTickets,
      usedTicketIds,
    });
    const options = list.map((c) => ({
      value: c.id,
      label: `${c.no} · ${c.customerName}`,
    }));
    // 编辑时确保当前合同仍可选（即使暂无可新增磅单）
    if (
      editingDoc &&
      editingDoc.kind === kind &&
      editingDoc.contractId &&
      !options.some((o) => o.value === editingDoc.contractId)
    ) {
      options.unshift({
        value: editingDoc.contractId,
        label: `${editingDoc.contractNo} · ${editingDoc.customerName}`,
      });
    }
    return options;
  }, [
    kind,
    purchaseContracts,
    saleContracts,
    weighTickets,
    usedTicketIds,
    editingDoc,
  ]);

  const selectedContract = useMemo(() => {
    if (!contractId) return null;
    if (kind === "purchase") {
      const c = purchaseContracts.find((row) => row.id === contractId);
      return c
        ? { id: c.id, no: c.no, customerName: c.customerName }
        : editingDoc?.contractId === contractId
          ? {
              id: editingDoc.contractId,
              no: editingDoc.contractNo,
              customerName: editingDoc.customerName,
            }
          : null;
    }
    const c = saleContracts.find((row) => row.id === contractId);
    return c
      ? { id: c.id, no: c.no, customerName: c.customerName }
      : editingDoc?.contractId === contractId
        ? {
            id: editingDoc.contractId,
            no: editingDoc.contractNo,
            customerName: editingDoc.customerName,
          }
        : null;
  }, [contractId, kind, purchaseContracts, saleContracts, editingDoc]);

  const eligibleTickets = useMemo(() => {
    return listEligibleTickets({
      tickets: weighTickets,
      kind,
      contract: selectedContract,
      usedTicketIds,
      dateStart: dateStart || undefined,
      dateEnd: dateEnd || undefined,
    });
  }, [
    selectedContract,
    weighTickets,
    kind,
    usedTicketIds,
    dateStart,
    dateEnd,
  ]);

  const ticketTotalPages = Math.max(
    1,
    Math.ceil(eligibleTickets.length / TICKET_PAGE_SIZE),
  );

  const pageTickets = useMemo(() => {
    const start = (ticketPage - 1) * TICKET_PAGE_SIZE;
    return eligibleTickets.slice(start, start + TICKET_PAGE_SIZE);
  }, [eligibleTickets, ticketPage]);

  const selectedTickets = useMemo(
    () => eligibleTickets.filter((row) => selectedIds.includes(row.id)),
    [eligibleTickets, selectedIds],
  );

  const allChecked =
    eligibleTickets.length > 0 &&
    eligibleTickets.every((row) => selectedIds.includes(row.id));

  const totalNetKg = selectedTickets.reduce((s, r) => s + r.netKg, 0);
  const totalAmount = selectedTickets.reduce((s, r) => s + r.amount, 0);

  useEffect(() => {
    if (!open) return;
    if (editingDoc) {
      setKind(editingDoc.kind);
      setContractId(editingDoc.contractId);
      setSelectedIds([...editingDoc.ticketIds]);
      setDocDate(editingDoc.docDate);
    } else {
      setKind(initialKind);
      setContractId("");
      setSelectedIds([]);
      setDocDate(todayISO());
    }
    setDateStart("");
    setDateEnd("");
    setTicketPage(1);
  }, [open, initialKind, editingDoc]);

  useEffect(() => {
    if (ticketPage > ticketTotalPages) setTicketPage(ticketTotalPages);
  }, [ticketPage, ticketTotalPages]);

  function settlementErrorText(error: BuildSettlementError) {
    if (error === "empty") return t("settlementDocs.errEmpty");
    if (error === "mixed_direction") return t("settlementDocs.errMixedDirection");
    if (error === "mixed_customer") return t("settlementDocs.errMixedCustomer");
    if (error === "has_void") return t("settlementDocs.errHasVoid");
    if (error === "already_used") return t("settlementDocs.errAlreadyUsed");
    if (error === "mixed_contract") return t("settlementDocs.errMixedContract");
    if (error === "unlinked_ticket") return t("settlementDocs.errUnlinkedTicket");
    if (error === "kind_mismatch") return t("settlementDocs.errKindMismatch");
    return t("settlementDocs.errEmpty");
  }

  function handleContractChange(next: string) {
    setContractId(next);
    setSelectedIds([]);
    setTicketPage(1);
  }

  function handleDateRangeChange(start: string, end: string) {
    setDateStart(start);
    setDateEnd(end);
    setSelectedIds([]);
    setTicketPage(1);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleSelectAll() {
    if (allChecked) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(eligibleTickets.map((r) => r.id));
  }

  async function commit(mode: "save" | "confirm" | "preview") {
    if (editingDoc?.status === "confirmed") return;
    if (selectedTickets.length === 0) {
      await confirm({
        alert: true,
        message: t("settlementDocs.errNoTickets"),
      });
      return;
    }
    const contractForSave =
      selectedContract ??
      resolveContractFromTickets(
        selectedTickets,
        kind,
        purchaseContracts,
        saleContracts,
      );
    if (!contractForSave) {
      await confirm({
        alert: true,
        message: t("settlementDocs.errNoContract"),
      });
      return;
    }
    const built = buildSettlementDocInput(selectedTickets, {
      docDate,
      existing: weighSettlementDocs.filter((d) => d.id !== editingDoc?.id),
      usedTicketIds,
      kind,
      contract: contractForSave,
      preserve: editingDoc
        ? { no: editingDoc.no, status: editingDoc.status }
        : undefined,
    });
    if (!built.ok) {
      await confirm({
        alert: true,
        message: settlementErrorText(built.error),
      });
      return;
    }
    let savedId: string;
    if (editingDoc) {
      updateWeighSettlementDoc(editingDoc.id, built.input);
      savedId = editingDoc.id;
    } else {
      const row = addWeighSettlementDoc(built.input);
      savedId = row.id;
    }
    if (mode === "confirm") {
      const ok = await confirm({ title: "确认结算单", message: "确认后结算单将锁定，并生成应收/应付。后续修改只能走纠错删除。", confirmLabel: "确认并生成应收/应付" });
      if (ok) confirmWeighSettlementDoc(savedId);
    }
    if (editingDoc) onSaved?.(savedId, { preview: mode === "preview" });
    else onCreated?.(savedId, { preview: mode === "preview" });
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await commit("save");
  }

  const title =
    kind === "purchase"
      ? isEdit
        ? t("settlementDocs.editPurchaseTitle")
        : t("settlementDocs.createPurchaseTitle")
      : isEdit
        ? t("settlementDocs.editSaleTitle")
        : t("settlementDocs.createSaleTitle");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="2xl"
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="ui-btn-secondary"
            onClick={() => void commit("save")}
          >
            {t("settlementDocs.confirmSave")}
          </button>
          <button
            type="button"
            className="ui-btn-primary"
            onClick={() => void commit("confirm")}
          >
            确认并生成应收/应付
          </button>
        </>
      }
    >
      <form
        id="settlement-doc-create-form"
        className="space-y-4"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <FormSection title={t("form.sectionBasic")}>
          <FormFieldGrid>
            <FormField label={t("common.date")} required>
              <DatePicker value={docDate} onChange={setDocDate} />
            </FormField>
          </FormFieldGrid>
        </FormSection>

        <FormSection title={t("settlementDocs.pickTickets")}>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <div className="flex min-w-[220px] flex-col gap-1 text-xs text-muted">
              <span>{t("settlementDocs.pickContract")}</span>
              <SearchableSelect
                size="sm"
                value={contractId}
                onChange={handleContractChange}
                options={contractOptions}
                placeholder={t("common.all")}
                searchPlaceholder={t("settlementDocs.pickContract")}
                allowClear
                clearValue=""
              />
            </div>
            <div className="flex min-w-[220px] flex-col gap-1 text-xs text-muted">
              <span>{t("fields.weighDateRange")}</span>
              <DateRangePicker
                size="sm"
                start={dateStart}
                end={dateEnd}
                onChange={handleDateRangeChange}
                className="min-w-[220px]"
                aria-label={t("fields.weighDateRange")}
              />
            </div>
          </div>
          {eligibleTickets.length === 0 ? (
            <p className="text-sm text-muted">
              {dateStart || dateEnd || contractId
                ? t("settlementDocs.eligibleEmptyFiltered")
                : t("settlementDocs.eligibleEmpty")}
            </p>
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-control)] border border-border">
              <div className="flex items-center justify-between gap-2 border-b border-border bg-chip px-3 py-2">
                <label className="inline-flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--brand)]"
                    checked={allChecked}
                    onChange={toggleSelectAll}
                  />
                  {t("settlementDocs.selectAllEligible")}
                </label>
                <span className="text-xs text-muted">
                  {t("settlementDocs.selectedCount").replace(
                    "{count}",
                    String(selectedIds.length),
                  )}
                </span>
              </div>
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-chip text-left text-xs text-muted">
                    <th className="px-3 py-2 font-semibold w-10" />
                    <th className="px-3 py-2 font-semibold">
                      {t("settlementDocs.colBx")}
                    </th>
                    <th className="px-3 py-2 font-semibold">
                      {t("fields.weighDateTime")}
                    </th>
                    <th className="px-3 py-2 font-semibold">
                      {t("fields.plate")}
                    </th>
                    <th className="px-3 py-2 font-semibold">
                      {t("settlementDocs.colMaterial")}
                    </th>
                    <th className="px-3 py-2 font-semibold text-right">
                      {t("fields.net")}
                    </th>
                    <th className="px-3 py-2 font-semibold text-right">
                      {t("fields.amount")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageTickets.map((row) => {
                    const checked = selectedIds.includes(row.id);
                    return (
                      <tr
                        key={row.id}
                        className={`border-t border-border cursor-pointer transition-colors${checked ? " bg-brand-soft/40" : " hover:bg-chip/80"}`}
                        onClick={() => toggleSelect(row.id)}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[var(--brand)]"
                            checked={checked}
                            onChange={() => toggleSelect(row.id)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={row.bxNo}
                          />
                        </td>
                        <td className="px-3 py-2 tabular-nums font-medium">
                          {row.bxNo}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {formatWeighDateTime(row.date)}
                        </td>
                        <td className="px-3 py-2">{row.plate}</td>
                        <td className="px-3 py-2">{row.materialSummary}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatKg(row.netKg)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMoney(row.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {eligibleTickets.length > TICKET_PAGE_SIZE ? (
                <TablePagination
                  variant="compact"
                  className="border-t border-border"
                  total={eligibleTickets.length}
                  page={ticketPage}
                  pageSize={TICKET_PAGE_SIZE}
                  onPageChange={setTicketPage}
                  onPageSizeChange={() => {}}
                  pageSizeOptions={[TICKET_PAGE_SIZE]}
                />
              ) : null}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
            <span>
              {t("settlementDocs.summarySelected").replace(
                "{count}",
                String(selectedTickets.length),
              )}
            </span>
            <span>
              {t("settlementDocs.totalNet")} {formatKg(totalNetKg)}
            </span>
            <span>
              {t("settlementDocs.totalAmount")} {formatMoney(totalAmount)}
            </span>
          </div>
        </FormSection>
      </form>
    </Modal>
  );
}
