"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { CaretDown, Check } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n";
import type { SelectOption } from "./Select";
import { ControlClearButton } from "./ControlClearButton";

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** @deprecated 搜索文案已合并到主输入框 placeholder */
  searchPlaceholder?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  error?: boolean;
  /** 有值时在右侧显示清空 X，默认开启 */
  allowClear?: boolean;
  /** 清空后的值；未传时优先取 options 中的 "" 或 "all" */
  clearValue?: string;
  className?: string;
  "aria-label"?: string;
  id?: string;
}

function matchOption(query: string, option: SelectOption) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return (
    option.label.toLowerCase().includes(q) ||
    option.value.toLowerCase().includes(q)
  );
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  disabled,
  size = "md",
  error,
  allowClear = true,
  clearValue: clearValueProp,
  className = "",
  "aria-label": ariaLabel,
  id,
}: SearchableSelectProps) {
  const { t } = useI18n();
  const resolvedPlaceholder =
    placeholder ?? searchPlaceholder ?? t("form.selectPlaceholder");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);
  const clearValue =
    clearValueProp ??
    options.find((o) => o.value === "")?.value ??
    options.find((o) => o.value === "all")?.value ??
    "";
  const showClear = Boolean(
    allowClear && !disabled && value !== clearValue && value !== undefined,
  );

  const filteredOptions = useMemo(
    () => options.filter((opt) => matchOption(query, opt)),
    [options, query],
  );

  const enabledOptions = filteredOptions.filter((o) => !o.disabled);

  const inputDisplay = open ? query : (selected?.label ?? "");

  const updatePosition = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 240 && rect.top > spaceBelow;
    setPanelStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 200),
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      maxHeight: 240,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
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
        !listRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const enabledIdx = enabledOptions.findIndex((o) => o.value === value);
    setHighlight(enabledIdx >= 0 ? enabledIdx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync highlight when panel opens
  }, [open, value]);

  useEffect(() => {
    setHighlight(enabledOptions.length > 0 ? 0 : -1);
  }, [query, enabledOptions.length]);

  function selectAt(index: number) {
    const opt = enabledOptions[index];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
    inputRef.current?.focus();
  }

  function openPanel() {
    if (disabled) return;
    // 空值占位（如 "—"）不得写入搜索词，否则会把真实选项全部过滤掉
    const emptySelected =
      !selected ||
      selected.value === "" ||
      selected.value === clearValue ||
      selected.value === "all";
    setQuery(emptySelected ? "" : selected.label);
    setOpen(true);
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      if (emptySelected) {
        inputRef.current.focus();
      } else {
        inputRef.current.select();
      }
    });
  }

  function onInputFocus() {
    if (disabled) return;
    if (!open) openPanel();
  }

  function onInputChange(next: string) {
    setQuery(next);
    if (!open) setOpen(true);
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (!open) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === " "
      ) {
        e.preventDefault();
        openPanel();
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
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlight >= 0) selectAt(highlight);
    }
  }

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div ref={listRef} id={listboxId} role="listbox" className="ui-panel" style={panelStyle}>
            <div className="ui-panel-scroll min-h-0 flex-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted">{t("form.noSearchResults")}</div>
              ) : (
                filteredOptions.map((opt) => {
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
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (opt.disabled) return;
                        onChange(opt.value);
                        setOpen(false);
                        inputRef.current?.focus();
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
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div
        className={`ui-control-trigger ui-control-combobox${size === "sm" ? " is-sm" : ""}${open ? " is-open" : ""}${error ? " is-error" : ""}${disabled ? " is-disabled" : ""}`}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          disabled={disabled}
          value={inputDisplay}
          placeholder={resolvedPlaceholder}
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-autocomplete="list"
          className="ui-control-combobox-input"
          onFocus={onInputFocus}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onInputKeyDown}
        />
        {showClear ? (
          <ControlClearButton
            onClear={() => {
              onChange(clearValue);
              setQuery("");
              inputRef.current?.focus();
            }}
          />
        ) : null}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          className="ui-control-combobox-toggle"
          aria-hidden
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (disabled) return;
            if (open) {
              setOpen(false);
              inputRef.current?.focus();
            } else {
              openPanel();
            }
          }}
        >
          <CaretDown size={14} className="ui-control-chevron" />
        </button>
      </div>
      {panel}
    </div>
  );
}
