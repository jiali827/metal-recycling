"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadSimple, File, Trash, UploadSimple } from "@phosphor-icons/react";
import { Modal } from "@/shared/ui/Modal";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { useI18n } from "@/shared/i18n";
import type { WeighSettlementDoc } from "@/entities/types";

const MAX_BYTES = 10 * 1024 * 1024;

function downloadAttachment(fileName: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName || "attachment";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("empty"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function SettlementAttachmentModal({
  open,
  row,
  canEdit,
  onClose,
  onChange,
}: {
  open: boolean;
  row: WeighSettlementDoc;
  canEdit: boolean;
  onClose: () => void;
  onChange: (
    id: string,
    patch: Pick<WeighSettlementDoc, "attachmentName" | "attachmentDataUrl">,
  ) => void;
}) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const hasFile = Boolean(row.attachmentName && row.attachmentDataUrl);

  useEffect(() => {
    if (!open && inputRef.current) inputRef.current.value = "";
  }, [open]);

  async function applyFile(file: File) {
    if (file.size > MAX_BYTES) {
      await confirm({
        alert: true,
        message: t("settlementDocs.attachmentTooLarge"),
      });
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onChange(row.id, {
        attachmentName: file.name,
        attachmentDataUrl: dataUrl,
      });
    } catch {
      await confirm({
        alert: true,
        message: t("settlementDocs.attachmentReadFailed"),
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    const ok = await confirm({
      message: t("settlementDocs.removeAttachmentConfirm"),
    });
    if (!ok) return;
    onChange(row.id, {
      attachmentName: undefined,
      attachmentDataUrl: undefined,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("settlementDocs.attachmentModalTitle")}
      size="md"
      footer={
        <button type="button" className="ui-btn-secondary" onClick={onClose}>
          {t("common.close")}
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          {t("settlementDocs.attachmentModalHint")}
        </p>
        <p className="text-sm">
          <span className="text-muted">{t("settlementDocs.colNo")}：</span>
          <span className="font-medium tabular-nums">{row.no}</span>
        </p>

        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          disabled={busy || !canEdit}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void applyFile(file);
          }}
        />

        {hasFile ? (
          <div className="rounded-[var(--radius-control)] border border-border bg-chip/50 px-4 py-3">
            <div className="flex items-start gap-3">
              <File size={22} className="mt-0.5 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground" title={row.attachmentName}>
                  {row.attachmentName}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {t("settlementDocs.attachmentReady")}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="ui-btn-secondary inline-flex h-8 items-center gap-1.5 px-3 text-xs"
                onClick={() =>
                  downloadAttachment(row.attachmentName!, row.attachmentDataUrl!)
                }
              >
                <DownloadSimple size={14} weight="bold" />
                {t("settlementDocs.downloadAttachment")}
              </button>
              {canEdit ? (
                <>
                  <button
                    type="button"
                    className="ui-btn-secondary inline-flex h-8 items-center gap-1.5 px-3 text-xs disabled:opacity-50"
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                  >
                    <UploadSimple size={14} weight="bold" />
                    {t("settlementDocs.replaceAttachment")}
                  </button>
                  <button
                    type="button"
                    className="ui-btn-secondary inline-flex h-8 items-center gap-1.5 px-3 text-xs text-danger hover:border-danger/40 hover:bg-red-50"
                    onClick={() => void handleRemove()}
                  >
                    <Trash size={14} />
                    {t("settlementDocs.removeAttachment")}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--radius-control)] border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted">
              {t("settlementDocs.attachmentEmpty")}
            </p>
            {canEdit ? (
              <button
                type="button"
                className="ui-btn-primary mt-4 inline-flex h-9 items-center gap-1.5 px-4 text-sm disabled:opacity-50"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                <UploadSimple size={16} weight="bold" />
                {t("settlementDocs.uploadAttachment")}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}

export function SettlementAttachmentCell({
  row,
  canEdit,
  onChange,
}: {
  row: WeighSettlementDoc;
  canEdit: boolean;
  onChange: (
    id: string,
    patch: Pick<WeighSettlementDoc, "attachmentName" | "attachmentDataUrl">,
  ) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const hasFile = Boolean(row.attachmentName && row.attachmentDataUrl);
  const canOpen = hasFile || canEdit;

  return (
    <div
      className="max-w-[11rem]"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {canOpen ? (
        <button
          type="button"
          className="max-w-full truncate text-left text-xs font-medium text-brand hover:underline"
          title={
            hasFile
              ? row.attachmentName
              : t("settlementDocs.uploadAttachment")
          }
          onClick={() => setOpen(true)}
        >
          {hasFile
            ? row.attachmentName
            : t("settlementDocs.uploadAttachment")}
        </button>
      ) : (
        <span className="text-xs text-muted">—</span>
      )}
      {open ? (
        <SettlementAttachmentModal
          open
          row={row}
          canEdit={canEdit}
          onClose={() => setOpen(false)}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}
