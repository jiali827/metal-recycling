"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import { Checkbox } from "@/shared/ui/forms/Checkbox";
import { useMockStore } from "@/data/mock/store";
import { useAuth } from "@/features/auth/provider";
import { useI18n } from "@/shared/i18n";
import { buildLinkedNav, type LinkedNav } from "@/entities/correction/navigate";
import type { CorrectionImpact } from "@/entities/correction/reverse";
import type { CorrectionTarget } from "@/entities/correction/reverse";

const actionLabel: Record<string, string> = {
  reverse_payment: "冲销核销（保留收付款）",
  restore_arap: "恢复往来余额",
  revoke_settlement: "撤销结算确认",
  void_ticket: "作废过磅台账",
  revoke_contract: "撤销合同确认",
};

export function CorrectionDeleteModal({
  open,
  target,
  label,
  onClose,
  onCompleted,
}: {
  open: boolean;
  target: CorrectionTarget | null;
  label: string;
  onClose: () => void;
  onCompleted?: () => void;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const {
    previewCorrection,
    forceCorrection,
    weighTickets,
    purchaseContracts,
    saleContracts,
    weighSettlementDocs,
    payments,
  } = useMockStore();

  const linkedNavData = { weighTickets, purchaseContracts, saleContracts, weighSettlementDocs, payments };

  const [impact, setImpact] = useState<CorrectionImpact | null>(null);
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !target) return;
    setImpact(previewCorrection(target));
    setReason("");
    setAck(false);
    setError("");
  }, [open, target, previewCorrection]);

  const close = useCallback(() => {
    setImpact(null);
    onClose();
  }, [onClose]);

  const handleLinkedClick = useCallback(
    (nav: LinkedNav) => {
      const qs = new URLSearchParams({ [nav.queryParam]: nav.filterValue });
      window.open(`${nav.route}?${qs.toString()}`, "_blank", "noopener,noreferrer");
    },
    [],
  );

  function submit() {
    if (!target || !impact) return;
    if (!user?.roleIds.includes("admin")) {
      setError("只有超级管理员可以执行已确认数据的纠错删除");
      return;
    }
    if (!ack) {
      setError("请先确认已了解影响范围");
      return;
    }
    if (!reason.trim()) {
      setError("请填写纠错原因");
      return;
    }
    try {
      forceCorrection(target, reason, user?.name);
      onCompleted?.();
      close();
    } catch (e) {
      setError(e instanceof Error && e.message === "INVALID_REASON" ? "请填写纠错原因" : "纠错处理失败，请刷新预览后重试");
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={`纠错删除：${label}`}
      size="lg"
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={close}>{t("common.cancel")}</button>
          <button type="button" className="ui-btn-danger" onClick={submit}>确认纠错删除</button>
        </>
      }
    >
      {impact ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            这是可追溯的纠错操作，不会静默删除已确认业务记录。收付款只冲销核销关系，不代表现金已退款。
            结算单关联的应收/应付记录会随结算单自动失效。
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Impact label="过磅" value={impact.summary.tickets} />
            <Impact label="结算单" value={impact.summary.settlementDocs} />
            <Impact label="应收/应付" value={impact.summary.arApItems} />
            <Impact label="收付款" value={impact.summary.payments} />
          </div>
          <div className="rounded-lg border border-border">
            {impact.actions.filter((action) => action.action !== "void_arap" && action.action !== "restore_arap").length === 0 ? (
              <p className="p-4 text-sm text-muted">无关联数据，将只处理当前记录。</p>
            ) : (
              impact.actions
                .filter((action) => action.action !== "void_arap" && action.action !== "restore_arap")
                .map((action) => {
                  const nav = buildLinkedNav(action, linkedNavData);
                  if (!nav) return null;
                  return (
                    <button
                      key={`${action.objectType}-${action.objectId}`}
                      type="button"
                      onClick={() => handleLinkedClick(nav)}
                      className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-2 text-left text-sm last:border-0 transition-colors hover:bg-brand/5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{action.label}</span>
                        <span className="block text-xs text-muted">{actionLabel[action.action]}</span>
                      </span>
                      <span className="shrink-0 self-center text-muted" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                      </span>
                    </button>
                  );
                })
            )}
          </div>
          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3">
            <Checkbox
              checked={ack}
              onChange={setAck}
              label="我已了解上述影响范围，并确认执行纠错删除。"
            />
            <label className="block text-sm">
              <span className="mb-1 block font-medium">纠错原因 <span className="text-danger">*</span></span>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="w-full rounded-lg border border-border bg-white px-3 py-2 outline-none focus:border-brand" placeholder="请说明为什么需要纠错删除" />
            </label>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      ) : null}
    </Modal>
  );
}

function Impact({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-border bg-muted/10 px-3 py-2"><div className="text-xs text-muted">{label}</div><div className="mt-1 text-lg font-semibold tabular-nums">{value}</div></div>;
}
