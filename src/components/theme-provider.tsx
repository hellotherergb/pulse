"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  ACCENT_KEY,
  applyTheme,
  isThemeAccent,
  isThemeMode,
  MODE_KEY,
  type ThemeAccent,
  type ThemeMode,
} from "@/lib/theme";

type ThemeContextValue = {
  mode: ThemeMode;
  accent: ThemeAccent;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: ThemeAccent) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState<ThemeAccent>("mint");

  useEffect(() => {
    const storedMode = localStorage.getItem(MODE_KEY);
    const storedAccent = localStorage.getItem(ACCENT_KEY);
    const nextMode = isThemeMode(storedMode) ? storedMode : "dark";
    const nextAccent = isThemeAccent(storedAccent) ? storedAccent : "mint";
    setModeState(nextMode);
    setAccentState(nextAccent);
    applyTheme(nextMode, nextAccent);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      accent,
      setMode: (next) => {
        setModeState(next);
        localStorage.setItem(MODE_KEY, next);
        applyTheme(next, accent);
      },
      setAccent: (next) => {
        setAccentState(next);
        localStorage.setItem(ACCENT_KEY, next);
        applyTheme(mode, next);
      },
    }),
    [mode, accent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
