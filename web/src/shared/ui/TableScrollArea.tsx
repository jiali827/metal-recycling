"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

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
      className={`${scrollY ? "overflow-y-auto" : ""} overflow-x-auto${scrollX ? " ui-table-scroll-x" : ""}${className ? ` ${className}` : ""}`}
    >
      {children}
    </div>
  );
}
