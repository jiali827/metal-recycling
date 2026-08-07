"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n";

const backBtn =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-border bg-white text-muted transition hover:bg-chip hover:text-foreground";

export function SettlementPrintToolbar({
  title,
  subtitle,
  onBack,
  onPrint,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onBack: () => void;
  onPrint?: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="settlement-print-toolbar sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-4 py-3 sm:px-6 print:hidden">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          className={backBtn}
          onClick={onBack}
          aria-label={t("settlementDocs.backToList")}
          title={t("settlementDocs.backToList")}
        >
          <ArrowLeft size={18} weight="bold" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          {subtitle ? (
            <p className="truncate text-xs text-muted">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {onPrint ? (
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className="ui-btn-primary" onClick={onPrint}>
            {t("settlementDocs.print")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
