"use client";

import { useEffect, useState } from "react";
import {
  DIRECTION_PURCHASE_COLOR,
  DIRECTION_SALE_COLOR,
} from "@/shared/lib/direction-colors";
import type { WeighTicket } from "@/entities/types";

type ChartPoint = { x: number; y: number };

function chartPoints(
  values: number[],
  toX: (i: number) => number,
  toY: (v: number) => number,
): ChartPoint[] {
  return values.map((v, i) => ({ x: toX(i), y: toY(v) }));
}

/** Catmull-Rom 转三次贝塞尔，生成平滑圆弧折线 */
function smoothLinePath(points: ChartPoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function smoothAreaPath(
  values: number[],
  toX: (i: number) => number,
  toY: (v: number) => number,
  baseY: number,
): string {
  if (values.length === 0) return "";
  const points = chartPoints(values, toX, toY);
  const line = smoothLinePath(points);
  const lastX = points[points.length - 1].x;
  const firstX = points[0].x;
  return `${line} L ${lastX.toFixed(1)} ${baseY} L ${firstX.toFixed(1)} ${baseY} Z`;
}

export function LineChart({
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
  const baseY = h - padB;

  const salesPoints = chartPoints(sales, toX, toY);
  const purchasePoints = chartPoints(purchases, toX, toY);
  const salesLine = smoothLinePath(salesPoints);
  const purchaseLine = smoothLinePath(purchasePoints);
  const salesArea = smoothAreaPath(sales, toX, toY, baseY);

  const gradKey = replayKey.replace(/[^a-zA-Z0-9]/g, "") || "default";
  const saleGradId = `dash-sale-grad-${gradKey}`;

  return (
    <svg
      key={replayKey}
      viewBox={`0 0 ${w} ${h}`}
      className="block w-full aspect-[40/11]"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient
          id={saleGradId}
          x1="0"
          y1={padT}
          x2="0"
          y2={baseY}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={DIRECTION_SALE_COLOR} stopOpacity="0.32" />
          <stop offset="55%" stopColor={DIRECTION_SALE_COLOR} stopOpacity="0.1" />
          <stop offset="100%" stopColor={DIRECTION_SALE_COLOR} stopOpacity="0" />
        </linearGradient>
      </defs>
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
        d={salesArea}
        fill={`url(#${saleGradId})`}
      />
      <path
        className="dash-line-draw"
        pathLength={1}
        d={salesLine}
        fill="none"
        stroke={DIRECTION_SALE_COLOR}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="dash-line-draw"
        pathLength={1}
        d={purchaseLine}
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

export type MaterialBucket = {
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

export function MaterialPieChart({
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
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [hiddenLabels, setHiddenLabels] = useState<Set<string>>(() => new Set());

  const slices = labels
    .map((label, i) => ({
      label,
      sale: sales[i] ?? 0,
      purchase: purchases[i] ?? 0,
      value: (sales[i] ?? 0) + (purchases[i] ?? 0),
      color: MATERIAL_PIE_COLORS[i % MATERIAL_PIE_COLORS.length],
    }))
    .filter((s) => s.value > 0);

  const fullTotal = slices.reduce((sum, s) => sum + s.value, 0);
  const visibleSlices = slices.filter((s) => !hiddenLabels.has(s.label));
  const chartTotal = visibleSlices.reduce((sum, s) => sum + s.value, 0);

  useEffect(() => {
    setOn(false);
    setHoverLabel(null);
    setHiddenLabels(new Set());
    const id = window.setTimeout(() => setOn(true), 40);
    return () => window.clearTimeout(id);
  }, [replayKey, slices.map((s) => `${s.label}:${s.value}`).join("|")]);

  function toggleSlice(label: string) {
    setHiddenLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
        return next;
      }
      const remaining = slices.filter((s) => !next.has(s.label) && s.label !== label);
      if (remaining.length === 0) return prev;
      next.add(label);
      return next;
    });
    setHoverLabel(null);
  }

  if (slices.length === 0 || fullTotal <= 0) {
    return null;
  }

  const cx = 50;
  const cy = 50;
  const outerR = 42;
  const innerR = 24;
  let angle = 0;
  const visibleArcs = visibleSlices.map((s) => {
    const sweep = chartTotal > 0 ? (s.value / chartTotal) * 360 : 0;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return {
      ...s,
      start,
      end,
      pct: chartTotal > 0 ? (s.value / chartTotal) * 100 : 0,
    };
  });

  const active =
    hoverLabel != null
      ? visibleArcs.find((arc) => arc.label === hoverLabel) ??
        slices.find((s) => s.label === hoverLabel)
      : null;
  const activePct =
    active && chartTotal > 0
      ? (active.value / chartTotal) * 100
      : active
        ? (active.value / fullTotal) * 100
        : 0;

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
          {visibleArcs.map((arc) => (
            <path
              key={arc.label}
              d={donutSlicePath(cx, cy, outerR, innerR, arc.start, arc.end)}
              fill={arc.color}
              opacity={
                hoverLabel == null || hoverLabel === arc.label ? 1 : 0.35
              }
              className="cursor-pointer transition-opacity duration-200"
              style={{
                transformOrigin: "50% 50%",
                transform: hoverLabel === arc.label ? "scale(1.03)" : "scale(1)",
                transition: "opacity 0.2s ease, transform 0.2s ease",
              }}
              onMouseEnter={() => setHoverLabel(arc.label)}
              onMouseLeave={() => setHoverLabel(null)}
              onClick={() => toggleSlice(arc.label)}
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
                {activePct.toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-xs text-muted">{totalLabel}</span>
              <span className="mt-0.5 max-w-[7.5rem] text-base font-semibold leading-tight tabular-nums text-foreground">
                {formatValue(chartTotal > 0 ? chartTotal : fullTotal)}
              </span>
            </>
          )}
        </div>
      </div>

      <ul className="w-max max-w-[11rem] shrink-0 space-y-1.5">
        {slices.map((slice) => {
          const hidden = hiddenLabels.has(slice.label);
          const pct =
            hidden || chartTotal <= 0
              ? (slice.value / fullTotal) * 100
              : (slice.value / chartTotal) * 100;
          const highlighted = !hidden && hoverLabel === slice.label;

          return (
            <li key={slice.label}>
              <button
                type="button"
                className={`flex w-full cursor-pointer items-center gap-1.5 rounded-[6px] py-0.5 pr-0.5 text-left transition-colors ${
                  highlighted ? "bg-chip" : "hover:bg-chip/60"
                } ${hidden ? "opacity-45" : ""}`}
                onMouseEnter={() => {
                  if (!hidden) setHoverLabel(slice.label);
                }}
                onMouseLeave={() => setHoverLabel(null)}
                onClick={() => toggleSlice(slice.label)}
                title={`${slice.label} · ${formatValue(slice.value)} · ${saleLabel} ${formatValue(slice.sale)} · ${purchaseLabel} ${formatValue(slice.purchase)}`}
                aria-pressed={!hidden}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    background: slice.color,
                    opacity: hidden ? 0.35 : 1,
                  }}
                />
                <span
                  className={`max-w-[6rem] truncate text-xs leading-none ${
                    hidden
                      ? "text-muted line-through"
                      : "text-foreground"
                  }`}
                >
                  {slice.label}
                </span>
                <span className="shrink-0 text-xs leading-none tabular-nums text-muted">
                  {pct.toFixed(1)}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function aggregateMaterialStats(
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

