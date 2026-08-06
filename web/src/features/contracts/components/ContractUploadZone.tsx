"use client";

import { useRef, useState } from "react";
import { CloudArrowUp, FileText, X } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n";

const ACCEPTED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "webp"]);

function isAcceptedFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ACCEPTED_EXTENSIONS.has(ext);
}

export interface ContractAttachmentValue {
  fileName: string;
  dataUrl?: string;
}

export function ContractUploadZone({
  value,
  onChange,
}: {
  value: ContractAttachmentValue | null;
  onChange: (value: ContractAttachmentValue | null) => void;
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

  function handleClear() {
    setError("");
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <div
        className={[
          "flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] border border-dashed bg-card px-4 py-4 text-center transition-colors",
          dragOver ? "border-[var(--brand)] bg-[var(--brand-soft)]" : "border-[var(--border)]",
          "hover:border-[var(--border-strong)]",
        ].join(" ")}
        onClick={() => inputRef.current?.click()}
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
        {value ? (
          <>
            <FileText size={24} className="text-[var(--brand)]" weight="duotone" />
            <p className="text-sm font-medium text-foreground">{value.fileName}</p>
            <p className="text-xs text-success">{t("contracts.uploadSuccess")}</p>
          </>
        ) : (
          <>
            <CloudArrowUp size={24} className="text-muted" />
            <p className="text-sm text-foreground">{t("contracts.uploadDrop")}</p>
            <p className="text-xs text-muted">{t("contracts.uploadFormats")}</p>
          </>
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

      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted">{t("contracts.uploadHint")}</p>
        {value ? (
          <button
            type="button"
            className="ui-btn-secondary h-8 shrink-0 px-2 text-xs"
            onClick={handleClear}
          >
            <X size={14} />
            {t("contracts.uploadClear")}
          </button>
        ) : null}
      </div>

      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
