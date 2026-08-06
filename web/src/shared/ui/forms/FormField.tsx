"use client";

import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
  error?: string;
  htmlFor?: string;
}

export function FormField({
  label,
  children,
  required,
  hint,
  error,
  htmlFor,
}: FormFieldProps) {
  return (
    <div className={`ui-form-group${error ? " is-error" : ""}`}>
      <label className="ui-form-label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ui-form-required">*</span> : null}
      </label>
      {children}
      {error ? (
        <div className="ui-form-error" role="alert">
          {error}
        </div>
      ) : hint ? (
        <div className="ui-form-hint">{hint}</div>
      ) : null}
    </div>
  );
}
