"use client";

import { useEffect } from "react";

const THEME_KEY = "akms-finance-theme";

export default function ThemeProvider() {
  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    const theme = stored || "aura";
    document.documentElement.dataset.theme = theme;
  }, []);

  return null;
}
