"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_THEME_COLOR,
  THEME_STORAGE_KEY,
  applyThemeColor,
  normalizeHex,
} from "./theme";

interface ThemeContextValue {
  color: string;
  setColor: (hex: string) => void;
  resetColor: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [color, setColorState] = useState(DEFAULT_THEME_COLOR);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      const next = normalizeHex(stored ?? "") ?? DEFAULT_THEME_COLOR;
      setColorState(next);
      applyThemeColor(next);
    } catch {
      applyThemeColor(DEFAULT_THEME_COLOR);
    }
  }, []);

  const setColor = useCallback((hex: string) => {
    const next = normalizeHex(hex) ?? DEFAULT_THEME_COLOR;
    setColorState(next);
    applyThemeColor(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const resetColor = useCallback(() => {
    setColor(DEFAULT_THEME_COLOR);
  }, [setColor]);

  const value = useMemo(
    () => ({ color, setColor, resetColor }),
    [color, setColor, resetColor],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
