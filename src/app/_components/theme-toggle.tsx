"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

const storageKey = "ropejumping-theme";

const getStoredTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";

  return window.localStorage.getItem(storageKey) === "light" ? "light" : "dark";
};

const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const storedTheme = getStoredTheme();

    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="theme-control w-full px-3 py-2 text-left text-sm"
      onClick={() => {
        setTheme(nextTheme);
        applyTheme(nextTheme);
        window.localStorage.setItem(storageKey, nextTheme);
      }}
    >
      {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
    </button>
  );
}
