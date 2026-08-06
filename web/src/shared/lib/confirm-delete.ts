import type { ConfirmOptions } from "@/shared/ui/ConfirmDialog";
import { getActiveMessages } from "@/shared/i18n";

export function deleteConfirmMessage(label: string): ConfirmOptions {
  const common = getActiveMessages().common;
  return {
    title: common.deleteConfirmTitle,
    message: common.deleteConfirm.replace("{label}", label),
    confirmLabel: common.delete,
    cancelLabel: common.cancel,
    danger: true,
  };
}
