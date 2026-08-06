import type { ConfirmOptions } from "@/components/ui/ConfirmDialog";
import { getActiveMessages } from "@/lib/i18n";

export function roleEnableConfirmMessage(
  roleName: string,
  enabling: boolean,
): ConfirmOptions {
  const m = getActiveMessages();
  return {
    title: enabling ? m.roles.enableConfirmTitle : m.roles.disableConfirmTitle,
    message: (enabling ? m.roles.enableConfirm : m.roles.disableConfirm).replace(
      "{name}",
      roleName,
    ),
    confirmLabel: enabling ? m.roles.enableAction : m.roles.disableAction,
    cancelLabel: m.common.cancel,
    danger: !enabling,
  };
}

export function roleDeleteConfirmMessage(roleName: string): ConfirmOptions {
  const m = getActiveMessages();
  return {
    title: m.roles.deleteConfirmTitle,
    message: m.roles.deleteConfirm.replace("{name}", roleName),
    confirmLabel: m.common.delete,
    cancelLabel: m.common.cancel,
    danger: true,
  };
}
