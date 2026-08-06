"use client";

import { createContext, useContext, useId, type ReactNode } from "react";

interface RadioGroupContextValue {
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function RadioGroup({
  value,
  onChange,
  name,
  disabled,
  children,
  className = "",
  orientation = "vertical",
}: RadioGroupProps) {
  const autoName = useId();
  return (
    <RadioGroupContext.Provider
      value={{ name: name ?? autoName, value, onChange, disabled }}
    >
      <div
        role="radiogroup"
        className={`${orientation === "horizontal" ? "flex flex-wrap items-center gap-4" : "flex flex-col gap-2.5"} ${className}`}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioProps {
  value: string;
  label: string;
  disabled?: boolean;
  className?: string;
}

export function Radio({
  value,
  label,
  disabled,
  className = "",
}: RadioProps) {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) {
    throw new Error("Radio must be used within RadioGroup");
  }
  const inputId = useId();
  const isDisabled = disabled || ctx.disabled;

  return (
    <label
      className={`ui-check ui-radio${isDisabled ? " is-disabled" : ""} ${className}`}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        type="radio"
        className="ui-check-input"
        name={ctx.name}
        value={value}
        checked={ctx.value === value}
        disabled={isDisabled}
        onChange={() => ctx.onChange(value)}
      />
      <span className="ui-check-box" aria-hidden />
      <span className="ui-check-label">{label}</span>
    </label>
  );
}
