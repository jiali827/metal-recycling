"use client";

import {
  forwardRef,
  type InputHTMLAttributes,
  type ChangeEvent,
} from "react";
import { ControlClearButton } from "./ControlClearButton";

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "md";
  error?: boolean;
  /** 有值时在右侧显示清空 X，默认开启 */
  allowClear?: boolean;
}

/** 文本输入：右侧内置清空 X，样式对齐 .ui-input */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(
    {
      size = "md",
      error,
      allowClear = true,
      className = "",
      disabled,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref,
  ) {
    const resolved = value !== undefined ? value : defaultValue;
    const hasValue =
      resolved !== undefined &&
      resolved !== null &&
      String(resolved).length > 0;
    const showClear = Boolean(allowClear && hasValue && !disabled);

    function handleClear() {
      if (disabled || !onChange) return;
      onChange({
        target: { value: "" },
        currentTarget: { value: "" },
      } as ChangeEvent<HTMLInputElement>);
    }

    const inputClass = [
      "ui-input",
      size === "sm" ? "is-sm" : "",
      error ? "is-error" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={`ui-input-clearable${size === "sm" ? " is-sm" : ""}`}>
        <input
          ref={ref}
          disabled={disabled}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          className={inputClass}
          {...props}
        />
        {showClear ? <ControlClearButton onClear={handleClear} /> : null}
      </div>
    );
  },
);
