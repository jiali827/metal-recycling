import type { ReactNode } from "react";
import { Tag, type TagTone } from "./forms/Tag";

export type StatusTone = TagTone;

interface StatusBadgeProps {
  children: ReactNode;
  tone?: StatusTone;
  dot?: boolean;
}

/** @deprecated Prefer Tag; StatusBadge now wraps Tag for backward compatibility */
export function StatusBadge({
  children,
  tone = "default",
  dot = false,
}: StatusBadgeProps) {
  return (
    <Tag tone={tone} dot={dot}>
      {children}
    </Tag>
  );
}
