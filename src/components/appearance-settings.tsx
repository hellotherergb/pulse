"use client";

import { ACCENT_META, THEME_ACCENTS } from "@/lib/theme";
import { useTheme } from "./theme-provider";

export function AppearanceSettings() {
  const { mode, accent, setMode, setAccent } = useTheme();

  return (
    <section className="mt-6 rounded-2xl border border-line bg-ink-2 p-4">
      <h2 className="font-display text-lg font-600">Appearance</h2>
      <p className="mt-1 text-xs text-muted">
        Light or dark, plus your accent color. Saved on this device.
      </p>

      <p className="mt-4 text-xs font-semibold text-muted">Mode</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("dark")}
          className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
            mode === "dark"
              ? "border-mint/50 bg-mint/10 text-mint"
              : "border-line text-warm"
          }`}
        >
          Dark
        </button>
        <button
          type="button"
          onClick={() => setMode("light")}
          className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
            mode === "light"
              ? "border-mint/50 bg-mint/10 text-mint"
              : "border-line text-warm"
          }`}
        >
          Light
        </button>
      </div>

      <p className="mt-4 text-xs font-semibold text-muted">Accent</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {THEME_ACCENTS.map((id) => {
          const meta = ACCENT_META[id];
          const active = accent === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setAccent(id)}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-semibold ${
                active ? "border-mint/50 bg-mint/10 text-warm" : "border-line text-muted"
              }`}
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ background: meta.swatch }}
              />
              {meta.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
