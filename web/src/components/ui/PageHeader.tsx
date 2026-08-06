"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}

export function PageHeader({
  title,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav
            aria-label={t("common.breadcrumb")}
            className="flex flex-wrap items-center gap-1.5 text-sm"
          >
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <span
                  key={`${item.label}-${index}`}
                  className="flex items-center gap-1.5"
                >
                  {index > 0 ? (
                    <span className="text-muted/50" aria-hidden>
                      /
                    </span>
                  ) : null}
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className="text-muted transition-colors hover:text-brand"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className={
                        isLast
                          ? "text-base font-semibold tracking-tight text-foreground"
                          : "text-muted"
                      }
                      aria-current={isLast ? "page" : undefined}
                    >
                      {item.label}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>
        ) : title ? (
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
