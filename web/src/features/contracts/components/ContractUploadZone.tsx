"use client";

import { useRef, useState } from "react";
import { CloudArrowUp, FileText, X } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n";
import { ImagePreview } from "./ImagePreview";
import { PdfPreview } from "./PdfPreview";

const ACCEPTED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "webp"]);

function isAcceptedFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ACCEPTED_EXTENSIONS.has(ext);
}

function isImageDataUrl(dataUrl?: string, fileName?: string) {
  if (dataUrl?.startsWith("data:image/")) return true;
  if (dataUrl && /\.(png|jpe?g|webp)($|\?)/i.test(dataUrl)) return true;
  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
  return ["png", "jpg", "jpeg", "webp"].includes(ext);
}

function isPdfDataUrl(dataUrl?: string, fileName?: string) {
  if (dataUrl?.startsWith("data:application/pdf")) return true;
  if (dataUrl && /\.pdf($|\?)/i.test(dataUrl)) return true;
  return (fileName?.split(".").pop()?.toLowerCase() ?? "") === "pdf";
}

export interface ContractAttachmentValue {
  fileName: string;
  dataUrl?: string;
}

export function ContractUploadZone({
  value,
  onChange,
  variant = "compact",
}: {
  value: ContractAttachmentValue | null;
  onChange: (value: ContractAttachmentValue | null) => void;
  /** compact：表单内小区域；panel：弹窗左侧大预览区 */
  variant?: "compact" | "panel";
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  function readFile(file: File) {
    setError("");
    if (!isAcceptedFile(file)) {
      setError(t("contracts.uploadUnsupported"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        fileName: file.name,
        dataUrl: typeof reader.result === "string" ? reader.result : undefined,
      });
    };
    reader.onerror = () => setError(t("contracts.uploadFailed"));
    reader.readAsDataURL(file);
  }

  function handleClear(e?: React.MouseEvent) {
    e?.stopPropagation();
    setError("");
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
  }

  const panel = variant === "panel";
  const hasImage = Boolean(value?.dataUrl && isImageDataUrl(value.dataUrl, value.fileName));
  const hasPdf = Boolean(value?.dataUrl && isPdfDataUrl(value.dataUrl, value.fileName));
  const showingPreview = hasImage || hasPdf;

  return (
    <div className={panel ? "flex h-full min-h-[280px] flex-col gap-2" : "space-y-2"}>
      <div
        className={[
          "relative flex flex-col items-center justify-center overflow-hidden rounded-[var(--radius-control)] border border-dashed bg-card text-center transition-colors",
          panel ? "min-h-[280px] flex-1" : "min-h-[96px] gap-2 px-4 py-4",
          showingPreview ? "cursor-default border-solid" : "cursor-pointer",
          dragOver ? "border-[var(--brand)] bg-[var(--brand-soft)]" : "border-[var(--border)]",
          showingPreview ? "" : "hover:border-[var(--border-strong)]",
        ].join(" ")}
        onClick={() => {
          if (!showingPreview) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) readFile(file);
        }}
      >
        {hasImage && value?.dataUrl ? (
          <ImagePreview src={value.dataUrl} fileName={value.fileName} onClear={handleClear} />
        ) : hasPdf && value?.dataUrl ? (
          <PdfPreview src={value.dataUrl} fileName={value.fileName} onClear={handleClear} />
        ) : value ? (
          <div className="flex flex-col items-center gap-2 px-4 py-6">
            <FileText size={panel ? 40 : 24} className="text-[var(--brand)]" weight="duotone" />
            <p className="text-sm font-medium text-foreground">{value.fileName}</p>
            <p className="text-xs text-success">{t("contracts.uploadSuccess")}</p>
            <button
              type="button"
              className="ui-btn-secondary h-8 px-2 text-xs"
              onClick={handleClear}
            >
              <X size={14} />
              {t("contracts.uploadClear")}
            </button>
          </div>
        ) : (
          <div className={`flex flex-col items-center gap-2 ${panel ? "px-6 py-10" : ""}`}>
            <CloudArrowUp size={panel ? 40 : 24} className="text-muted" />
            <p className={`text-foreground ${panel ? "text-base font-medium" : "text-sm"}`}>
              {t("contracts.uploadDrop")}
            </p>
            <p className="text-xs text-muted">{t("contracts.uploadFormats")}</p>
            {panel ? (
              <p className="mt-1 max-w-xs text-xs text-muted">{t("contracts.uploadHint")}</p>
            ) : null}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) readFile(file);
        }}
      />

      {!panel ? (
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-muted">{t("contracts.uploadHint")}</p>
          {value && !value.dataUrl ? (
            <button
              type="button"
              className="ui-btn-secondary h-8 shrink-0 px-2 text-xs"
              onClick={() => handleClear()}
            >
              <X size={14} />
              {t("contracts.uploadClear")}
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
