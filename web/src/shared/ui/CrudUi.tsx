"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { useI18n, getActiveMessages } from "@/shared/i18n";

export {
  FormField,
  Select,
  MultiSelect,
  SearchableSelect,
  DatePicker,
  DateRangePicker,
  DateTimePicker,
  Checkbox,
  Radio,
  RadioGroup,
  Switch,
  Tag,
  InputWithUnit,
  SegmentedControl,
  OptionField,
  FormSection,
  FormFieldGrid,
  FormFieldFull,
} from "./forms";
export type { SelectOption, TagTone } from "./forms";

export const inputClass = "ui-input";

/** @deprecated Use Select component instead of native select */
export const selectClass = inputClass;

export const textareaClass = "ui-input mt-1 h-auto min-h-[88px] py-2";

export function FormCard({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="ui-card max-w-2xl p-6">
      {title ? (
        <h2 className="mb-4 text-sm font-semibold text-muted">{title}</h2>
      ) : null}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function FormActions({
  cancelHref,
  onCancel,
  submitLabel,
}: {
  cancelHref?: string;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const { t } = useI18n();
  const saveLabel = submitLabel ?? t("common.save");
  const cancelLabel = t("common.cancel");

  return (
    <div className="flex gap-3 pt-2">
      <button type="submit" className="ui-btn-primary h-10 px-5">
        {saveLabel}
      </button>
      {onCancel ? (
        <button type="button" className="ui-btn-secondary h-10" onClick={onCancel}>
          {cancelLabel}
        </button>
      ) : cancelHref ? (
        <Link href={cancelHref} className="ui-btn-secondary h-10">
          {cancelLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function DetailSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div>
      {title ? (
        <h3 className="mb-3 text-sm font-semibold text-muted">{title}</h3>
      ) : null}
      <dl className="space-y-3 text-sm">{children}</dl>
    </div>
  );
}

export function DetailCard({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="ui-card max-w-2xl p-6">
      <DetailSection title={title}>{children}</DetailSection>
    </div>
  );
}

export function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2.5 last:border-0">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

export function NotFoundCard({ backHref }: { backHref: string }) {
  const { t } = useI18n();
  return (
    <div className="ui-card max-w-lg p-8 text-center">
      <p className="text-base font-medium text-foreground">{t("common.notFound")}</p>
      <p className="mt-2 text-sm text-muted">{t("common.notFoundHint")}</p>
      <Link href={backHref} className="ui-btn-secondary mt-5 inline-flex h-10">
        {t("common.back")}
      </Link>
    </div>
  );
}

export function PrimaryButton({
  href,
  onClick,
  children,
  type = "button",
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  type?: "button" | "submit";
}) {
  if (href) {
    return (
      <Link href={href} className="ui-btn-primary" onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className="ui-btn-primary" onClick={onClick}>
      {children}
    </button>
  );
}

export function RowActions({
  onDetail,
  detailHref,
  onDelete,
}: {
  onDetail?: () => void;
  detailHref?: string;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const detailClass =
    "flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] text-muted transition hover:bg-chip hover:text-brand";
  const deleteClass =
    "flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] text-muted transition hover:bg-red-50 hover:text-danger";

  return (
    <div className="flex items-center justify-end gap-1">
      {detailHref ? (
        <Link
          href={detailHref}
          className={detailClass}
          aria-label={t("common.detail")}
          onClick={(e) => e.stopPropagation()}
        >
          <PencilSimple size={14} />
        </Link>
      ) : onDetail ? (
        <button
          type="button"
          className={detailClass}
          aria-label={t("common.detail")}
          onClick={(e) => {
            e.stopPropagation();
            onDetail();
          }}
        >
          <PencilSimple size={14} />
        </button>
      ) : null}
      <button
        type="button"
        className={deleteClass}
        aria-label={t("common.delete")}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash size={14} />
      </button>
    </div>
  );
}

/** Sync confirm for list pages still using window.confirm */
export function confirmDelete(label: string): boolean {
  const msg = getActiveMessages().common.deleteConfirm.replace(
    "{label}",
    label,
  );
  return window.confirm(msg);
}
