"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const ITEMS = [
  { href: "/", title: "Home", hint: "compile scan rank" },
  { href: "/dare", title: "Dare a repo", hint: "github public scan" },
  { href: "/leaderboard", title: "Leaderboard", hint: "rankings scores" },
  { href: "/models", title: "Model rankings", hint: "claude gpt cursor" },
  { href: "/methodology", title: "Methodology", hint: "checks grades stations" },
  { href: "/pricing", title: "Pricing", hint: "pro monitor checkout" },
  { href: "/dashboard", title: "Dashboard", hint: "monitor projects" },
  { href: "/about", title: "About", hint: "ujjwal contact" },
  { href: "/privacy", title: "Privacy", hint: "data cookies" },
  { href: "/terms", title: "Terms", hint: "legal" },
];

function score(query: string, item: (typeof ITEMS)[number]): number {
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  const hay = `${item.title} ${item.hint} ${item.href}`.toLowerCase();
  if (hay.includes(q)) return q.length / hay.length + (item.title.toLowerCase().startsWith(q) ? 2 : 1);
  const parts = q.split(/\s+/);
  return parts.every((p) => hay.includes(p)) ? 0.5 : 0;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    return ITEMS.map((item) => ({ item, s: score(query, item) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.item);
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setActive(0);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-ink/30 px-4 pt-[15vh] backdrop-blur-[2px]"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          aria-label="Search commands"
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              go(results[active]!.href);
            }
          }}
          placeholder="Search pages, start a dare, open compile…"
          className="w-full border-b border-border bg-transparent px-4 py-3 font-body text-sm text-ink outline-none placeholder:text-ink-subtle"
        />
        <ul className="max-h-72 overflow-y-auto py-1">
          {results.length === 0 && (
            <li className="px-4 py-3 font-body text-sm text-ink-muted">No matches.</li>
          )}
          {results.map((item, i) => (
            <li key={item.href}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(item.href)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left font-body text-sm ${
                  i === active ? "bg-brand-soft text-brand-ink" : "text-ink"
                }`}
              >
                <span>{item.title}</span>
                <span className="font-mono text-[10px] text-ink-subtle">{item.href}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
