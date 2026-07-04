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
      className="theme-control relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition duration-200 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rp-text)]"
      aria-label={
        theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"
      }
      title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
      onClick={() => {
        setTheme(nextTheme);
        applyTheme(nextTheme);
        window.localStorage.setItem(storageKey, nextTheme);
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="theme-icon theme-icon-sun h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2.25v2M12 19.75v2M2.25 12h2M19.75 12h2M5.1 5.1l1.4 1.4M17.5 17.5l1.4 1.4M18.9 5.1l-1.4 1.4M6.5 17.5l-1.4 1.4" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="theme-icon theme-icon-moon h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.25 15.35A8.5 8.5 0 0 1 8.65 3.75a8.5 8.5 0 1 0 11.6 11.6Z" />
      </svg>
    </button>
  );
}
