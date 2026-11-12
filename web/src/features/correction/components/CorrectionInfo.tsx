"use client";

import { formatWeighDateTime } from "@/shared/lib/date";

export function CorrectionInfo({
  reason,
  actor,
  at,
  batchId,
}: {
  reason?: string;
  actor?: string;
  at?: string;
  batchId?: string;
}) {
  if (!reason) return null;

  return (
    <section className="rounded-lg border border-red-200 bg-red-50/70 px-4 py-3 text-sm">
      <h3 className="font-semibold text-red-900">纠错信息</h3>
      <dl className="mt-3 grid gap-x-5 gap-y-4 text-red-900 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-xs text-red-900/65">纠错原因</dt>
          <dd className="mt-1 whitespace-pre-wrap">{reason}</dd>
        </div>
        {actor ? (
          <div>
            <dt className="text-xs text-red-900/65">处理人</dt>
            <dd className="mt-1">{actor}</dd>
          </div>
        ) : null}
        {at ? (
          <div>
            <dt className="text-xs text-red-900/65">处理时间</dt>
            <dd className="mt-1 tabular-nums">{formatWeighDateTime(at)}</dd>
          </div>
        ) : null}
        {batchId ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-red-900/65">纠错批次</dt>
            <dd className="mt-1 break-all tabular-nums">{batchId}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
