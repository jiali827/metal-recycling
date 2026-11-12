"use client";

import { CompanyLogoMark } from "@/shared/ui/CompanyLogo";
import { formatMoney, formatKg } from "@/shared/lib/format";
import { useI18n } from "@/shared/i18n";
import type { Tenant, WeighSettlementDoc } from "@/entities/types";
import { CorrectionInfo } from "@/features/correction/components/CorrectionInfo";

function formatDocDate(value: string) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${Number(d)}/${Number(m)}/${y}`;
}

function formatLineDate(value: string) {
  return formatDocDate(value);
}

export function WeighSettlementPrintSheet({
  doc,
  tenant,
}: {
  doc: WeighSettlementDoc;
  tenant: Tenant;
}) {
  const { t } = useI18n();
  const isPurchase = doc.kind === "purchase";
  const title = isPurchase
    ? t("settlementDocs.purchaseTitle")
    : t("settlementDocs.saleTitle");
  const noLabel = isPurchase
    ? t("settlementDocs.purchaseNo")
    : t("settlementDocs.saleNo");
  const dateLabel = isPurchase
    ? t("settlementDocs.purchaseDate")
    : t("settlementDocs.saleDate");

  return (
    <div className="settlement-print-sheet mx-auto max-w-[920px] bg-white text-[13px] text-black">
      <header className="flex items-start gap-4 border-b border-black/20 pb-3">
        <CompanyLogoMark size={56} logoUrl={tenant.logoUrl} title={tenant.name} />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-wide">{tenant.name}</h1>
          {tenant.nameEn ? (
            <p className="text-[12px] font-medium text-black/70">{tenant.nameEn}</p>
          ) : null}
          <p className="mt-1 text-[11px] leading-snug text-black/70">{tenant.address}</p>
          {tenant.addressEn ? (
            <p className="text-[11px] leading-snug text-black/60">{tenant.addressEn}</p>
          ) : null}
          <p className="mt-1 text-[11px] text-black/70">
            {tenant.phones.filter(Boolean).length
              ? `Tel: ${tenant.phones.filter(Boolean).join(" / ")}`
              : null}
            {tenant.email ? ` · Email: ${tenant.email}` : null}
          </p>
        </div>
      </header>

      <h2 className="my-4 text-center text-xl font-bold tracking-[0.2em]">{title}</h2>

      <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
        <p>
          <span className="text-black/60">{t("settlementDocs.customerName")}</span>
          <span className="ml-2 font-medium">{doc.customerName}</span>
        </p>
        <p>
          <span className="text-black/60">{noLabel}</span>
          <span className="ml-2 font-medium tabular-nums">{doc.no}</span>
        </p>
        <p>
          <span className="text-black/60">{dateLabel}</span>
          <span className="ml-2 font-medium tabular-nums">{formatDocDate(doc.docDate)}</span>
        </p>
      </div>

      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-y border-black/40 bg-black/[0.03] text-left">
            <th className="px-1.5 py-1.5 font-semibold">{t("settlementDocs.colDate")}</th>
            <th className="px-1.5 py-1.5 font-semibold">{t("settlementDocs.colBx")}</th>
            <th className="px-1.5 py-1.5 font-semibold">{t("fields.plate")}</th>
            <th className="px-1.5 py-1.5 font-semibold">{t("settlementDocs.colMaterial")}</th>
            <th className="px-1.5 py-1.5 text-right font-semibold">{t("settlementDocs.colGross")}</th>
            <th className="px-1.5 py-1.5 text-right font-semibold">{t("settlementDocs.colDeduction")}</th>
            <th className="px-1.5 py-1.5 text-right font-semibold">{t("settlementDocs.colNet")}</th>
            <th className="px-1.5 py-1.5 text-right font-semibold">{t("settlementDocs.colUnitPrice")}</th>
            <th className="px-1.5 py-1.5 text-right font-semibold">{t("settlementDocs.colAmount")}</th>
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((line) => (
            <tr key={line.ticketId} className="border-b border-black/10">
              <td className="px-1.5 py-1 tabular-nums">{formatLineDate(line.date)}</td>
              <td className="px-1.5 py-1 tabular-nums">{line.bxNo}</td>
              <td className="px-1.5 py-1">{line.plate || "—"}</td>
              <td className="px-1.5 py-1">{line.materialSummary}</td>
              <td className="px-1.5 py-1 text-right tabular-nums">{line.grossKg.toLocaleString("zh-HK")}</td>
              <td className="px-1.5 py-1 text-right tabular-nums">
                {line.deductionKg ? line.deductionKg.toLocaleString("zh-HK") : "—"}
              </td>
              <td className="px-1.5 py-1 text-right tabular-nums">{line.netKg.toLocaleString("zh-HK")}</td>
              <td className="px-1.5 py-1 text-right tabular-nums">
                {line.unitPrice.toLocaleString("zh-HK", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 4,
                })}
              </td>
              <td className="px-1.5 py-1 text-right tabular-nums">
                {line.amount.toLocaleString("zh-HK", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex flex-wrap justify-end gap-x-8 gap-y-1 text-[13px]">
        <p>
          <span className="text-black/60">{t("settlementDocs.totalNet")}</span>
          <strong className="ml-2 tabular-nums">{formatKg(doc.totalNetKg)}</strong>
        </p>
        <p>
          <span className="text-black/60">{t("settlementDocs.totalAmount")}</span>
          <strong className="ml-2 tabular-nums">{formatMoney(doc.totalAmount, tenant.currency)}</strong>
        </p>
      </div>

      <div className="mt-5">
        <CorrectionInfo
          reason={doc.voidReason}
          actor={doc.voidedBy}
          at={doc.voidedAt}
          batchId={doc.reversalBatchId}
        />
      </div>

      <div className="mt-14 grid grid-cols-2 gap-10 text-[12px]">
        <div>
          <p className="font-medium">{t("settlementDocs.verifier")}</p>
          <p className="mt-1 text-black/60">{t("settlementDocs.agree")}</p>
          <div className="mt-10 border-b border-black/40" />
          <p className="mt-2 text-black/50">{t("settlementDocs.signChop")}</p>
        </div>
        <div>
          <p className="font-medium">{tenant.name}</p>
          <div className="mt-16 border-b border-black/40" />
          <p className="mt-2 text-black/50">{t("settlementDocs.signChop")}</p>
        </div>
      </div>
    </div>
  );
}
