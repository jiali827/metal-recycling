"use client";

import { useEffect } from "react";

const TEXT_INPUT_TYPES = new Set([
  "text",
  "email",
  "password",
  "search",
  "tel",
  "url",
]);

function isTextLikeInput(
  el: HTMLInputElement | HTMLTextAreaElement,
): boolean {
  if (el.disabled || el.readOnly) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  return TEXT_INPUT_TYPES.has(el.type.toLowerCase());
}

export function moveCaretToEnd(
  el: HTMLInputElement | HTMLTextAreaElement,
): void {
  const len = el.value.length;
  try {
    el.setSelectionRange(len, len);
  } catch {
    /* number/date inputs may not support selection */
  }
}

/** Tab / programmatic focus → caret at end; mouse click keeps native position. */
export function TextInputCaretEnd() {
  useEffect(() => {
    let mouseDownTarget: EventTarget | null = null;

    function onMouseDown(e: MouseEvent) {
      const t = e.target;
      if (
        (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) &&
        isTextLikeInput(t)
      ) {
        mouseDownTarget = t;
      }
    }

    function onFocusIn(e: FocusEvent) {
      const el = e.target;
      if (
        !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
      ) {
        return;
      }
      if (!isTextLikeInput(el)) return;

      if (mouseDownTarget === el) {
        mouseDownTarget = null;
        return;
      }
      mouseDownTarget = null;

      requestAnimationFrame(() => moveCaretToEnd(el));
    }

    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return null;
}
