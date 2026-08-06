"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CurrencyCircleDollar,
  Scales,
  TrendUp,
} from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DateRangePicker, SegmentedControl } from "@/components/ui/CrudUi";
import { DashReveal } from "@/lib/dashboard-motion";
import {
  DIRECTION_PURCHASE_COLOR,
  DIRECTION_PURCHASE_FILL,
  DIRECTION_SALE_COLOR,
  DIRECTION_SALE_FILL,
} from "@/lib/direction-colors";
import { formatKg, formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useMockStore } from "@/lib/mock-store";
import { isMiscPayment } from "@/lib/payment-meta";
import type { WeighTicket } from "@/lib/types";

type RangePreset = "today" | "week" | "month" | "custom";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(iso: string) {
  return iso.slice(0, 10);
}

function parseDate(iso: string) {
  const [y, m, d] = toDateKey(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatIso(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(d: Date, n: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function startOfLocalToday() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/** 周一为一周起始 */
function startOfWeekMon(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), diff);
}

function endOfWeekMon(d: Date) {
  return addDays(startOfWeekMon(d), 6);
}

function startOfMonthDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonthDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function eachDayKeys(startKey: string, endKey: string): string[] {
  let start = parseDate(startKey);
  let end = parseDate(endKey);
  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  const keys: string[] = [];
  let cur = start;
  // 防超长区间拖垮图表
  for (let i = 0; i < 93 && cur <= end; i += 1) {
    keys.push(formatIso(cur));
    cur = addDays(cur, 1);
  }
  return keys;
}

function inDateRange(iso: string, startKey: string, endKey: string) {
  const key = toDateKey(iso);
  return key >= startKey && key <= endKey;
}

/** 日期整体平移 N 年（同比用） */
function shiftYears(iso: string, years: number) {
  const d = parseDate(iso.slice(0, 10));
  d.setFullYear(d.getFullYear() + years);
  return formatIso(d);
}

function pctChange(now: number, prev: number) {
  if (prev === 0) return now > 0 ? 100 : 0;
  return ((now - prev) / prev) * 100;
}

/** 由種子產生穩定的 0–1 偽隨機，避免每次渲染跳動 */
function seededUnit(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function LineChart({
  sales,
  purchases,
  labels,
  ariaLabel,
  replayKey,
}: {
  sales: number[];
  purchases: number[];
  labels: string[];
  ariaLabel: string;
  replayKey: string;
}) {
  const w = 640;
  const h = 176;
  const padL = 6;
  const padR = 6;
  const padT = 12;
  const padB = 22;
  const max = Math.max(...sales, ...purchases, 1);
  const n = Math.max(sales.length, 1);
  const labelStep =
    n <= 10 ? 1 : n <= 16 ? 2 : Math.max(1, Math.ceil(n / 10));
  const stroke = 1.6;
  const dotR = n > 20 ? 1.8 : 2.2;

  const toX = (i: number) =>
    padL + (n <= 1 ? (w - padL - padR) / 2 : (i / (n - 1)) * (w - padL - padR));
  const toY = (v: number) => padT + (1 - v / max) * (h - padT - padB);

  const pathFor = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
      .join(" ");

  const areaFor = (values: number[]) => {
    if (values.length === 0) return "";
    const line = pathFor(values);
    const lastX = toX(values.length - 1);
    const firstX = toX(0);
    const baseY = h - padB;
    return `${line} L ${lastX.toFixed(1)} ${baseY} L ${firstX.toFixed(1)} ${baseY} Z`;
  };

  return (
    <svg
      key={replayKey}
      viewBox={`0 0 ${w} ${h}`}
      className="block w-full aspect-[40/11]"
      role="img"
      aria-label={ariaLabel}
    >
      {[0.25, 0.5, 0.75, 1].map((t) => {
        const y = toY(max * t);
        return (
          <line
            key={t}
            x1={padL}
            x2={w - padR}
            y1={y}
            y2={y}
            stroke="var(--border)"
            strokeDasharray="3 4"
            strokeWidth={1}
          />
        );
      })}
      <path
        className="dash-line-area"
        d={areaFor(sales)}
        fill={DIRECTION_SALE_FILL}
      />
      <path
        className="dash-line-draw"
        pathLength={1}
        d={pathFor(sales)}
        fill="none"
        stroke={DIRECTION_SALE_COLOR}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="dash-line-draw"
        pathLength={1}
        d={pathFor(purchases)}
        fill="none"
        stroke={DIRECTION_PURCHASE_COLOR}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ animationDelay: "0.12s" }}
      />
      {sales.map((v, i) => (
        <circle
          key={`s-${i}`}
          className="dash-line-dot"
          cx={toX(i)}
          cy={toY(v)}
          r={dotR}
          fill={DIRECTION_SALE_COLOR}
          style={{ animationDelay: `${0.45 + Math.min(i, 20) * 0.03}s` }}
        />
      ))}
      {purchases.map((v, i) => (
        <circle
          key={`p-${i}`}
          className="dash-line-dot"
          cx={toX(i)}
          cy={toY(v)}
          r={dotR}
          fill={DIRECTION_PURCHASE_COLOR}
          style={{ animationDelay: `${0.55 + Math.min(i, 20) * 0.03}s` }}
        />
      ))}
      {labels.map((label, i) => {
        const show = i === 0 || i === n - 1 || i % labelStep === 0;
        if (!show) return null;
        return (
          <text
            key={`${label}-${i}`}
            x={toX(i)}
            y={h - 6}
            textAnchor="middle"
            fill="var(--muted)"
            fontSize={9}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

type MaterialBucket = {
  name: string;
  saleAmount: number;
  purchaseAmount: number;
  saleKg: number;
  purchaseKg: number;
};

/** 货物类型购销饼图：按货类合计（销售+采购），金额/净重由父级切换 */
const MATERIAL_PIE_COLORS = [
  "#6366f1",
  "#f97316",
  "#059669",
  "#0ea5e9",
  "#8b5cf6",
  "#d97706",
  "#ec4899",
  "#64748b",
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
) {
  const sweep = endAngle - startAngle;
  if (sweep <= 0.001) return "";
  const large = sweep > 180 ? 1 : 0;
  const o1 = polarToCartesian(cx, cy, outerR, startAngle);
  const o2 = polarToCartesian(cx, cy, outerR, endAngle);
  const i1 = polarToCartesian(cx, cy, innerR, endAngle);
  const i2 = polarToCartesian(cx, cy, innerR, startAngle);
  if (sweep >= 359.99) {
    // 满圆：两段弧拼合
    const mid = startAngle + 180;
    const om = polarToCartesian(cx, cy, outerR, mid);
    const im = polarToCartesian(cx, cy, innerR, mid);
    return [
      `M ${o1.x} ${o1.y}`,
      `A ${outerR} ${outerR} 0 1 1 ${om.x} ${om.y}`,
      `A ${outerR} ${outerR} 0 1 1 ${o2.x} ${o2.y}`,
      `L ${i1.x} ${i1.y}`,
      `A ${innerR} ${innerR} 0 1 0 ${im.x} ${im.y}`,
      `A ${innerR} ${innerR} 0 1 0 ${i2.x} ${i2.y}`,
      "Z",
    ].join(" ");
  }
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y}`,
    "Z",
  ].join(" ");
}

function MaterialPieChart({
  labels,
  sales,
  purchases,
  formatValue,
  saleLabel,
  purchaseLabel,
  totalLabel,
  replayKey,
}: {
  labels: string[];
  sales: number[];
  purchases: number[];
  formatValue: (n: number) => string;
  saleLabel: string;
  purchaseLabel: string;
  totalLabel: string;
  replayKey: string;
}) {
  const [on, setOn] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  const slices = labels
    .map((label, i) => ({
      label,
      sale: sales[i] ?? 0,
      purchase: purchases[i] ?? 0,
      value: (sales[i] ?? 0) + (purchases[i] ?? 0),
      color: MATERIAL_PIE_COLORS[i % MATERIAL_PIE_COLORS.length],
    }))
    .filter((s) => s.value > 0);

  const total = slices.reduce((sum, s) => sum + s.value, 0);

  useEffect(() => {
    setOn(false);
    setHover(null);
    const id = window.setTimeout(() => setOn(true), 40);
    return () => window.clearTimeout(id);
  }, [replayKey, slices.map((s) => `${s.label}:${s.value}`).join("|")]);

  if (slices.length === 0 || total <= 0) {
    return null;
  }

  const cx = 50;
  const cy = 50;
  const outerR = 42;
  const innerR = 24;
  let angle = 0;
  const arcs = slices.map((s) => {
    const sweep = (s.value / total) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return { ...s, start, end, pct: (s.value / total) * 100 };
  });

  const active = hover != null ? arcs[hover] : null;

  return (
    <div
      key={replayKey}
      className="flex h-full min-h-[220px] flex-col items-center justify-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-6"
    >
      <div className="relative aspect-square w-[188px] shrink-0 sm:w-[200px]">
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          style={{
            transform: on ? "scale(1)" : "scale(0.86)",
            opacity: on ? 1 : 0,
            transition:
              "transform 0.55s cubic-bezier(0.16,1,0.3,1), opacity 0.35s ease",
          }}
        >
          {arcs.map((arc, i) => (
            <path
              key={arc.label}
              d={donutSlicePath(cx, cy, outerR, innerR, arc.start, arc.end)}
              fill={arc.color}
              opacity={hover == null || hover === i ? 1 : 0.35}
              className="cursor-pointer transition-opacity duration-200"
              style={{
                transformOrigin: "50% 50%",
                transform: hover === i ? "scale(1.03)" : "scale(1)",
                transition: "opacity 0.2s ease, transform 0.2s ease",
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          {active ? (
            <>
              <span className="max-w-[7.5rem] truncate text-xs text-muted">
                {active.label}
              </span>
              <span className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                {active.pct.toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-xs text-muted">{totalLabel}</span>
              <span className="mt-0.5 max-w-[7.5rem] text-base font-semibold leading-tight tabular-nums text-foreground">
                {formatValue(total)}
              </span>
            </>
          )}
        </div>
      </div>

      <ul className="w-max max-w-[11rem] shrink-0 space-y-1.5">
        {arcs.map((arc, i) => (
          <li
            key={arc.label}
            className={`flex cursor-pointer items-center gap-1.5 rounded-[6px] py-0.5 pr-0.5 transition-colors ${
              hover === i ? "bg-chip" : "hover:bg-chip/60"
            }`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            title={`${arc.label} · ${formatValue(arc.value)} · ${saleLabel} ${formatValue(arc.sale)} · ${purchaseLabel} ${formatValue(arc.purchase)}`}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ background: arc.color }}
            />
            <span className="max-w-[6rem] truncate text-xs leading-none text-foreground">
              {arc.label}
            </span>
            <span className="shrink-0 text-xs leading-none tabular-nums text-muted">
              {arc.pct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function aggregateMaterialStats(
  tickets: WeighTicket[],
  otherLabel: string,
): MaterialBucket[] {
  const map = new Map<string, MaterialBucket>();
  for (const ticket of tickets) {
    const name = ticket.materialSummary?.trim();
    if (!name || name === "—") continue;
    const row = map.get(name) ?? {
      name,
      saleAmount: 0,
      purchaseAmount: 0,
      saleKg: 0,
      purchaseKg: 0,
    };
    if (ticket.direction === "sale") {
      row.saleAmount += ticket.amount;
      row.saleKg += ticket.netKg;
    } else {
      row.purchaseAmount += ticket.amount;
      row.purchaseKg += ticket.netKg;
    }
    map.set(name, row);
  }

  const sorted = [...map.values()].sort(
    (a, b) =>
      b.saleAmount +
      b.purchaseAmount -
      (a.saleAmount + a.purchaseAmount),
  );
  if (sorted.length <= 8) return sorted;

  const top = sorted.slice(0, 7);
  const rest = sorted.slice(7);
  const other: MaterialBucket = {
    name: otherLabel,
    saleAmount: 0,
    purchaseAmount: 0,
    saleKg: 0,
    purchaseKg: 0,
  };
  for (const row of rest) {
    other.saleAmount += row.saleAmount;
    other.purchaseAmount += row.purchaseAmount;
    other.saleKg += row.saleKg;
    other.purchaseKg += row.purchaseKg;
  }
  return [...top, other];
}

function Gauge({
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

function SectionCard({
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


function CustomerTopList({
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

function CashGlance({
  cashBalance,
  received,
  paid,
  miscIncome,
  miscExpense,
  replayKey,
}: {
  cashBalance: number;
  received: number;
  paid: number;
  miscIncome: number;
  miscExpense: number;
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
    </div>
  );
}

function SettleOverview({
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

export default function DashboardView() {
  const { t } = useI18n();
  const {
    weighTickets,
    receivables,
    payables,
    payments,
    tenant,
  } = useMockStore();

  const [preset, setPreset] = useState<RangePreset>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [materialMetric, setMaterialMetric] = useState<"amount" | "weight">(
    "amount",
  );

  /** 演示：以业务数据最晚日期为「今日」锚点，避免真实日历与种子数据错位导致空白 */
  const anchorDate = useMemo(() => {
    const keys = [
      ...weighTickets.map((row) => toDateKey(row.date)),
      ...payments.map((row) => toDateKey(row.date)),
    ]
      .filter(Boolean)
      .sort();
    return keys.length ? parseDate(keys[keys.length - 1]) : startOfLocalToday();
  }, [weighTickets, payments]);

  const range = useMemo(() => {
    if (preset === "today") {
      const key = formatIso(anchorDate);
      return { start: key, end: key };
    }
    if (preset === "week") {
      return {
        start: formatIso(startOfWeekMon(anchorDate)),
        end: formatIso(endOfWeekMon(anchorDate)),
      };
    }
    if (preset === "month") {
      return {
        start: formatIso(startOfMonthDate(anchorDate)),
        end: formatIso(endOfMonthDate(anchorDate)),
      };
    }
    let start = customStart || formatIso(addDays(anchorDate, -6));
    let end = customEnd || formatIso(anchorDate);
    if (start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }
    return { start, end };
  }, [preset, customStart, customEnd, anchorDate]);

  const rangeOptions = useMemo(
    () => [
      { value: "custom", label: t("dashboard.rangeCustom") },
      { value: "today", label: t("dashboard.rangeToday") },
      { value: "week", label: t("dashboard.rangeWeek") },
      { value: "month", label: t("dashboard.rangeMonth") },
    ],
    [t],
  );

  function handlePresetChange(next: string) {
    const value = next as RangePreset;
    if (value === "custom") {
      setCustomStart((prev) => prev || range.start);
      setCustomEnd((prev) => prev || range.end);
    }
    setPreset(value);
  }

  function handleRangeChange(start: string, end: string) {
    setCustomStart(start);
    setCustomEnd(end);
    setPreset("custom");
  }

  const stats = useMemo(() => {
    const normal = weighTickets.filter(
      (ticket) =>
        ticket.status === "normal" &&
        inDateRange(ticket.date, range.start, range.end),
    );
    const sales = normal.filter((ticket) => ticket.direction === "sale");
    const purchases = normal.filter((ticket) => ticket.direction === "purchase");
    const salesAmount = sales.reduce((sum, ticket) => sum + ticket.amount, 0);
    const purchaseAmount = purchases.reduce(
      (sum, ticket) => sum + ticket.amount,
      0,
    );

    const periodPayments = payments.filter((payment) =>
      inDateRange(payment.date, range.start, range.end),
    );
    const received = periodPayments
      .filter((payment) => payment.type === "receipt")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const paid = periodPayments
      .filter((payment) => payment.type === "payment")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const miscIncome = periodPayments
      .filter((payment) => isMiscPayment(payment) && payment.type === "receipt")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const miscExpense = periodPayments
      .filter((payment) => isMiscPayment(payment) && payment.type === "payment")
      .reduce((sum, payment) => sum + payment.amount, 0);

    /** 现金结余：截至区间结束日的累计收付（随结束日变化） */
    const receivedToEnd = payments
      .filter(
        (payment) =>
          payment.type === "receipt" && toDateKey(payment.date) <= range.end,
      )
      .reduce((sum, payment) => sum + payment.amount, 0);
    const paidToEnd = payments
      .filter(
        (payment) =>
          payment.type === "payment" && toDateKey(payment.date) <= range.end,
      )
      .reduce((sum, payment) => sum + payment.amount, 0);

    const periodAr = receivables.filter((row) =>
      inDateRange(row.date, range.start, range.end),
    );
    const periodAp = payables.filter((row) =>
      inDateRange(row.date, range.start, range.end),
    );
    const arTotal = periodAr.reduce((sum, row) => sum + row.amount, 0);
    const arSettled = periodAr.reduce((sum, row) => sum + row.settledAmount, 0);
    const apTotal = periodAp.reduce((sum, row) => sum + row.amount, 0);
    const apSettled = periodAp.reduce((sum, row) => sum + row.settledAmount, 0);

    return {
      salesAmount,
      purchaseAmount,
      grossMargin: salesAmount - purchaseAmount,
      ticketCount: normal.length,
      purchaseNetKg: purchases.reduce((sum, ticket) => sum + ticket.netKg, 0),
      saleNetKg: sales.reduce((sum, ticket) => sum + ticket.netKg, 0),
      received,
      paid,
      miscIncome,
      miscExpense,
      cashBalance: tenant.openingCash + receivedToEnd - paidToEnd,
      arBalance: periodAr.reduce((sum, row) => sum + row.balance, 0),
      apBalance: periodAp.reduce((sum, row) => sum + row.balance, 0),
      arSettleRate: arTotal > 0 ? (arSettled / arTotal) * 100 : 0,
      apSettleRate: apTotal > 0 ? (apSettled / apTotal) * 100 : 0,
      arSettled,
      arTotal,
    };
  }, [
    weighTickets,
    receivables,
    payables,
    payments,
    tenant.openingCash,
    range.start,
    range.end,
  ]);

  const charts = useMemo(() => {
    const normal = weighTickets.filter(
      (ticket) =>
        ticket.status === "normal" &&
        inDateRange(ticket.date, range.start, range.end),
    );
    const dayKeys = eachDayKeys(range.start, range.end);
    const byDay = new Map(
      dayKeys.map((key) => [key, { sales: 0, purchase: 0, count: 0 }]),
    );

    for (const ticket of normal) {
      const bucket = byDay.get(toDateKey(ticket.date));
      if (!bucket) continue;
      if (ticket.direction === "sale") bucket.sales += ticket.amount;
      else bucket.purchase += ticket.amount;
      bucket.count += 1;
    }

    const filledDays = [...byDay.values()].filter((day) => day.count > 0).length;
    if (filledDays <= 1 && dayKeys.length > 1) {
      const salesTotal = stats.salesAmount || 1;
      const purchaseTotal = stats.purchaseAmount || 1;
      const n = dayKeys.length;
      dayKeys.forEach((key, i) => {
        const wave = 0.55 + seededUnit(`${key}-s`) * 0.7;
        const waveP = 0.5 + seededUnit(`${key}-p`) * 0.75;
        const row = byDay.get(key)!;
        row.sales = Math.round(salesTotal * (wave / n) * (0.85 + (i / n) * 0.3));
        row.purchase = Math.round(
          purchaseTotal * (waveP / n) * (0.8 + ((n - 1 - i) / n) * 0.25),
        );
        row.count = Math.max(
          1,
          Math.round(stats.ticketCount * ((wave + waveP) / (2 * n))),
        );
      });
      const salesSum =
        dayKeys.reduce((sum, key) => sum + byDay.get(key)!.sales, 0) || 1;
      const purchaseSum =
        dayKeys.reduce((sum, key) => sum + byDay.get(key)!.purchase, 0) || 1;
      dayKeys.forEach((key) => {
        const row = byDay.get(key)!;
        row.sales = Math.round((row.sales / salesSum) * salesTotal);
        row.purchase = Math.round((row.purchase / purchaseSum) * purchaseTotal);
      });
    }

    const salesSeries = dayKeys.map((key) => byDay.get(key)!.sales);
    const purchaseSeries = dayKeys.map((key) => byDay.get(key)!.purchase);
    const labels = dayKeys.map((key) => {
      const d = parseDate(key);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    const customerMap = new Map<string, number>();
    for (const ticket of normal) {
      if (!ticket.customerName || ticket.customerName === "—") continue;
      customerMap.set(
        ticket.customerName,
        (customerMap.get(ticket.customerName) ?? 0) + ticket.amount,
      );
    }
    const topCustomers = [...customerMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const customerMax = topCustomers[0]?.[1] ?? 1;
    const customerPeriodTotal = [...customerMap.values()].reduce(
      (s, v) => s + v,
      0,
    );

    const materials = aggregateMaterialStats(normal, "__other__");
    const materialLabels = materials.map((row) => row.name);
    const materialSaleAmount = materials.map((row) => row.saleAmount);
    const materialPurchaseAmount = materials.map((row) => row.purchaseAmount);
    const materialSaleKg = materials.map((row) => row.saleKg);
    const materialPurchaseKg = materials.map((row) => row.purchaseKg);

    const mid = Math.floor(salesSeries.length / 2);
    const sum = (arr: number[], from: number, to: number) =>
      arr.slice(from, to).reduce((s, v) => s + v, 0);
    const half = Math.max(mid, 1);
    const len = salesSeries.length;

    /** 环比：所选区间日序列后半段 vs 前半段 */
    const momSales = pctChange(
      sum(salesSeries, half, len),
      sum(salesSeries, 0, half),
    );
    const momPurchase = pctChange(
      sum(purchaseSeries, half, len),
      sum(purchaseSeries, 0, half),
    );
    const momMargin = pctChange(
      sum(salesSeries, half, len) - sum(purchaseSeries, half, len),
      sum(salesSeries, 0, half) - sum(purchaseSeries, 0, half),
    );
    const momTickets = pctChange(
      dayKeys.slice(half).reduce((s, k) => s + byDay.get(k)!.count, 0),
      dayKeys.slice(0, half).reduce((s, k) => s + byDay.get(k)!.count, 0),
    );

    /** 同比：当前区间合计 vs 去年同日起止合计 */
    const yoyStart = shiftYears(range.start, -1);
    const yoyEnd = shiftYears(range.end, -1);
    let yoySales = 0;
    let yoyPurchase = 0;
    let yoyTickets = 0;
    for (const ticket of weighTickets) {
      if (ticket.status !== "normal") continue;
      if (!inDateRange(ticket.date, yoyStart, yoyEnd)) continue;
      yoyTickets += 1;
      if (ticket.direction === "sale") yoySales += ticket.amount;
      else yoyPurchase += ticket.amount;
    }

    return {
      salesSeries,
      purchaseSeries,
      labels,
      topCustomers,
      customerMax,
      customerPeriodTotal,
      materialLabels,
      materialSaleAmount,
      materialPurchaseAmount,
      materialSaleKg,
      materialPurchaseKg,
      changeMomSales: momSales,
      changeMomPurchase: momPurchase,
      changeMomMargin: momMargin,
      changeMomTickets: momTickets,
      changeYoySales: pctChange(stats.salesAmount, yoySales),
      changeYoyPurchase: pctChange(stats.purchaseAmount, yoyPurchase),
      changeYoyMargin: pctChange(
        stats.salesAmount - stats.purchaseAmount,
        yoySales - yoyPurchase,
      ),
      changeYoyTickets: pctChange(stats.ticketCount, yoyTickets),
    };
  }, [
    weighTickets,
    stats.salesAmount,
    stats.purchaseAmount,
    stats.ticketCount,
    range.start,
    range.end,
  ]);

  const recent = useMemo(
    () =>
      [...weighTickets]
        .filter(
          (ticket) =>
            ticket.status === "normal" &&
            inDateRange(ticket.date, range.start, range.end),
        )
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [weighTickets, range.start, range.end],
  );

  const recentColumns: Column<WeighTicket>[] = [
    {
      key: "bx",
      header: t("dashboard.colBx"),
      render: (r) => <span className="font-medium tabular-nums">{r.bxNo}</span>,
    },
    {
      key: "dir",
      header: t("dashboard.colDirection"),
      render: (r) => (
        <StatusBadge tone={r.direction === "purchase" ? "info" : "accent"}>
          {r.direction === "purchase" ? t("common.purchase") : t("common.sale")}
        </StatusBadge>
      ),
    },
    {
      key: "customer",
      header: t("dashboard.colCustomer"),
      render: (r) => r.customerName,
    },
    {
      key: "material",
      header: t("dashboard.colMaterial"),
      render: (r) => r.materialSummary,
    },
    {
      key: "net",
      header: t("dashboard.colNet"),
      className: "text-right",
      render: (r) => <span className="tabular-nums">{formatKg(r.netKg)}</span>,
    },
    {
      key: "amt",
      header: t("dashboard.colAmount"),
      className: "text-right",
      render: (r) => (
        <span className="tabular-nums">{formatMoney(r.amount)}</span>
      ),
    },
  ];

  const motionKey = `${range.start}_${range.end}`;

  return (
    <div className="ui-page-scroll">
      <PageHeader
        title={t("dashboard.title")}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {preset === "custom" ? (
              <DateRangePicker
                size="sm"
                start={customStart || range.start}
                end={customEnd || range.end}
                onChange={handleRangeChange}
                aria-label={t("form.pickDateRange")}
                className="min-w-[220px]"
              />
            ) : null}
            <SegmentedControl
              value={preset}
              onChange={handlePresetChange}
              options={rangeOptions}
              aria-label={t("dashboard.rangePresetAria")}
              className="w-full min-w-[280px] sm:w-auto"
            />
          </div>
        }
      />

      {/* KPI 列 */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            {
              label: t("dashboard.salesAmount"),
              raw: stats.salesAmount,
              format: formatMoney,
              changeMom: charts.changeMomSales,
              changeYoy: charts.changeYoySales,
              icon: <TrendUp size={20} weight="duotone" />,
              iconTone: "brand" as const,
              delay: 40,
            },
            {
              label: t("dashboard.purchaseAmount"),
              raw: stats.purchaseAmount,
              format: formatMoney,
              changeMom: charts.changeMomPurchase,
              changeYoy: charts.changeYoyPurchase,
              icon: <ArrowDownLeft size={20} weight="duotone" />,
              iconTone: "warning" as const,
              delay: 90,
            },
            {
              label: t("dashboard.grossMargin"),
              raw: stats.grossMargin,
              format: formatMoney,
              changeMom: charts.changeMomMargin,
              changeYoy: charts.changeYoyMargin,
              hint: t("dashboard.grossMarginHint"),
              icon: <CurrencyCircleDollar size={20} weight="duotone" />,
              iconTone: "success" as const,
              delay: 140,
            },
            {
              label: t("dashboard.ticketCount"),
              raw: stats.ticketCount,
              format: (n: number) => String(Math.round(n)),
              changeMom: charts.changeMomTickets,
              changeYoy: charts.changeYoyTickets,
              hint: `${formatKg(stats.purchaseNetKg)} / ${formatKg(stats.saleNetKg)} KG`,
              icon: <Scales size={20} weight="duotone" />,
              iconTone: "info" as const,
              delay: 190,
            },
          ] as const
        ).map((card) => (
          <DashReveal key={card.label} delayMs={card.delay}>
            <StatCard
              label={card.label}
              value={card.format(card.raw)}
              rawValue={card.raw}
              formatRaw={card.format}
              replayKey={motionKey}
              changeMom={card.changeMom}
              changeYoy={card.changeYoy}
              momLabel={t("dashboard.compareMom")}
              yoyLabel={t("dashboard.compareYoy")}
              hint={"hint" in card ? card.hint : undefined}
              icon={card.icon}
              iconTone={card.iconTone}
            />
          </DashReveal>
        ))}
      </div>

      {/* 主內容：趋势 | 货类饼图 → 客户+结算 → 近日过磅+资金 */}
      <div className="flex flex-col gap-4">
        <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <SectionCard
            title={t("form.salesVsPurchase")}
            delayMs={220}
            action={
              <div className="flex items-center gap-3 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ backgroundColor: DIRECTION_SALE_COLOR }}
                  />
                  {t("common.sale")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ backgroundColor: DIRECTION_PURCHASE_COLOR }}
                  />
                  {t("common.purchase")}
                </span>
              </div>
            }
          >
            <div className="-mx-3">
              <LineChart
                sales={charts.salesSeries}
                purchases={charts.purchaseSeries}
                labels={charts.labels}
                ariaLabel={t("form.trendAria")}
                replayKey={motionKey}
              />
            </div>
          </SectionCard>

          <SectionCard
            title={t("form.materialByType")}
            delayMs={260}
            action={
              <SegmentedControl
                size="sm"
                value={materialMetric}
                onChange={(v) =>
                  setMaterialMetric(v === "weight" ? "weight" : "amount")
                }
                options={[
                  {
                    value: "amount",
                    label: t("form.materialTabAmount"),
                  },
                  {
                    value: "weight",
                    label: t("form.materialTabWeight"),
                  },
                ]}
                aria-label={t("form.materialByType")}
                className="w-auto min-w-0 shrink-0"
              />
            }
          >
            {charts.materialLabels.length === 0 ? (
              <p className="text-sm text-muted">{t("common.empty")}</p>
            ) : (
              <MaterialPieChart
                labels={charts.materialLabels.map((name) =>
                  name === "__other__" ? t("form.materialOther") : name,
                )}
                sales={
                  materialMetric === "amount"
                    ? charts.materialSaleAmount
                    : charts.materialSaleKg
                }
                purchases={
                  materialMetric === "amount"
                    ? charts.materialPurchaseAmount
                    : charts.materialPurchaseKg
                }
                formatValue={
                  materialMetric === "amount"
                    ? formatMoney
                    : (n) => `${formatKg(n)} KG`
                }
                saleLabel={t("common.sale")}
                purchaseLabel={t("common.purchase")}
                totalLabel={t("form.materialPieTotal")}
                replayKey={`${motionKey}-${materialMetric}`}
              />
            )}
          </SectionCard>
        </div>

        <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <SectionCard title={t("form.customerTop")} delayMs={320}>
            {charts.topCustomers.length === 0 ? (
              <p className="text-sm text-muted">{t("common.empty")}</p>
            ) : (
              <CustomerTopList
                items={charts.topCustomers}
                max={charts.customerMax}
                periodTotal={charts.customerPeriodTotal}
                replayKey={motionKey}
              />
            )}
          </SectionCard>

          <SectionCard title={t("form.settleOverview")} delayMs={340}>
            <SettleOverview
              arSettleRate={stats.arSettleRate}
              apSettleRate={stats.apSettleRate}
              arSettled={stats.arSettled}
              arTotal={stats.arTotal}
              arBalance={stats.arBalance}
              apBalance={stats.apBalance}
              replayKey={motionKey}
            />
          </SectionCard>
        </div>

        <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <SectionCard
            title={t("dashboard.recentTickets")}
            flush
            delayMs={380}
            action={
              <span className="text-xs text-muted">
                {t("form.recentCount", { count: recent.length })}
              </span>
            }
          >
            <DataTable
              columns={recentColumns}
              rows={recent}
              rowKey={(r) => r.id}
              pageSize={6}
              embedded
              showPagination={false}
            />
          </SectionCard>

          <SectionCard title={t("form.cashGlance")} delayMs={420}>
            <CashGlance
              cashBalance={stats.cashBalance}
              received={stats.received}
              paid={stats.paid}
              miscIncome={stats.miscIncome}
              miscExpense={stats.miscExpense}
              replayKey={motionKey}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
