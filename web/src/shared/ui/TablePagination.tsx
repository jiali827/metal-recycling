"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Select } from "@/shared/ui/forms/Select";
import { useI18n } from "@/shared/i18n";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
/** 卡片网格页：每页数量为列数的整数倍（桌面 3 列） */
export const CARD_PAGE_SIZE_OPTIONS = [9, 12, 18, 24] as const;

export function getPaginationRange(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  if (total <= 0) return [];
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];
  const showLeftEllipsis = current > 4;
  const showRightEllipsis = current < total - 3;

  if (showLeftEllipsis) pages.push("ellipsis");

  const start = showLeftEllipsis ? current - 1 : 2;
  const end = showRightEllipsis ? current + 1 : total - 1;

  for (let i = start; i <= end; i += 1) {
    if (i > 1 && i < total) pages.push(i);
  }

  if (showRightEllipsis) pages.push("ellipsis");
  pages.push(total);

  return pages;
}

interface TablePaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: readonly number[];
  /** 表格底栏完整控件；卡片网格等场景用 compact 减少占位 */
  variant?: "default" | "compact";
  className?: string;
}

export function TablePagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  variant = "default",
  className,
}: TablePaginationProps) {
  const isCompact = variant === "compact";
  const { t } = useI18n();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const [jumpValue, setJumpValue] = useState(String(page));

  useEffect(() => {
    setJumpValue(String(page));
  }, [page]);

  const pageItems = useMemo(
    () => getPaginationRange(page, totalPages),
    [page, totalPages],
  );

  function commitJump() {
    const next = Number.parseInt(jumpValue, 10);
    if (!Number.isFinite(next)) {
      setJumpValue(String(page));
      return;
    }
    const clamped = Math.min(totalPages, Math.max(1, next));
    onPageChange(clamped);
    setJumpValue(String(clamped));
  }

  function onJumpKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitJump();
    }
  }

  return (
    <nav
      className={`ui-table-pagination${isCompact ? " is-compact" : ""}${className ? ` ${className}` : ""}`}
      aria-label={t("pagination.nav")}
    >
      <div className="ui-table-pagination-meta">
        <span>
          {t("pagination.total", { count: total })}
          {total > 0 ? ` · ${t("pagination.showing", { from, to })}` : null}
        </span>
      </div>

      <div className="ui-table-pagination-controls">
        <label className="ui-table-pagination-size">
          <span className="sr-only">{t("pagination.pageSize")}</span>
          <Select
            size="sm"
            allowClear={false}
            value={String(pageSize)}
            onChange={(value) => onPageSizeChange(Number(value))}
            options={pageSizeOptions.map((size) => ({
              value: String(size),
              label: t("pagination.perPage", { size }),
            }))}
            aria-label={t("pagination.pageSize")}
          />
        </label>

        <div className="ui-table-pagination-nav">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="ui-table-pagination-btn"
            aria-label={t("pagination.prev")}
          >
            <CaretLeft size={14} />
          </button>

          {isCompact ? (
            <span className="ui-table-pagination-indicator">
              {t("pagination.page", { page, total: totalPages })}
            </span>
          ) : (
            <div className="ui-table-pagination-pages">
              {pageItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className="ui-table-pagination-ellipsis">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={`ui-table-pagination-page${item === page ? " is-active" : ""}`}
                    onClick={() => onPageChange(item)}
                    aria-current={item === page ? "page" : undefined}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
          )}

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="ui-table-pagination-btn"
            aria-label={t("pagination.next")}
          >
            <CaretRight size={14} />
          </button>
        </div>

        {!isCompact && (
          <div className="ui-table-pagination-jump">
            <span>{t("pagination.goto")}</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onKeyDown={onJumpKeyDown}
              onBlur={commitJump}
              className="ui-table-pagination-jump-input"
              aria-label={t("pagination.gotoPage")}
            />
            <span>{t("pagination.gotoPage")}</span>
            <button type="button" className="ui-table-pagination-jump-btn" onClick={commitJump}>
              {t("pagination.jump")}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
