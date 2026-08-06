import type { ConfirmOptions } from "@/components/ui/ConfirmDialog";
import { getActiveMessages } from "@/lib/i18n";

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
