/** 系统预设品牌图标：三圆组合，单色随主题色变化 */
const LOGO_GAP = 2.35;

export function SystemBrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className || "h-full w-full"}
      aria-hidden
    >
      <circle
        cx="12.15"
        cy="26.35"
        r="10.45"
        fill="var(--brand)"
        stroke="var(--card)"
        strokeWidth={LOGO_GAP}
      />
      <circle
        cx="27.85"
        cy="26.35"
        r="10.45"
        fill="var(--brand)"
        stroke="var(--card)"
        strokeWidth={LOGO_GAP}
      />
      <circle
        cx="20"
        cy="12.55"
        r="10.45"
        fill="var(--brand)"
        stroke="var(--card)"
        strokeWidth={LOGO_GAP}
      />
    </svg>
  );
}
