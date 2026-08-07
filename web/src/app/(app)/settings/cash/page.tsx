"use client";

import { useEffect, useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { PageHeader } from "@/shared/ui/PageHeader";
import {
  FormField,
  FormFieldFull,
  FormFieldGrid,
  FormSection,
  Select,
  inputClass,
  textareaClass
} from "@/shared/ui/CrudUi";
import { CompanyLogoUploadField } from "@/shared/ui/CompanyLogo";
import { CURRENCY_OPTIONS } from "@/shared/lib/currency";
import { formatMoney } from "@/shared/lib/format";
import { useI18n } from "@/shared/i18n";
import { useMockStore } from "@/data/mock/store";
import { useModulePermission } from "@/shared/config/menu-permissions";
import {
  COMPANY_ADDRESS_EN_MAX,
  COMPANY_ADDRESS_MAX,
  COMPANY_ABBR_MAX,
  COMPANY_CONTACT_PERSON_MAX,
  COMPANY_EMAIL_MAX,
  COMPANY_PHONE_MAX,
  COMPANY_PHONE_MAX_COUNT,
  firstFieldError,
  normalizeCompanyAbbr,
  normalizeCompanyPhones,
  validateCompanyProfile,
  type CompanyProfileErrorCode,
  type CompanyProfileFieldError,
} from "@/entities/tenant/company-profile";

function ensurePhoneRows(phones: string[]) {
  return phones.length > 0 ? [...phones] : [""];
}

export default function CashSettingsPage() {
  const { t } = useI18n();
  const perm = useModulePermission("settings");
  const { tenant, updateTenant } = useMockStore();
  const canEdit = perm.canEdit;
  const [name, setName] = useState(tenant.name);
  const [nameEn, setNameEn] = useState(tenant.nameEn);
  const [abbr, setAbbr] = useState(tenant.abbr);
  const [address, setAddress] = useState(tenant.address);
  const [addressEn, setAddressEn] = useState(tenant.addressEn);
  const [phones, setPhones] = useState(() => ensurePhoneRows(tenant.phones));
  const [contactPerson, setContactPerson] = useState(tenant.contactPerson);
  const [email, setEmail] = useState(tenant.email);
  const [currency, setCurrency] = useState(tenant.currency);
  const [openingCash, setOpeningCash] = useState(String(tenant.openingCash));
  const [logoUrl, setLogoUrl] = useState<string | undefined>(tenant.logoUrl);
  const [logoError, setLogoError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CompanyProfileFieldError[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(tenant.name);
    setNameEn(tenant.nameEn);
    setAbbr(tenant.abbr);
    setAddress(tenant.address);
    setAddressEn(tenant.addressEn);
    setPhones(ensurePhoneRows(tenant.phones));
    setContactPerson(tenant.contactPerson);
    setEmail(tenant.email);
    setCurrency(tenant.currency);
    setOpeningCash(String(tenant.openingCash));
    setLogoUrl(tenant.logoUrl);
    setLogoError("");
    setFieldErrors([]);
  }, [tenant]);

  function errorMessage(code: CompanyProfileErrorCode) {
    switch (code) {
      case "addressTooLong":
        return t("settings.addressTooLong");
      case "addressEnTooLong":
        return t("settings.addressEnTooLong");
      case "phoneTooLong":
        return t("settings.phoneTooLong");
      case "phoneInvalid":
        return t("settings.phoneInvalid");
      case "phoneTooMany":
        return t("settings.phoneTooMany");
      case "contactPersonTooLong":
        return t("settings.contactPersonTooLong");
      case "emailTooLong":
        return t("settings.companyEmailTooLong");
      case "emailInvalid":
        return t("settings.companyEmailInvalid");
      case "abbrRequired":
        return t("settings.companyAbbrRequired");
      case "abbrTooLong":
        return t("settings.companyAbbrTooLong");
      case "abbrInvalid":
        return t("settings.companyAbbrInvalid");
      default:
        return t("common.saveFailed");
    }
  }

  function fieldErrorText(field: CompanyProfileFieldError["field"]) {
    const err = firstFieldError(fieldErrors, field);
    return err ? errorMessage(err.code) : undefined;
  }

  function phoneRowError(index: number) {
    const err = fieldErrors.find(
      (e) => e.field === "phones" && e.phoneIndex === index,
    );
    return err ? errorMessage(err.code) : undefined;
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    const profile = {
      address,
      addressEn,
      phones,
      contactPerson,
      email,
      abbr,
    };
    const errors = validateCompanyProfile(profile);
    if (errors.length > 0) {
      setFieldErrors(errors);
      setSaved(false);
      return;
    }
    setFieldErrors([]);
    updateTenant({
      name,
      nameEn,
      abbr: normalizeCompanyAbbr(abbr),
      address: address.trim(),
      addressEn: addressEn.trim(),
      phones: normalizeCompanyPhones(phones),
      contactPerson: contactPerson.trim(),
      email: email.trim().toLowerCase(),
      currency: currency.trim().toUpperCase() || "HKD",
      openingCash: Number(openingCash) || 0,
      logoUrl,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  function handleResetDemo() {
    if (!canEdit) return;
    if (!window.confirm(t("settings.resetConfirm"))) return;
    setOpeningCash("100000");
    updateTenant({ openingCash: 100000 });
    setSaved(true);
  }

  function updatePhoneAt(index: number, value: string) {
    setPhones((rows) => rows.map((row, i) => (i === index ? value : row)));
    setFieldErrors((errs) =>
      errs.filter((e) => !(e.field === "phones" && e.phoneIndex === index)),
    );
  }

  function addPhoneRow() {
    setPhones((rows) =>
      rows.length >= COMPANY_PHONE_MAX_COUNT ? rows : [...rows, ""],
    );
  }

  function removePhoneRow(index: number) {
    setPhones((rows) => {
      const next = rows.filter((_, i) => i !== index);
      return ensurePhoneRows(next);
    });
    setFieldErrors((errs) => errs.filter((e) => e.field !== "phones"));
  }

  const phonesGroupError =
    fieldErrorText("phones") &&
    !fieldErrors.some((e) => e.field === "phones" && e.phoneIndex !== undefined)
      ? fieldErrorText("phones")
      : undefined;

  return (
    <div className="ui-page-scroll">
      <PageHeader title={t("settings.cashTitle")} />

      <form onSubmit={handleSave} className="space-y-4" noValidate>
        <fieldset disabled={!canEdit} className="min-w-0 space-y-4 border-0 p-0">
        {/*
          桌面：左上 Logo / 左下资金 / 右侧企业信息跨两行
          移动：Logo → 企业信息 → 资金
        */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-stretch">
          <div className="ui-card order-1 p-6">
            <FormSection title={t("settings.companyLogo")}>
              <CompanyLogoUploadField
                value={logoUrl}
                onChange={(next) => {
                  if (!canEdit) return;
                  setLogoUrl(next);
                  setLogoError("");
                  updateTenant({ logoUrl: next });
                  setSaved(true);
                  window.setTimeout(() => setSaved(false), 2000);
                }}
                onError={setLogoError}
                disabled={!canEdit}
              />
              {logoError ? (
                <p className="text-xs text-danger" role="alert">
                  {logoError}
                </p>
              ) : null}
            </FormSection>
          </div>

          <div className="ui-card order-2 flex h-full flex-col p-6 lg:row-span-2">
            <FormSection title={t("settings.enterpriseInfo")}>
              <p className="-mt-2 mb-1 text-xs text-muted">
                {t("settings.enterpriseInfoHint")}
              </p>
              <FormFieldGrid>
                <FormField label={t("settings.companyName")}>
                  <input
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </FormField>
                <FormField label={t("settings.companyNameEn")}>
                  <input
                    className={inputClass}
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                  />
                </FormField>
                <FormField
                  label={t("settings.companyAbbr")}
                  required
                  hint={t("settings.companyAbbrHint")}
                  error={fieldErrorText("abbr")}
                >
                  <input
                    className={`${inputClass}${fieldErrorText("abbr") ? " is-error" : ""}`}
                    value={abbr}
                    maxLength={COMPANY_ABBR_MAX}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="YK"
                    aria-invalid={Boolean(fieldErrorText("abbr"))}
                    onChange={(e) => {
                      setAbbr(e.target.value.toUpperCase());
                      setFieldErrors((errs) =>
                        errs.filter((x) => x.field !== "abbr"),
                      );
                    }}
                  />
                </FormField>
                <FormField
                  label={t("settings.address")}
                  error={fieldErrorText("address")}
                >
                  <textarea
                    className={textareaClass}
                    rows={3}
                    value={address}
                    maxLength={COMPANY_ADDRESS_MAX}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setFieldErrors((errs) =>
                        errs.filter((x) => x.field !== "address"),
                      );
                    }}
                  />
                </FormField>
                <FormField
                  label={t("settings.addressEn")}
                  error={fieldErrorText("addressEn")}
                >
                  <textarea
                    className={textareaClass}
                    rows={3}
                    value={addressEn}
                    maxLength={COMPANY_ADDRESS_EN_MAX}
                    onChange={(e) => {
                      setAddressEn(e.target.value);
                      setFieldErrors((errs) =>
                        errs.filter((x) => x.field !== "addressEn"),
                      );
                    }}
                  />
                </FormField>
                <FormFieldFull>
                  <FormField
                    label={t("settings.phones")}
                    hint={t("settings.phonesHint")}
                    error={phonesGroupError}
                  >
                    <div className="space-y-2">
                      {phones.map((phone, index) => {
                        const rowError = phoneRowError(index);
                        return (
                          <div key={index} className="flex items-start gap-2">
                            <div className="min-w-0 max-w-xs flex-1">
                              <input
                                className={`${inputClass}${rowError ? " is-error" : ""}`}
                                value={phone}
                                maxLength={COMPANY_PHONE_MAX}
                                inputMode="tel"
                                autoComplete="tel"
                                placeholder="2331 2018"
                                aria-invalid={Boolean(rowError)}
                                onChange={(e) =>
                                  updatePhoneAt(index, e.target.value)
                                }
                              />
                              {rowError ? (
                                <p
                                  className="mt-1 text-xs text-danger"
                                  role="alert"
                                >
                                  {rowError}
                                </p>
                              ) : null}
                            </div>
                            {phones.length > 1 ? (
                              <button
                                type="button"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-muted transition hover:bg-red-50 hover:text-danger"
                                aria-label={t("settings.removePhone")}
                                title={t("settings.removePhone")}
                                onClick={() => removePhoneRow(index)}
                              >
                                <Trash size={16} />
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                      {phones.length < COMPANY_PHONE_MAX_COUNT ? (
                        <button
                          type="button"
                          className="ui-btn-secondary text-sm"
                          onClick={addPhoneRow}
                        >
                          {t("settings.addPhone")}
                        </button>
                      ) : null}
                    </div>
                  </FormField>
                </FormFieldFull>
                <FormField
                  label={t("settings.contactPerson")}
                  error={fieldErrorText("contactPerson")}
                >
                  <input
                    className={inputClass}
                    value={contactPerson}
                    maxLength={COMPANY_CONTACT_PERSON_MAX}
                    onChange={(e) => {
                      setContactPerson(e.target.value);
                      setFieldErrors((errs) =>
                        errs.filter((x) => x.field !== "contactPerson"),
                      );
                    }}
                  />
                </FormField>
                <FormField
                  label={t("settings.companyEmail")}
                  error={fieldErrorText("email")}
                >
                  <input
                    className={inputClass}
                    type="email"
                    value={email}
                    maxLength={COMPANY_EMAIL_MAX}
                    autoComplete="email"
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldErrors((errs) =>
                        errs.filter((x) => x.field !== "email"),
                      );
                    }}
                  />
                </FormField>
              </FormFieldGrid>
            </FormSection>
          </div>

          <div className="ui-card order-3 flex flex-col p-6">
            <FormSection title={t("settings.financeParams")}>
              <div className="space-y-4">
                <FormField
                  label={t("settings.currency")}
                  hint={t("settings.currencyHint")}
                >
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
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                {canEdit ? (
                  <>
                    <button type="submit" className="ui-btn-primary">
                      {t("common.save")}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetDemo}
                      className="ui-btn-secondary"
                    >
                      {t("settings.resetOpeningCash")}
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-muted">{t("permissions.levelRead")}</span>
                )}
                {saved ? (
                  <span className="text-sm text-success">{t("common.saved")}</span>
                ) : null}
              </div>
            </FormSection>
          </div>
        </div>
        </fieldset>
      </form>
    </div>
  );
}
