"use client";

import type { MouseEvent } from "react";
import { X } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n";

interface ControlClearButtonProps {
  onClear: () => void;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}

/** 表单控件内置清空（右侧 X），用于日期 / 下拉 / 输入 */
export function ControlClearButton({
  onClear,
  disabled,
  "aria-label": ariaLabel,
  className = "",
}: ControlClearButtonProps) {
  const { t } = useI18n();

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    onClear();
  }

  return (
    <button
      type="button"
      tabIndex={-1}
      disabled={disabled}
      className={`ui-control-clear${className ? ` ${className}` : ""}`}
      aria-label={ariaLabel ?? t("form.clear")}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={handleClick}
    >
      <X size={10} weight="bold" />
    </button>
  );
}
