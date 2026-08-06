"use client";

import type { ReactNode } from "react";

/** 列表页纵向布局：头部/筛选固定，表格区占满剩余高度 */
export function ListPageLayout({ children }: { children: ReactNode }) {
  return <div className="ui-list-page">{children}</div>;
}
