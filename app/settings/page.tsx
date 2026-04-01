"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "akms-finance-theme";

const themes = [
  { id: "aura", name: "Aura (Default)", description: "Warm neutrals with teal accents." },
  { id: "midnight", name: "Midnight", description: "Deep navy base with cool highlights." },
  { id: "forest", name: "Forest", description: "Soft greens with fresh contrast." },
  { id: "sand", name: "Sand", description: "Earthy warmth with bright accents." },
];

export default function SettingsPage() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "aura";
    return window.localStorage.getItem(THEME_KEY) || "aura";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const handleThemeChange = (value: string) => {
    setTheme(value);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[var(--muted)]">SETTINGS</p>
          <h2 className="text-3xl font-bold">Theme & Branding</h2>
          <p className="text-sm text-[var(--muted)]">Pick a look that fits your dashboard.</p>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6">
        <h3 className="text-lg font-semibold">Theme Selector</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {themes.map((t) => (
            <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--line)] p-4">
              <input
                type="radio"
                name="theme"
                value={t.id}
                checked={theme === t.id}
                onChange={() => handleThemeChange(t.id)}
                className="h-4 w-4"
              />
              <div>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-[var(--muted)]">{t.description}</p>
              </div>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
