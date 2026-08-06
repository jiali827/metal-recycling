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
import { CaretDown, Check, MagnifyingGlass } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";
import type { SelectOption } from "./Select";

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  error?: boolean;
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
  className = "",
  "aria-label": ariaLabel,
  id,
}: SearchableSelectProps) {
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t("form.selectPlaceholder");
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("form.searchPlaceholder");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);

  const filteredOptions = useMemo(
    () => options.filter((opt) => matchOption(query, opt)),
    [options, query],
  );

  const enabledOptions = filteredOptions.filter((o) => !o.disabled);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 280 && rect.top > spaceBelow;
    setPanelStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 200),
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      maxHeight: 280,
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
    requestAnimationFrame(() => searchRef.current?.focus());
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
    triggerRef.current?.focus();
  }

  function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!open) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === " "
      ) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
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
            <div className="sticky top-0 z-10 border-b border-border bg-card p-2">
              <div className="relative">
                <MagnifyingGlass
                  size={14}
                  className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
                />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onSearchKeyDown}
                  placeholder={resolvedSearchPlaceholder}
                  className="ui-input h-9 w-full pl-8 text-sm"
                  aria-label={resolvedSearchPlaceholder}
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
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
            </div>
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
        onKeyDown={onTriggerKeyDown}
      >
        <span className={`ui-control-value${selected ? "" : " is-placeholder"}`}>
          {selected?.label ?? resolvedPlaceholder}
        </span>
        <CaretDown size={14} className="ui-control-chevron" />
      </button>
      {panel}
    </div>
  );
}
