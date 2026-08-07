"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { WeighSettlementPrintSheet } from "@/features/settlement-docs/components/WeighSettlementPrintSheet";
import { SettlementPrintToolbar } from "@/features/settlement-docs/components/SettlementPrintToolbar";
import { useMockStore } from "@/data/mock/store";
import { useI18n } from "@/shared/i18n";
import { useModulePermission } from "@/shared/config/menu-permissions";

export default function SettlementDocPrintPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const perm = useModulePermission("weighTickets");
  const { weighSettlementDocs, tenant } = useMockStore();

  const doc = useMemo(
    () => weighSettlementDocs.find((d) => d.id === params.id),
    [weighSettlementDocs, params.id],
  );

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/settlement-docs");
  }

  if (!perm.canView) {
    return (
      <div className="p-6 text-sm text-muted">{t("common.notFoundHint")}</div>
    );
  }

  if (!doc) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-muted">{t("common.notFoundHint")}</p>
        <button type="button" className="ui-btn-secondary" onClick={handleBack}>
          {t("settlementDocs.backToList")}
        </button>
      </div>
    );
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="settlement-print-page flex min-h-0 flex-1 flex-col overflow-auto bg-chip">
      <SettlementPrintToolbar
        title={doc.no}
        subtitle={doc.customerName}
        onBack={handleBack}
        onPrint={handlePrint}
      />
      <div className="p-4 print:p-0 sm:p-6">
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-sm print:border-0 print:p-0 print:shadow-none">
          <WeighSettlementPrintSheet doc={doc} tenant={tenant} />
        </div>
      </div>
    </div>
  );
}
