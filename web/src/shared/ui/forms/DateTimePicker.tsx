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
import {
  formatWeighDateTime,
  joinLocalDateTime,
  nowLocalDateTime,
  splitLocalDateTime,
  todayISO,
} from "@/shared/lib/date";
import { useI18n } from "@/shared/i18n";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  error?: boolean;
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

function parseTimeParts(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(":");
  const hour = Math.min(23, Math.max(0, Number(h) || 0));
  const minute = Math.min(59, Math.max(0, Number(m) || 0));
  return { hour, minute };
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const WEEKDAYS_ZH = ["日", "一", "二", "三", "四", "五", "六"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Minute-precision local datetime (YYYY-MM-DDTHH:mm) in a unified panel. */
export function DateTimePicker({
  value,
  onChange,
  disabled,
  size = "md",
  error,
  className = "",
  id,
  "aria-label": ariaLabel,
}: DateTimePickerProps) {
  const { t, locale } = useI18n();
  const resolvedPlaceholder = t("form.pickDateTime");
  const weekdays = locale === "en" ? WEEKDAYS_EN : WEEKDAYS_ZH;
  const committed = splitLocalDateTime(value || nowLocalDateTime());

  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(committed.date);
  const [draftHour, setDraftHour] = useState(() => parseTimeParts(committed.time).hour);
  const [draftMinute, setDraftMinute] = useState(() => parseTimeParts(committed.time).minute);
  const [viewYear, setViewYear] = useState(() => {
    const parsed = parseIso(committed.date);
    return parsed?.getFullYear() ?? new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const parsed = parseIso(committed.date);
    return parsed?.getMonth() ?? new Date().getMonth();
  });
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minuteColRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => {
    const now = new Date();
    return toIso(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const monthTitle =
    locale === "en"
      ? `${viewYear}/${viewMonth + 1}`
      : `${viewYear}年${viewMonth + 1}月`;

  const syncDraftFromValue = useCallback(() => {
    const next = splitLocalDateTime(value || nowLocalDateTime());
    const { hour, minute } = parseTimeParts(next.time);
    setDraftDate(next.date);
    setDraftHour(hour);
    setDraftMinute(minute);
    const parsed = parseIso(next.date);
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    syncDraftFromValue();
  }, [open, syncDraftFromValue]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelWidth = 432;
    const panelHeight = 340;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < panelHeight && rect.top > spaceBelow;
    setPanelStyle({
      position: "fixed",
      left: Math.min(rect.left, window.innerWidth - panelWidth - 8),
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

  useLayoutEffect(() => {
    if (!open) return;
    hourColRef.current
      ?.querySelector(".is-selected")
      ?.scrollIntoView({ block: "center" });
    minuteColRef.current
      ?.querySelector(".is-selected")
      ?.scrollIntoView({ block: "center" });
  }, [open, draftHour, draftMinute]);

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

  function handlePickNow() {
    const now = nowLocalDateTime();
    const { date, time } = splitLocalDateTime(now);
    const { hour, minute } = parseTimeParts(time);
    setDraftDate(date);
    setDraftHour(hour);
    setDraftMinute(minute);
    const parsed = parseIso(date);
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }

  function handleConfirm() {
    const date = draftDate || todayISO();
    const time = `${pad(draftHour)}:${pad(draftMinute)}`;
    onChange(joinLocalDateTime(date, time));
    setOpen(false);
    triggerRef.current?.focus();
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

  const display = value ? formatWeighDateTime(value) : resolvedPlaceholder;

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            className="ui-panel ui-datetime-panel"
            style={panelStyle}
            role="dialog"
            aria-label={t("form.pickDateTime")}
          >
            <div className="ui-datetime-body">
              <div className="ui-datetime-calendar">
                <div className="ui-datepicker-header">
                  <button
                    type="button"
                    className="ui-datepicker-nav"
                    onClick={prevMonth}
                    aria-label={t("form.prevMonth")}
                  >
                    <CaretLeft size={14} weight="bold" />
                  </button>
                  <div className="ui-datepicker-title">{monthTitle}</div>
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
                    const isSelected = cell.iso === draftDate;
                    const isToday = cell.iso === today;
                    return (
                      <button
                        key={cell.iso + (cell.muted ? "-m" : "")}
                        type="button"
                        className={`ui-datepicker-day${cell.muted ? " is-muted" : ""}${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}`}
                        onClick={() => setDraftDate(cell.iso)}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="ui-datetime-time">
                <div ref={hourColRef} className="ui-datetime-time-col" aria-label="Hour">
                  {HOURS.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      className={`ui-datetime-time-item${hour === draftHour ? " is-selected" : ""}`}
                      onClick={() => setDraftHour(hour)}
                    >
                      {pad(hour)}
                    </button>
                  ))}
                </div>
                <div ref={minuteColRef} className="ui-datetime-time-col" aria-label="Minute">
                  {MINUTES.map((minute) => (
                    <button
                      key={minute}
                      type="button"
                      className={`ui-datetime-time-item${minute === draftMinute ? " is-selected" : ""}`}
                      onClick={() => setDraftMinute(minute)}
                    >
                      {pad(minute)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="ui-datetime-footer">
              <button
                type="button"
                className="ui-datetime-now"
                onClick={handlePickNow}
              >
                {t("form.pickNow")}
              </button>
              <button
                type="button"
                className="ui-btn-primary ui-datetime-confirm"
                onClick={handleConfirm}
              >
                {t("common.confirm")}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        type="datetime-local"
        value={value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) ? value.slice(0, 16) : ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (!raw) return;
          onChange(raw.slice(0, 16));
        }}
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
        aria-label={ariaLabel ?? t("form.pickDateTime")}
        className={`ui-control-trigger${size === "sm" ? " is-sm" : ""}${open ? " is-open" : ""}${error ? " is-error" : ""}`}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        onKeyDown={onKeyDown}
      >
        <span className={`ui-control-value${value ? "" : " is-placeholder"} tabular-nums`}>
          {display}
        </span>
        <CalendarBlank size={16} className="shrink-0 text-muted" />
      </button>
      {panel}
    </div>
  );
}
