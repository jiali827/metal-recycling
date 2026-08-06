import type { Column } from "@/components/ui/DataTable";
import { formatDateTime } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n/types";
import type { RecordTimestamps } from "@/lib/timestamps";

type Translate = (key: MessageKey) => string;

/** 列表默认排序：创建时间倒序（最新在前）。 */
export function sortByCreatedAtDesc<T extends { createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function auditColumns<T extends RecordTimestamps>(t: Translate): Column<T>[] {
  return [
    {
      key: "createdAt",
      header: t("common.createdAt"),
      className: "whitespace-nowrap text-xs tabular-nums text-muted",
      render: (r) => formatDateTime(r.createdAt),
    },
    {
      key: "updatedAt",
      header: t("common.updatedAt"),
      className: "whitespace-nowrap text-xs tabular-nums text-muted",
      render: (r) => formatDateTime(r.updatedAt),
    },
  ];
}
