"use client";

import { useEffect, useState } from "react";
import { DownloadSimple, MagnifyingGlassMinus, MagnifyingGlassPlus } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;
const RENDER_SCALE = 1.75;

async function loadPdfPages(src: string): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const task = src.startsWith("data:")
    ? pdfjs.getDocument({ data: dataUrlToUint8Array(src) })
    : pdfjs.getDocument({ url: src });

  const doc = await task.promise;
  const urls: string[] = [];

  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    urls.push(canvas.toDataURL("image/png"));
  }

  return urls;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function PdfPreview({
  src,
  fileName,
  onClear,
}: {
  src: string;
  fileName: string;
  onClear?: (e?: React.MouseEvent) => void;
}) {
  const { t } = useI18n();
  const [pages, setPages] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setPages([]);
    setZoom(1);

    loadPdfPages(src)
      .then((urls) => {
        if (!cancelled) {
          setPages(urls);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

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
    a.download = fileName || "contract.pdf";
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
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            {t("contracts.previewLoading")}
          </div>
        ) : failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-sm text-muted">
            <p>{t("contracts.previewFailed")}</p>
            <button type="button" className="ui-btn-secondary h-8 px-3 text-xs" onClick={download}>
              <DownloadSimple size={14} />
              {t("contracts.downloadAttachment")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-3 py-3">
            {pages.map((pageUrl, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${src}-${index}`}
                src={pageUrl}
                alt={`${fileName} · ${index + 1}`}
                className="block max-w-none bg-white shadow-sm"
                style={{ width: `${zoom * 100}%` }}
                draggable={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
