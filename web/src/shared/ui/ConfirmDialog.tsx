"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useI18n } from "@/shared/i18n";
import { Modal } from "./Modal";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** 仅提示：只显示确定，无取消（替代 window.alert） */
  alert?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: "" });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    setOpen(false);
    resolverRef.current?.(value);
    resolverRef.current = null;
  }, []);

  const value = useMemo(() => confirm, [confirm]);
  const isAlert = Boolean(options.alert);
  const title =
    options.title ??
    (isAlert ? t("common.tipTitle") : t("common.confirmTitle"));

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={open}
        onClose={() => settle(isAlert ? true : false)}
        title={title}
        size="md"
        footer={
          isAlert ? (
            <button
              type="button"
              className="ui-btn-primary"
              onClick={() => settle(true)}
            >
              {options.confirmLabel ?? t("common.confirm")}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="ui-btn-secondary"
                onClick={() => settle(false)}
              >
                {options.cancelLabel ?? t("common.cancel")}
              </button>
              <button
                type="button"
                className={options.danger ? "ui-btn-danger" : "ui-btn-primary"}
                onClick={() => settle(true)}
              >
                {options.confirmLabel ?? t("common.confirm")}
              </button>
            </>
          )
        }
      >
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
          {options.message}
        </p>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx;
}
