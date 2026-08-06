"use client";

import { Checkbox } from "@/components/ui/forms/Checkbox";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/types";
import { menuGroups } from "@/lib/menu";
import {
  PERMISSION_MODULES,
  type ButtonActionId,
  type RoleAccessMap,
  toggleModuleButton,
} from "@/lib/permissions";

const ACTION_LABEL_KEYS: Record<ButtonActionId, MessageKey> = {
  view: "permissions.actionView",
  create: "permissions.actionCreate",
  edit: "permissions.actionEdit",
  delete: "permissions.actionDelete",
};

export function RolePermissionEditor({
  value,
  onChange,
}: {
  value: RoleAccessMap;
  onChange: (next: RoleAccessMap) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="ui-perm-editor">
      <div className="ui-perm-matrix">
        <div className="ui-perm-matrix-head ui-perm-matrix-head--two-col">
          <span>{t("permissions.colModule")}</span>
          <span>{t("permissions.colFunctional")}</span>
        </div>

        {menuGroups.map((group) => {
          const modules = PERMISSION_MODULES.filter((m) => m.group === group.id);
          if (modules.length === 0) return null;
          return (
            <div key={group.id} className="ui-perm-matrix-group">
              <div className="ui-perm-matrix-group-title">{t(group.labelKey)}</div>
              {modules.map((mod) => {
                const entry = value[mod.id];

                return (
                  <div key={mod.id} className="ui-perm-matrix-row ui-perm-matrix-row--two-col">
                    <div className="ui-perm-module-name">{t(mod.menuLabelKey)}</div>
                    <div className="ui-perm-buttons">
                      {mod.actions.map((action) => {
                        const checked = entry.buttons.includes(action);
                        return (
                          <Checkbox
                            key={action}
                            checked={checked}
                            label={t(ACTION_LABEL_KEYS[action])}
                            onChange={(on) =>
                              onChange(toggleModuleButton(value, mod.id, action, on))
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
