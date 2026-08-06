"use client";

import type { ReactNode } from "react";

export function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="ui-form-section">
      <h3 className="ui-form-section-title">{title}</h3>
      <div className="ui-form-section-body">{children}</div>
    </section>
  );
}

/** Two-column field grid (modal / card forms) */
export function FormFieldGrid({ children }: { children: ReactNode }) {
  return <div className="ui-form-grid">{children}</div>;
}

/** Full-width field inside FormFieldGrid */
export function FormFieldFull({ children }: { children: ReactNode }) {
  return <div className="ui-form-span-2 min-w-0">{children}</div>;
}
