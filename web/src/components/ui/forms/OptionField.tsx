"use client";

import { SegmentedControl } from "./SegmentedControl";
import { Select, type SelectOption } from "./Select";

const FEW_OPTIONS_MAX = 4;

interface OptionFieldProps {
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

/** Renders segmented control for few options, dropdown for longer lists. */
export function OptionField({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  size,
  error,
  className,
  "aria-label": ariaLabel,
  id,
}: OptionFieldProps) {
  const enabledCount = options.filter((o) => !o.disabled).length;
  if (enabledCount > 0 && enabledCount <= FEW_OPTIONS_MAX) {
    return (
      <SegmentedControl
        value={value}
        onChange={onChange}
        options={options}
        disabled={disabled}
        className={className}
        aria-label={ariaLabel}
      />
    );
  }
  return (
    <Select
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      size={size}
      error={error}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
