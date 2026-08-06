"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** 表头固定、表体纵向滚动：滚动条仅出现在表体区域 */
export function TableSplitScrollArea({
  header,
  body,
  className = "",
}: {
  header: ReactNode;
  body: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollX, setScrollX] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      setScrollX(el.scrollWidth > el.clientWidth + 1);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    const inner = el.querySelector(".ui-data-table-split-inner");
    if (inner) observer.observe(inner);
    const tables = el.querySelectorAll("table");
    tables.forEach((table) => observer.observe(table));

    window.addEventListener("resize", check);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", check);
    };
  });

  return (
    <div
      ref={ref}
      className={`ui-table-scroll-area ui-data-table-split${scrollX ? " ui-table-scroll-x" : ""}${className ? ` ${className}` : ""}`}
    >
      <div className="ui-data-table-split-inner">
        <div className="ui-data-table-split-head">{header}</div>
        <div className="ui-data-table-split-body ui-table-scroll-area is-scroll-y">
          {body}
        </div>
      </div>
    </div>
  );
}

export function TableScrollArea({
  children,
  className = "",
  scrollY = false,
}: {
  children: ReactNode;
  className?: string;
  /** 纵向滚动（表格填满剩余高度时使用） */
  scrollY?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollX, setScrollX] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      setScrollX(el.scrollWidth > el.clientWidth + 1);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    const table = el.querySelector("table");
    if (table) observer.observe(table);

    window.addEventListener("resize", check);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", check);
    };
  });

  return (
    <div
      ref={ref}
      className={`ui-table-scroll-area${scrollY ? " is-scroll-y" : ""}${scrollX ? " ui-table-scroll-x" : ""}${className ? ` ${className}` : ""}`}
    >
      {children}
    </div>
  );
}
