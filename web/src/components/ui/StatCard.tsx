"use client";

import type { ReactNode } from "react";
import { useCountUp } from "@/lib/dashboard-motion";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  /** 环比变化率（%） */
  changeMom?: number;
  /** 同比变化率（%） */
  changeYoy?: number;
  /** 环比标签文案，如「环比」 */
  momLabel?: string;
  /** 同比标签文案，如「同比」 */
  yoyLabel?: string;
  icon?: ReactNode;
  iconTone?: "brand" | "success" | "warning" | "danger" | "info" | "muted";
  /** 主数值颜色，默认前景色 */
  valueTone?: "default" | "success" | "warning" | "danger" | "info" | "brand";
  /** 傳入原始數值時啟用計數動效 */
  rawValue?: number;
  formatRaw?: (n: number) => string;
  /** 切換區間等場景重播計數 */
  replayKey?: string;
}

const iconToneClass: Record<NonNullable<StatCardProps["iconTone"]>, string> = {
  brand: "bg-brand-soft text-brand",
  /** 以下固定色，不跟随主题 --info / --success 等变量 */
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
  info: "bg-sky-50 text-sky-600",
  muted: "bg-chip text-muted",
};

const valueToneClass: Record<NonNullable<StatCardProps["valueTone"]>, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  brand: "text-brand",
};

function formatPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function CompareCell({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: number;
  align?: "left" | "right";
}) {
  const positive = value >= 0;
  const text = formatPct(value);
  return (
    <div
      className={`dash-change-chip min-w-0 ${align === "right" ? "text-right" : "text-left"}`}
      title={`${label} ${text}`}
    >
      <div className="text-[10px] font-medium leading-none tracking-wide text-muted">
        {label}
      </div>
      <div
        className={`mt-1 text-sm font-semibold leading-none tabular-nums ${
          positive ? "text-success" : "text-danger"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  changeMom,
  changeYoy,
  momLabel = "环比",
  yoyLabel = "同比",
  icon,
  iconTone = "brand",
  valueTone = "default",
  rawValue,
  formatRaw,
  replayKey = "",
}: StatCardProps) {
  const target = rawValue ?? 0;
  const animated = useCountUp(
    target,
    rawValue === undefined ? `static:${value}` : `${replayKey}:${rawValue}`,
  );
  const display =
    rawValue !== undefined && formatRaw ? formatRaw(animated) : value;
  const hasCompare = changeMom !== undefined || changeYoy !== undefined;

  return (
    <div className={`ui-card dash-stat-card flex h-full flex-col p-5 ${hasCompare ? "min-h-[148px]" : "min-h-[112px]"}`}>
      <div className="flex flex-1 items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={`text-xs font-medium ${
              valueTone === "default" ? "text-muted" : valueToneClass[valueTone]
            }`}
          >
            {label}
          </div>
          <div
            className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${valueToneClass[valueTone]}`}
          >
            {display}
          </div>
          {hint ? (
            <div className="mt-1.5 truncate text-xs text-muted" title={hint}>
              {hint}
            </div>
          ) : null}
        </div>
        {icon ? (
          <div
            className={`dash-stat-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] ${iconToneClass[iconTone]}`}
          >
            {icon}
          </div>
        ) : null}
      </div>

      {hasCompare ? (
        <div className="mt-5 grid grid-cols-2 divide-x divide-[var(--border)] border-t border-[var(--border)] pt-3.5">
          {changeMom !== undefined ? (
            <div className="pr-3">
              <CompareCell label={momLabel} value={changeMom} />
            </div>
          ) : (
            <div />
          )}
          {changeYoy !== undefined ? (
            <div className="pl-3">
              <CompareCell label={yoyLabel} value={changeYoy} align="right" />
            </div>
          ) : (
            <div />
          )}
        </div>
      ) : null}
    </div>
  );
}
