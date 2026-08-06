"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface InputWithUnitProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  unit: string;
  error?: boolean;
  className?: string;
}

export const InputWithUnit = forwardRef<HTMLInputElement, InputWithUnitProps>(
  function InputWithUnit({ unit, error, className = "", disabled, ...props }, ref) {
    return (
      <div
        className={`ui-input-affix${error ? " is-error" : ""}${disabled ? " is-disabled" : ""}${className ? ` ${className}` : ""}`}
      >
        <input ref={ref} className="ui-input-affix-input" disabled={disabled} {...props} />
        <span className="ui-input-affix-suffix" aria-hidden>
          {unit}
        </span>
      </div>
    );
  },
);
