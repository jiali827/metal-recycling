"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** 数值从 0 缓动到目标；依赖 key 变化时重播 */
export function useCountUp(
  target: number,
  replayKey: string,
  durationMs = 720,
) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    let frame = 0;
    const startAt = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startAt) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(from + (target - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, replayKey, reduced, durationMs]);

  return value;
}

export function DashReveal({
  children,
  delayMs = 0,
  className = "",
  style,
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`dash-reveal ${className}`.trim()}
      style={{ ...style, ["--dash-delay" as string]: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
