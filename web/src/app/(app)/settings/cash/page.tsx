"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormField, Select, inputClass } from "@/components/ui/CrudUi";
import { CURRENCY_OPTIONS } from "@/lib/currency";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useMockStore } from "@/lib/mock-store";

export default function CashSettingsPage() {
  const { t } = useI18n();
  const { tenant, updateTenant } = useMockStore();
  const [name, setName] = useState(tenant.name);
  const [nameEn, setNameEn] = useState(tenant.nameEn);
  const [currency, setCurrency] = useState(tenant.currency);
  const [openingCash, setOpeningCash] = useState(String(tenant.openingCash));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(tenant.name);
    setNameEn(tenant.nameEn);
    setCurrency(tenant.currency);
    setOpeningCash(String(tenant.openingCash));
  }, [tenant]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateTenant({
      name,
      nameEn,
      currency: currency.trim().toUpperCase() || "HKD",
      openingCash: Number(openingCash) || 0,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  function handleResetDemo() {
    if (!window.confirm(t("settings.resetConfirm"))) return;
    setOpeningCash("100000");
    updateTenant({ openingCash: 100000 });
    setSaved(true);
  }

  return (
    <div className="ui-page-scroll">
      <PageHeader title={t("settings.cashTitle")} />

      <form onSubmit={handleSave} className="max-w-2xl space-y-4">
        <div className="ui-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-muted">
            {t("settings.tenantInfo")}
          </h2>
          <div className="space-y-4">
            <FormField label={t("settings.companyName")}>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label={t("settings.companyNameEn")}>
              <input className={inputClass} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            </FormField>
            <FormField label={t("settings.currency")} hint={t("settings.currencyHint")}>
              <Select
                value={currency}
                onChange={setCurrency}
                options={CURRENCY_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </FormField>
            <FormField label={t("settings.openingCash")}>
              <input
                className={inputClass}
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
              />
            </FormField>
            <p className="text-sm text-muted">
              {t("settings.openingCashSaved")}
              <strong className="ml-1 text-foreground">
                {formatMoney(tenant.openingCash)}
              </strong>
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="ui-btn-primary h-10">
                {t("common.save")}
              </button>
              <button
                type="button"
                onClick={handleResetDemo}
                className="ui-btn-secondary h-10"
              >
                {t("settings.resetOpeningCash")}
              </button>
              {saved ? (
                <span className="flex items-center text-sm text-success">
                  {t("common.saved")}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
