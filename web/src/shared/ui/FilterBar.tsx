"use client";

import type { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
}

export function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="ui-card mb-4 flex flex-wrap items-end gap-3 p-4">
      {children}
    </div>
  );
}

interface FilterFieldProps {
  label: string;
  children: ReactNode;
}

export function FilterField({ label, children }: FilterFieldProps) {
  return (
    <div className="flex min-w-[140px] flex-col gap-1 text-xs text-muted">
      <span>{label}</span>
      {children}
    </div>
  );
}

/** Shared filter control class — same tokens as .ui-input.is-sm */
export const filterControlClass = "ui-input is-sm";
