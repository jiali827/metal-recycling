"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CaretRight, Check, Palette } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n";
import { useTheme } from "@/shared/providers/theme-provider";
import { DEFAULT_THEME_COLOR, THEME_PRESETS, normalizeHex } from "@/shared/config/theme";

function ThemeColorPanel({
  id,
  draft,
  color,
  onDraftChange,
  onCommitCustom,
  onReset,
}: {
  id?: string;
  draft: string;
  color: string;
  onDraftChange: (value: string) => void;
  onCommitCustom: (raw: string) => void;
  onReset: () => void;
}) {
  const { t } = useI18n();

  return (
    <div id={id} role="dialog" aria-label={t("theme.title")} className="p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Palette size={14} className="text-muted" />
        {t("theme.title")}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {THEME_PRESETS.map((preset) => {
          const selected = color.toLowerCase() === preset.hex.toLowerCase();
          return (
            <button
              key={preset.id}
              type="button"
              title={preset.hex}
              aria-label={preset.hex}
              aria-pressed={selected}
              className={`relative flex h-8 w-full items-center justify-center rounded-[6px] transition ${
                selected
                  ? "ring-2 ring-offset-1 ring-[var(--brand)]"
                  : "hover:scale-105"
              }`}
              style={{ background: preset.hex }}
              onClick={() => onDraftChange(preset.hex)}
            >
              {selected ? (
                <Check size={14} weight="bold" className="text-white drop-shadow" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <label className="mb-1.5 block text-[11px] text-muted">{t("theme.custom")}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={normalizeHex(draft) ?? color}
            onChange={(e) => onDraftChange(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded-[6px] border border-border bg-transparent p-0.5"
            aria-label={t("theme.custom")}
          />
          <input
            type="text"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onBlur={() => onCommitCustom(draft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCommitCustom(draft);
              }
            }}
            className="ui-input is-sm !mt-0 flex-1 font-mono text-xs uppercase"
            placeholder="#6366F1"
            spellCheck={false}
          />
        </div>
      </div>

      {color.toLowerCase() !== DEFAULT_THEME_COLOR.toLowerCase() ? (
        <button
          type="button"
          className="mt-2 w-full rounded-[6px] px-2 py-1.5 text-left text-[11px] text-muted transition hover:bg-chip hover:text-foreground"
          onClick={onReset}
        >
          {t("theme.reset")}
        </button>
      ) : null}
    </div>
  );
}

function useThemeColorPickerState() {
  const { color, setColor, resetColor } = useTheme();
  const [draft, setDraft] = useState(color);

  useEffect(() => {
    setDraft(color);
  }, [color]);

  function commitCustom(raw: string) {
    const next = normalizeHex(raw);
    if (!next) {
      setDraft(color);
      return;
    }
    setDraft(next);
    setColor(next);
  }

  function applyColor(next: string) {
    const normalized = normalizeHex(next);
    if (!normalized) return;
    setDraft(normalized);
    setColor(normalized);
  }

  function handleReset() {
    resetColor();
    setDraft(DEFAULT_THEME_COLOR);
  }

  return {
    color,
    draft,
    applyColor,
    commitCustom,
    handleReset,
  };
}

/** 用户菜单内：主题色（与语言切换并列） */
export function ThemeColorMenuItem({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const panelId = useId();
  const { color, draft, applyColor, commitCustom, handleReset } =
    useThemeColorPickerState();

  return (
    <div className="relative">
      <button
        type="button"
        role="menuitem"
        className={`ui-panel-option${open ? " is-highlighted" : ""}`}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
      >
        <Palette size={16} className="text-muted" />
        <span className="flex-1 text-left">{t("theme.switch")}</span>
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-[3px] shadow-[inset_0_0_0_1px_rgb(15_23_42_/_0.12)]"
          style={{ background: color }}
          aria-hidden
        />
        <CaretRight
          size={14}
          className={`shrink-0 text-muted transition-transform${open ? " translate-x-0.5" : ""}`}
        />
      </button>
      {open ? (
        <div
          className="ui-panel ui-panel-flyout absolute left-[calc(100%+4px)] top-0 z-[70] w-[220px]"
        >
          <ThemeColorPanel
            id={panelId}
            draft={draft}
            color={color}
            onDraftChange={applyColor}
            onCommitCustom={commitCustom}
            onReset={handleReset}
          />
        </div>
      ) : null}
    </div>
  );
}

/** 独立图标按钮（备用） */
export function ThemeColorPicker() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const { color, draft, applyColor, commitCustom, handleReset } =
    useThemeColorPickerState();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border bg-card text-muted transition hover:border-brand hover:text-brand"
        aria-label={t("theme.switch")}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={t("theme.switch")}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="h-3.5 w-3.5 rounded-[3px] shadow-[inset_0_0_0_1px_rgb(15_23_42_/_0.12)]"
          style={{ background: color }}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="ui-panel absolute left-0 top-[calc(100%+8px)] z-50 w-[220px]">
          <ThemeColorPanel
            id={panelId}
            draft={draft}
            color={color}
            onDraftChange={applyColor}
            onCommitCustom={commitCustom}
            onReset={handleReset}
          />
        </div>
      ) : null}
    </div>
  );
}
