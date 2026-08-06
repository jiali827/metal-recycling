"use client";

import { useId } from "react";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  id,
  className = "",
}: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label
      className={`ui-check${disabled ? " is-disabled" : ""} ${className}`}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        type="checkbox"
        className="ui-check-input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="ui-check-box" aria-hidden />
      {label ? <span className="ui-check-label">{label}</span> : null}
    </label>
  );
}
