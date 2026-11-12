"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CurrencyCircleDollar,
  Scales,
  TrendUp,
} from "@phosphor-icons/react";
import { DashReveal } from "@/shared/lib/dashboard-motion";
import { formatMoney } from "@/shared/lib/format";
import { useI18n } from "@/shared/i18n";

export function Gauge({
  rate,
  label,
  replayKey,
}: {
  rate: number;
  label: string;
  replayKey: string;
}) {
  const clamped = Math.max(0, Math.min(100, rate));
  const r = 54;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  const offset = arc - (clamped / 100) * arc;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [replayKey, clamped]);

  return (
    <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-[135deg]">
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--chip)"
          strokeWidth="12"
          strokeDasharray={`${arc} ${c}`}
          strokeLinecap="round"
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="12"
          strokeDasharray={`${arc} ${c}`}
          strokeDashoffset={ready ? offset : arc}
          strokeLinecap="round"
          className="dash-gauge-arc"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {clamped.toFixed(0)}%
        </span>
        <span className="mt-0.5 text-xs text-muted">{label}</span>
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  flush = false,
  delayMs = 0,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  /** 內容貼齊卡片邊緣（表格場景） */
  flush?: boolean;
  delayMs?: number;
}) {
  return (
    <DashReveal delayMs={delayMs} className="h-full">
      <section
        className={`ui-card flex h-full flex-col ${flush ? "overflow-hidden" : "p-5"}`}
      >
        <div
          className={`flex shrink-0 items-center justify-between gap-3 ${
            flush ? "px-5 pb-3 pt-5" : "mb-4"
          }`}
        >
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {action}
        </div>
        <div className={`min-h-0 flex-1 ${flush ? "" : "flex flex-col"}`}>
          {children}
        </div>
      </section>
    </DashReveal>
  );
}


