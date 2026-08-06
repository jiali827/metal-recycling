"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl" | "2xl";
}

const sizeClass = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  "2xl": "max-w-5xl",
};

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const { t } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const card = cardRef.current;
    const focusables = () =>
      card?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [];

    requestAnimationFrame(() => {
      const list = focusables();
      list[0]?.focus();
    });

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const list = Array.from(focusables());
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("common.close")}
        className="ui-modal-backdrop absolute inset-0 bg-foreground/40"
        onClick={onClose}
      />
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`ui-modal-card relative flex max-h-[min(90vh,840px)] w-full ${sizeClass[size]} flex-col overflow-hidden rounded-[12px] border border-border bg-card shadow-[0_20px_50px_rgb(15_23_42_/_0.18)]`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-7 pb-2 pt-4">
          <h2
            id="modal-title"
            className="min-w-0 text-base font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-muted transition hover:bg-chip hover:text-foreground"
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="ui-modal-body ui-scrollbar-overlay px-7 pb-4 pt-2">{children}</div>

        {footer ? (
          <div className="flex shrink-0 items-center justify-end gap-2 px-7 pb-4 pt-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
