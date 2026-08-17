"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const ICON_SIZE = 16;

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

function readStoredTheme(): Theme {
  const raw = localStorage.getItem("shiprank-theme");
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const initial = readStoredTheme();
    setTheme(initial);
    applyTheme(initial);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const current = readStoredTheme();
      if (current === "system") {
        applyTheme("system");
        setTheme("system");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function cycle() {
    const order: Theme[] = ["light", "dark", "system"];
    const current = theme ?? "system";
    const next = order[(order.indexOf(current) + 1) % order.length]!;
    setTheme(next);
    localStorage.setItem("shiprank-theme", next);
    applyTheme(next);
  }

  if (theme === null) {
    return <div className="size-11" />;
  }

  const resolved = theme === "system" ? getSystemTheme() : theme;

  return (
    <button
      onClick={cycle}
      aria-label={`Theme: ${theme}${theme === "system" ? ` (${resolved})` : ""}. Click to switch.`}
      title={`Theme: ${theme}`}
      className="grid size-11 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
    >
      {theme === "dark" ? (
        <svg width={ICON_SIZE} height={ICON_SIZE} viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`} fill="none" aria-hidden>
          <path
            d="M13.4 10.2A6.5 6.5 0 0 1 5.8 2.6a6.5 6.5 0 1 0 7.6 7.6Z"
            fill="currentColor"
          />
        </svg>
      ) : theme === "light" ? (
        <svg width={ICON_SIZE} height={ICON_SIZE} viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`} fill="none" aria-hidden>
          <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width={ICON_SIZE} height={ICON_SIZE} viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`} fill="none" aria-hidden>
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 2.5v11a5.5 5.5 0 0 1 0-11Z" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}
