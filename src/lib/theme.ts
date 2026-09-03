export const THEME_MODES = ["dark", "light"] as const;
export const THEME_ACCENTS = [
  "mint",
  "blue",
  "purple",
  "pink",
  "orange",
  "gold",
] as const;

export type ThemeMode = (typeof THEME_MODES)[number];
export type ThemeAccent = (typeof THEME_ACCENTS)[number];

export const MODE_KEY = "pulse-mode";
export const ACCENT_KEY = "pulse-accent";

export const ACCENT_META: Record<
  ThemeAccent,
  { label: string; swatch: string }
> = {
  mint: { label: "Mint", swatch: "#3dffb0" },
  blue: { label: "Blue", swatch: "#4da3ff" },
  purple: { label: "Purple", swatch: "#b388ff" },
  pink: { label: "Pink", swatch: "#ff6bb5" },
  orange: { label: "Orange", swatch: "#ff9f43" },
  gold: { label: "Gold", swatch: "#f5c542" },
};

export function isThemeMode(v: string | null): v is ThemeMode {
  return THEME_MODES.includes(v as ThemeMode);
}

export function isThemeAccent(v: string | null): v is ThemeAccent {
  return THEME_ACCENTS.includes(v as ThemeAccent);
}

export function applyTheme(mode: ThemeMode, accent: ThemeAccent) {
  const root = document.documentElement;
  root.dataset.mode = mode;
  root.dataset.accent = accent;
  root.style.colorScheme = mode;
}
