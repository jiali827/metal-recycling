"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { CaretDown, Check } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  error?: boolean;
  className?: string;
  "aria-label"?: string;
  id?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  size = "md",
  error,
  className = "",
  "aria-label": ariaLabel,
  id,
}: SelectProps) {
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t("form.selectPlaceholder");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);
  const enabledOptions = options.filter((o) => !o.disabled);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 240 && rect.top > spaceBelow;
    setPanelStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 140),
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      maxHeight: 240,
      overflowY: "auto",
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
      if (!rootRef.current?.contains(e.target as Node) &&
          !listRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const enabled = options.filter((o) => !o.disabled);
    const enabledIdx = enabled.findIndex((o) => o.value === value);
    setHighlight(enabledIdx >= 0 ? enabledIdx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync highlight when opening or value changes
  }, [open, value]);

  function selectAt(index: number) {
    const opt = enabledOptions[index];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, enabledOptions.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (highlight >= 0) selectAt(highlight);
    }
  }

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            className="ui-panel"
            style={panelStyle}
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted">{t("form.noOptions")}</div>
            ) : (
              options.map((opt) => {
                const enabledIdx = enabledOptions.indexOf(opt);
                const isSelected = opt.value === value;
                const isHighlighted = enabledIdx === highlight;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    className={`ui-panel-option${isSelected ? " is-selected" : ""}${isHighlighted ? " is-highlighted" : ""}`}
                    onMouseEnter={() => {
                      if (!opt.disabled) setHighlight(enabledIdx);
                    }}
                    onClick={() => {
                      if (opt.disabled) return;
                      onChange(opt.value);
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                    {isSelected ? (
                      <Check size={14} weight="bold" className="shrink-0 text-brand" />
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        className={`ui-control-trigger${size === "sm" ? " is-sm" : ""}${open ? " is-open" : ""}${error ? " is-error" : ""}`}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        onKeyDown={onKeyDown}
      >
        <span
          className={`ui-control-value${selected ? "" : " is-placeholder"}`}
        >
          {selected?.label ?? resolvedPlaceholder}
        </span>
        <CaretDown size={14} className="ui-control-chevron" />
      </button>
      {panel}
    </div>
  );
}
