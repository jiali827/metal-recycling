"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  CalendarBlank,
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n";
import { ControlClearButton } from "./ControlClearButton";

interface DateRangePickerProps {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  error?: boolean;
  /** 有值时在右侧显示清空 X，默认开启 */
  allowClear?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseIso(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

function addMonths(y: number, m: number, delta: number) {
  const d = new Date(y, m + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function normalizeRange(a: string, b: string) {
  return a <= b ? ([a, b] as const) : ([b, a] as const);
}

/** 周一为一周起始 */
function buildMonthCells(year: number, month: number) {
  const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const dim = daysInMonth(year, month);
  const prev = addMonths(year, month, -1);
  const prevDim = daysInMonth(prev.year, prev.month);
  const items: { iso: string; day: number; muted: boolean }[] = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevDim - i;
    items.push({
      iso: toIso(prev.year, prev.month, d),
      day: d,
      muted: true,
    });
  }
  for (let d = 1; d <= dim; d++) {
    items.push({
      iso: toIso(year, month, d),
      day: d,
      muted: false,
    });
  }
  const next = addMonths(year, month, 1);
  const rest = 42 - items.length;
  for (let d = 1; d <= rest; d++) {
    items.push({
      iso: toIso(next.year, next.month, d),
      day: d,
      muted: true,
    });
  }
  return items;
}

const WEEKDAYS_ZH = ["一", "二", "三", "四", "五", "六", "日"];
const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DateRangePicker({
  start,
  end,
  onChange,
  disabled,
  size = "md",
  error,
  allowClear = true,
  placeholder,
  className = "",
  id,
  "aria-label": ariaLabel,
}: DateRangePickerProps) {
  const { t, locale } = useI18n();
  const resolvedPlaceholder = placeholder ?? t("form.pickDateRange");
  const weekdays = locale === "en" ? WEEKDAYS_EN : WEEKDAYS_ZH;
  const today = useMemo(() => {
    const now = new Date();
    return toIso(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  /** null = 待选开始；有值 = 已选开始，待选结束 */
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hoverIso, setHoverIso] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(() => {
    const parsed = parseIso(start);
    return parsed?.getFullYear() ?? new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const parsed = parseIso(start);
    return parsed?.getMonth() ?? new Date().getMonth();
  });
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const leftMonth = { year: viewYear, month: viewMonth };
  const rightMonth = addMonths(viewYear, viewMonth, 1);

  const formatMonthTitle = (year: number, month: number) =>
    locale === "en" ? `${year} / ${month + 1}` : `${year}年 ${month + 1}月`;

  /** 仅在打开面板时从 props 同步，避免选区间过程中被重置 */
  useEffect(() => {
    if (!open) return;
    setDraftStart(start);
    setDraftEnd(end);
    setAnchor(null);
    setHoverIso(null);
    const parsed = parseIso(start);
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
    // 故意只依赖 open：打开瞬间读取最新 start/end
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelWidth = Math.min(560, window.innerWidth - 16);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 380 && rect.top > spaceBelow;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - panelWidth - 8,
    );
    setPanelStyle({
      position: "fixed",
      left,
      width: panelWidth,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const leftCells = useMemo(
    () => buildMonthCells(leftMonth.year, leftMonth.month),
    [leftMonth.year, leftMonth.month],
  );
  const rightCells = useMemo(
    () => buildMonthCells(rightMonth.year, rightMonth.month),
    [rightMonth.year, rightMonth.month],
  );

  const previewEnd = anchor
    ? (hoverIso ?? anchor)
    : draftEnd || draftStart;

  const [rangeLo, rangeHi] = useMemo(() => {
    const a = anchor ?? draftStart;
    if (!a) return ["", ""] as const;
    if (!previewEnd) return [a, a] as const;
    return normalizeRange(a, previewEnd);
  }, [anchor, draftStart, previewEnd]);

  function shiftMonths(delta: number) {
    const next = addMonths(viewYear, viewMonth, delta);
    setViewYear(next.year);
    setViewMonth(next.month);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (
      !open &&
      (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")
    ) {
      e.preventDefault();
      setOpen(true);
    }
  }

  function selectDay(iso: string) {
    if (!anchor) {
      // 第一次点击：定开始，进入选结束
      setAnchor(iso);
      setDraftStart(iso);
      setDraftEnd(iso);
      setHoverIso(iso);
      return;
    }
    // 第二次点击：定结束并提交
    const [lo, hi] = normalizeRange(anchor, iso);
    setAnchor(null);
    setHoverIso(null);
    setDraftStart(lo);
    setDraftEnd(hi);
    onChange(lo, hi);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function renderMonth(
    year: number,
    month: number,
    cells: { iso: string; day: number; muted: boolean }[],
    side: "left" | "right",
  ) {
    return (
      <div className="ui-datepicker-month">
        <div className="ui-datepicker-header">
          {side === "left" ? (
            <div className="ui-datepicker-nav-group">
              <button
                type="button"
                className="ui-datepicker-nav"
                onClick={() => shiftMonths(-12)}
                aria-label={t("form.prevYear")}
              >
                <CaretDoubleLeft size={14} weight="bold" />
              </button>
              <button
                type="button"
                className="ui-datepicker-nav"
                onClick={() => shiftMonths(-1)}
                aria-label={t("form.prevMonth")}
              >
                <CaretLeft size={14} weight="bold" />
              </button>
            </div>
          ) : (
            <span className="ui-datepicker-nav-spacer wide" />
          )}
          <div className="ui-datepicker-title">
            {formatMonthTitle(year, month)}
          </div>
          {side === "right" ? (
            <div className="ui-datepicker-nav-group">
              <button
                type="button"
                className="ui-datepicker-nav"
                onClick={() => shiftMonths(1)}
                aria-label={t("form.nextMonth")}
              >
                <CaretRight size={14} weight="bold" />
              </button>
              <button
                type="button"
                className="ui-datepicker-nav"
                onClick={() => shiftMonths(12)}
                aria-label={t("form.nextYear")}
              >
                <CaretDoubleRight size={14} weight="bold" />
              </button>
            </div>
          ) : (
            <span className="ui-datepicker-nav-spacer wide" />
          )}
        </div>
        <div className="ui-datepicker-weekdays">
          {weekdays.map((w) => (
            <div key={`${side}-${w}`} className="ui-datepicker-weekday">
              {w}
            </div>
          ))}
        </div>
        <div className="ui-datepicker-grid">
          {cells.map((cell, index) => {
            const isStart = Boolean(rangeLo) && cell.iso === rangeLo;
            const isEnd = Boolean(rangeHi) && cell.iso === rangeHi;
            const isEndpoint = isStart || isEnd;
            const inRange =
              Boolean(rangeLo && rangeHi) &&
              cell.iso >= rangeLo &&
              cell.iso <= rangeHi;
            const isToday = cell.iso === today;
            return (
              <button
                key={`${side}-${index}-${cell.iso}`}
                type="button"
                className={`ui-datepicker-day${cell.muted ? " is-muted" : ""}${isToday ? " is-today" : ""}${inRange ? " is-in-range" : ""}${isEndpoint ? " is-selected" : ""}${isStart && rangeLo !== rangeHi ? " is-range-start" : ""}${isEnd && rangeLo !== rangeHi ? " is-range-end" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectDay(cell.iso);
                }}
                onMouseEnter={() => {
                  if (anchor) setHoverIso(cell.iso);
                }}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const hasValue = Boolean(start || end);
  const display =
    start && end
      ? `${start} — ${end}`
      : start
        ? `${start} — …`
        : resolvedPlaceholder;
  const showClear = Boolean(allowClear && hasValue && !disabled);

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            className="ui-panel ui-datepicker-panel is-range"
            style={panelStyle}
            role="dialog"
            aria-label={t("form.pickDateRange")}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="ui-datepicker-months">
              {renderMonth(
                leftMonth.year,
                leftMonth.month,
                leftCells,
                "left",
              )}
              {renderMonth(
                rightMonth.year,
                rightMonth.month,
                rightCells,
                "right",
              )}
            </div>
            <p className="ui-datepicker-range-hint">
              {anchor
                ? t("form.pickDateRangeEnd")
                : t("form.pickDateRangeStart")}
            </p>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div
        ref={triggerRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        id={id}
        aria-disabled={disabled || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel ?? t("form.pickDateRange")}
        className={`ui-control-trigger${size === "sm" ? " is-sm" : ""}${open ? " is-open" : ""}${error ? " is-error" : ""}`}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        onKeyDown={onKeyDown}
      >
        <span
          className={`ui-control-value tabular-nums${start && end ? "" : " is-placeholder"}`}
        >
          {display}
        </span>
        <span className="ui-control-suffix">
          {showClear ? (
            <ControlClearButton onClear={() => onChange("", "")} />
          ) : null}
          <CalendarBlank size={16} className="shrink-0 text-muted" aria-hidden />
        </span>
      </div>
      {panel}
    </div>
  );
}
