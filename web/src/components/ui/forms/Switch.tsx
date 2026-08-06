"use client";

import { useId } from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  id,
  className = "",
}: SwitchProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label
      className={`ui-switch${disabled ? " is-disabled" : ""} ${className}`}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        className="ui-check-input ui-switch-input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="ui-switch-track" aria-hidden />
      {label ? <span className="ui-check-label">{label}</span> : null}
    </label>
  );
}
