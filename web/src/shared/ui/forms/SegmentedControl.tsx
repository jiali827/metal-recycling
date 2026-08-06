"use client";

import type { SelectOption } from "./Select";

interface SegmentedControlProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  /** md：表单默认；sm：卡片标题旁等紧凑场景 */
  size?: "md" | "sm";
  className?: string;
  "aria-label"?: string;
}

export function SegmentedControl({
  value,
  onChange,
  options,
  disabled,
  size = "md",
  className = "",
  "aria-label": ariaLabel,
}: SegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`ui-segmented${size === "sm" ? " is-sm" : ""}${disabled ? " is-disabled" : ""} ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled || opt.disabled}
            className={`ui-segmented-item${active ? " is-active" : ""}`}
            onClick={() => {
              if (!disabled && !opt.disabled) onChange(opt.value);
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
