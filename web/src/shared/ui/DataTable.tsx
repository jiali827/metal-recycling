"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { TableScrollArea } from "@/shared/ui/TableScrollArea";
import { PAGE_SIZE_OPTIONS, TablePagination } from "@/shared/ui/TablePagination";
import { useI18n } from "@/shared/i18n";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  /** 設為 true 時不觸發行點擊（如操作列） */
  stopRowClick?: boolean;
  /** 右側固定列（操作列默认 key=actions 时自动启用） */
  stickyRight?: boolean;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyText?: string;
  pageSize?: number;
  pageSizeOptions?: readonly number[];
  onRowClick?: (row: T) => void;
  /** 嵌在外層卡片內時去掉自身卡片邊框/陰影 */
  embedded?: boolean;
  showPagination?: boolean;
  /** 占满列表页剩余高度，表体滚动、分页固定底部 */
  fillHeight?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyText,
  pageSize: initialPageSize = 10,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  onRowClick,
  embedded = false,
  showPagination = true,
  fillHeight = false,
}: DataTableProps<T>) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const resolvedEmpty = emptyText ?? t("common.empty");

  useEffect(() => {
    setPageSize(initialPageSize);
  }, [initialPageSize]);

  useEffect(() => {
    setPage(1);
  }, [rows, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  function cellClassName(col: Column<T>) {
    const sticky =
      col.stickyRight || col.key === "actions" ? " ui-table-sticky-right" : "";
    return `whitespace-nowrap px-4 py-3 align-middle${sticky}${col.className ? ` ${col.className}` : ""}`;
  }

  function headClassName(col: Column<T>) {
    const sticky =
      col.stickyRight || col.key === "actions" ? " ui-table-sticky-right" : "";
    return `ui-data-table-head whitespace-nowrap px-4 py-3 text-xs font-semibold text-muted${sticky}${col.className ? ` ${col.className}` : ""}`;
  }

  const tableClass = "ui-data-table min-w-full border-separate border-spacing-0 text-sm";

  const table = (
    <table className={tableClass}>
      <thead className="ui-data-table-thead">
        <tr className="bg-chip text-left">
          {columns.map((col) => (
            <th key={col.key} className={headClassName(col)}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {pageRows.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length}
              className="px-4 py-12 text-center text-muted"
            >
              {resolvedEmpty}
            </td>
          </tr>
        ) : (
          pageRows.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? "cursor-pointer" : undefined}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cellClassName(col)}
                  onClick={
                    col.stopRowClick
                      ? (e) => e.stopPropagation()
                      : undefined
                  }
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  const rootClass = [
    embedded ? "" : "ui-card",
    fillHeight ? "ui-data-table-fill" : "overflow-hidden",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <TableScrollArea
        className={fillHeight ? "ui-data-table-scroll" : undefined}
        scrollY={fillHeight}
      >
        {table}
      </TableScrollArea>
      {showPagination ? (
        <TablePagination
          total={rows.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={pageSizeOptions}
        />
      ) : null}
    </div>
  );
}
