"use client";

import { useState } from "react";
import { DownloadSimple, MagnifyingGlassMinus, MagnifyingGlassPlus } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

export function ImagePreview({
  src,
  fileName,
  onClear,
}: {
  src: string;
  fileName: string;
  onClear?: (e?: React.MouseEvent) => void;
}) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(1);

  function zoomIn(e: React.MouseEvent) {
    e.stopPropagation();
    setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
  }

  function zoomOut(e: React.MouseEvent) {
    e.stopPropagation();
    setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100));
  }

  function download(e: React.MouseEvent) {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = src;
    a.download = fileName || "contract";
    a.rel = "noopener";
    a.target = "_blank";
    a.click();
  }

  return (
    <div
      className="absolute inset-0 flex flex-col bg-chip"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{fileName}</p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="ui-btn-secondary h-7 px-2 text-xs"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
            title={t("contracts.zoomOut")}
            aria-label={t("contracts.zoomOut")}
          >
            <MagnifyingGlassMinus size={14} />
          </button>
          <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="ui-btn-secondary h-7 px-2 text-xs"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
            title={t("contracts.zoomIn")}
            aria-label={t("contracts.zoomIn")}
          >
            <MagnifyingGlassPlus size={14} />
          </button>
          <button
            type="button"
            className="ui-btn-secondary h-7 px-2 text-xs"
            onClick={download}
            title={t("contracts.downloadAttachment")}
            aria-label={t("contracts.downloadAttachment")}
          >
            <DownloadSimple size={14} />
            {t("contracts.downloadAttachment")}
          </button>
          {onClear ? (
            <button
              type="button"
              className="ui-btn-secondary h-7 px-2 text-xs"
              onClick={onClear}
            >
              {t("contracts.uploadClear")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="ui-scrollbar-overlay min-h-0 flex-1 overflow-auto">
        <div className="flex min-h-full items-start justify-center px-3 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={fileName}
            className="block max-w-none bg-white shadow-sm"
            style={{ width: `${zoom * 100}%` }}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
