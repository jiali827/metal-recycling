import type { ReactNode } from "react";

export type TagTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent"
  | "muted"
  | "hot";

const toneClass: Record<TagTone, string> = {
  default: "",
  success: "is-success",
  warning: "is-warning",
  danger: "is-danger",
  info: "is-info",
  accent: "is-accent",
  muted: "is-muted",
  hot: "is-hot",
};

interface TagProps {
  children: ReactNode;
  tone?: TagTone;
  dot?: boolean;
  className?: string;
}

export function Tag({
  children,
  tone = "default",
  dot = false,
  className = "",
}: TagProps) {
  return (
    <span className={`ui-tag ${toneClass[tone]} ${className}`.trim()}>
      {dot ? <span className="ui-tag-dot" aria-hidden /> : null}
      {children}
    </span>
  );
}
