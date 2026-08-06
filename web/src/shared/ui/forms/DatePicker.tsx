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
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  error?: boolean;
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

function startOfMonth(y: number, m: number) {
  return new Date(y, m, 1);
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

const WEEKDAYS_ZH = ["日", "一", "二", "三", "四", "五", "六"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DatePicker({
  value,
  onChange,
  disabled,
  size = "md",
  error,
  placeholder,
  className = "",
  id,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const { t, locale } = useI18n();
  const resolvedPlaceholder = placeholder ?? t("form.pickDate");
  const weekdays = locale === "en" ? WEEKDAYS_EN : WEEKDAYS_ZH;
  const parsed = parseIso(value);
  const today = useMemo(() => {
    const t = new Date();
    return toIso(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    () => parsed?.getFullYear() ?? new Date().getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    () => parsed?.getMonth() ?? new Date().getMonth(),
  );
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const monthTitle =
    locale === "en"
      ? `${viewYear}/${viewMonth + 1}`
      : `${viewYear}年${viewMonth + 1}月`;

  useEffect(() => {
    if (!open) return;
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [open, parsed]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 320 && rect.top > spaceBelow;
    setPanelStyle({
      position: "fixed",
      left: Math.min(rect.left, window.innerWidth - 292),
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
      if (
        !rootRef.current?.contains(e.target as Node) &&
        !panelRef.current?.contains(e.target as Node)
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

  const cells = useMemo(() => {
    const first = startOfMonth(viewYear, viewMonth);
    const startWeekday = first.getDay();
    const dim = daysInMonth(viewYear, viewMonth);
    const prevDim = daysInMonth(
      viewMonth === 0 ? viewYear - 1 : viewYear,
      viewMonth === 0 ? 11 : viewMonth - 1,
    );
    const items: { iso: string; day: number; muted: boolean }[] = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevDim - i;
      const py = viewMonth === 0 ? viewYear - 1 : viewYear;
      const pm = viewMonth === 0 ? 11 : viewMonth - 1;
      items.push({ iso: toIso(py, pm, d), day: d, muted: true });
    }
    for (let d = 1; d <= dim; d++) {
      items.push({
        iso: toIso(viewYear, viewMonth, d),
        day: d,
        muted: false,
      });
    }
    const rest = 42 - items.length;
    for (let d = 1; d <= rest; d++) {
      const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
      const nm = viewMonth === 11 ? 0 : viewMonth + 1;
      items.push({ iso: toIso(ny, nm, d), day: d, muted: true });
    }
    return items;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (
      !open &&
      (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")
    ) {
      e.preventDefault();
      setOpen(true);
    }
  }

  const display = value || resolvedPlaceholder;

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            className="ui-panel ui-datepicker-panel"
            style={panelStyle}
            role="dialog"
            aria-label={t("form.pickDate")}
          >
            <div className="ui-datepicker-header">
              <button
                type="button"
                className="ui-datepicker-nav"
                onClick={prevMonth}
                aria-label={t("form.prevMonth")}
              >
                <CaretLeft size={14} weight="bold" />
              </button>
              <div className="ui-datepicker-title">
                {monthTitle}
              </div>
              <button
                type="button"
                className="ui-datepicker-nav"
                onClick={nextMonth}
                aria-label={t("form.nextMonth")}
              >
                <CaretRight size={14} weight="bold" />
              </button>
            </div>
            <div className="ui-datepicker-weekdays">
              {weekdays.map((w) => (
                <div key={w} className="ui-datepicker-weekday">
                  {w}
                </div>
              ))}
            </div>
            <div className="ui-datepicker-grid">
              {cells.map((cell) => {
                const isSelected = cell.iso === value;
                const isToday = cell.iso === today;
                return (
                  <button
                    key={cell.iso + (cell.muted ? "-m" : "")}
                    type="button"
                    className={`ui-datepicker-day${cell.muted ? " is-muted" : ""}${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}`}
                    onClick={() => {
                      onChange(cell.iso);
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Fallback native for mobile / a11y parsers */}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        disabled={disabled}
      />
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel ?? t("form.pickDate")}
        className={`ui-control-trigger${size === "sm" ? " is-sm" : ""}${open ? " is-open" : ""}${error ? " is-error" : ""}`}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        onKeyDown={onKeyDown}
      >
        <span className={`ui-control-value${value ? "" : " is-placeholder"}`}>
          {display}
        </span>
        <CalendarBlank size={16} className="shrink-0 text-muted" />
      </button>
      {panel}
    </div>
  );
}