export function CustomerTopList({
  items,
  max,
  periodTotal,
  replayKey,
}: {
  items: [string, number][];
  max: number;
  /** 区间内全部客户往来合计，用于占比 */
  periodTotal: number;
  replayKey: string;
}) {
  const { t } = useI18n();
  const [on, setOn] = useState(false);
  const safeMax = Math.max(max, 1);
  const topSum = items.reduce((s, [, a]) => s + a, 0);
  const share =
    periodTotal > 0 ? Math.min(100, (topSum / periodTotal) * 100) : 0;

  useEffect(() => {
    setOn(false);
    const id = window.setTimeout(() => setOn(true), 40);
    return () => window.clearTimeout(id);
  }, [replayKey, items.map(([n, a]) => `${n}:${a}`).join("|")]);

  return (
    <div key={replayKey} className="flex h-full min-h-0 flex-col">
      <ul className="flex min-h-0 flex-1 flex-col justify-evenly gap-1">
        {items.map(([name, amount], index) => {
          const barPct = Math.max(8, (amount / safeMax) * 100);
          const sharePct =
            periodTotal > 0 ? (amount / periodTotal) * 100 : 0;
          return (
            <li
              key={name}
              className="flex min-h-0 flex-1 flex-col justify-center py-0.5"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] text-[10px] font-semibold tabular-nums ${
                      index === 0
                        ? "bg-brand-soft text-brand"
                        : "bg-chip text-muted"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="truncate font-medium text-foreground">
                    {name}
                  </span>
                </div>
                <div className="flex shrink-0 items-baseline gap-2">
                  <span className="tabular-nums text-muted">
                    {formatMoney(amount)}
                  </span>
                  <span className="w-10 text-right text-[11px] tabular-nums text-muted/80">
                    {sharePct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-chip">
                <div
                  className="h-full origin-left rounded-full bg-brand"
                  style={{
                    width: `${barPct}%`,
                    transform: `scaleX(${on ? 1 : 0})`,
                    transition: "transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)",
                    transitionDelay: `${index * 60}ms`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3">
        <div>
          <div className="text-[10px] font-medium text-muted">
            {t("form.customerTopSum")}
          </div>
          <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
            {formatMoney(topSum)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium text-muted">
            {t("form.customerTopShare")}
          </div>
          <div className="mt-1 text-sm font-semibold tabular-nums text-brand">
            {share.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}

export function CashGlance({
  cashBalance,
  received,
  paid,
  miscIncome,
  miscExpense,
  salaryExpense,
  replayKey,
}: {
  cashBalance: number;
  received: number;
  paid: number;
  miscIncome: number;
  miscExpense: number;
  salaryExpense: number;
  replayKey: string;
}) {
  const { t } = useI18n();
  const flow = [
    {
      label: t("dashboard.received"),
      value: received,
      icon: <ArrowUpRight size={14} weight="bold" />,
      tone: "text-success bg-emerald-50",
    },
    {
      label: t("dashboard.paid"),
      value: paid,
      icon: <ArrowDownLeft size={14} weight="bold" />,
      tone: "text-warning bg-amber-50",
    },
    {
      label: t("dashboard.miscIncome"),
      value: miscIncome,
      icon: <ArrowUpRight size={14} weight="duotone" />,
      tone: "text-success bg-emerald-50/70",
    },
    {
      label: t("dashboard.miscExpense"),
      value: miscExpense,
      icon: <ArrowDownLeft size={14} weight="duotone" />,
      tone: "text-warning bg-amber-50/70",
    },
  ] as const;

  return (
    <div key={replayKey} className="flex h-full flex-col gap-3">
      <div className="dash-cash-row rounded-[var(--radius-control)] bg-brand-soft/70 px-3.5 py-3.5">
        <div className="flex items-center gap-2 text-xs font-medium text-brand">
          <CurrencyCircleDollar size={16} weight="duotone" />
          {t("dashboard.cashBalance")}
        </div>
        <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {formatMoney(cashBalance)}
        </div>
      </div>

      <div className="relative grid flex-1 grid-cols-2">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-[var(--border)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-[var(--border)]"
        />
        {flow.map((row, index) => (
          <div
            key={row.label}
            className="dash-cash-row flex flex-col justify-center px-3 py-3"
            style={{ ["--dash-delay" as string]: `${index * 40}ms` }}
          >
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] ${row.tone}`}
              >
                {row.icon}
              </span>
              <span className="truncate">{row.label}</span>
            </div>
            <div className="mt-1.5 text-lg font-semibold tabular-nums tracking-tight text-foreground">
              {formatMoney(row.value)}
            </div>
          </div>
        ))}
      </div>

      <div
        className="dash-cash-row flex items-center justify-between gap-3 border-t border-border px-3 py-3"
        style={{ ["--dash-delay" as string]: "160ms" }}
      >
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-violet-50 text-accent">
            <ArrowDownLeft size={14} weight="duotone" />
          </span>
          <span className="truncate">{t("dashboard.salaryExpense")}</span>
        </div>
        <div className="shrink-0 text-lg font-semibold tabular-nums tracking-tight text-foreground">
          {formatMoney(salaryExpense)}
        </div>
      </div>
    </div>
  );
}

export function SettleOverview({
  arSettleRate,
  apSettleRate,
  arSettled,
  arTotal,
  arBalance,
  apBalance,
  replayKey,
}: {
  arSettleRate: number;
  apSettleRate: number;
  arSettled: number;
  arTotal: number;
  arBalance: number;
  apBalance: number;
  replayKey: string;
}) {
  const { t } = useI18n();
  const apClamped = Math.max(0, Math.min(100, apSettleRate));

  return (
    <div
      key={`settle-${replayKey}`}
      className="flex h-full flex-col gap-3"
    >
      <Gauge
        rate={arSettleRate}
        label={t("form.arSettleRate")}
        replayKey={replayKey}
      />

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-[var(--radius-control)] bg-chip px-2.5 py-2.5">
          <div className="text-muted">{t("form.settledAr")}</div>
          <div className="mt-1 font-semibold tabular-nums text-foreground">
            {formatMoney(arSettled)}
          </div>
        </div>
        <div className="rounded-[var(--radius-control)] bg-chip px-2.5 py-2.5">
          <div className="text-muted">{t("form.arTotal")}</div>
          <div className="mt-1 font-semibold tabular-nums text-foreground">
            {formatMoney(arTotal)}
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-control)] bg-chip/80 px-2.5 py-2.5">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-muted">{t("form.apSettleRateLabel")}</span>
          <span className="font-semibold tabular-nums text-foreground">
            {apClamped.toFixed(0)}%
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full bg-brand/80 transition-[width] duration-700 ease-out"
            style={{ width: `${apClamped}%` }}
          />
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3">
        <div className="dash-cash-row min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-indigo-50 text-info">
              <TrendUp size={14} weight="duotone" />
            </span>
            <span className="truncate">{t("dashboard.arBalance")}</span>
          </div>
          <div className="mt-1.5 text-sm font-semibold tabular-nums text-foreground">
            {formatMoney(arBalance)}
          </div>
        </div>
        <div className="dash-cash-row min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-red-50 text-danger">
              <Scales size={14} weight="duotone" />
            </span>
            <span className="truncate">{t("dashboard.apBalance")}</span>
          </div>
          <div className="mt-1.5 text-sm font-semibold tabular-nums text-foreground">
            {formatMoney(apBalance)}
          </div>
        </div>
      </div>
    </div>
  );
}

