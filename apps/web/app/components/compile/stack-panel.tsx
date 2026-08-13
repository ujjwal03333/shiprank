"use client";

import { useEffect, useState } from "react";
import { STACK_DEFS, type FocusMode, type StackKey } from "@shiprank/compile/client";

const FOCUS_MODES: Array<{ key: FocusMode; label: string }> = [
  { key: "security", label: "Security-first" },
  { key: "speed", label: "Speed-to-MVP" },
  { key: "scale", label: "Scale-ready" },
];

function StackChip({ stackKey }: { stackKey: StackKey }) {
  const def = STACK_DEFS.find((d) => d.key === stackKey);
  if (!def) return null;
  return (
    <span
      key={stackKey}
      className="chip-pop flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-2.5 py-1 font-mono text-[11px] text-brand-ink"
    >
      {def.label}
    </span>
  );
}

function RiskLine({ stackKeys }: { stackKeys: StackKey[] }) {
  const [text, setText] = useState<string | null>(null);
  const [source, setSource] = useState<"real" | "default" | "none" | null>(null);

  useEffect(() => {
    if (stackKeys.length === 0) {
      setText(null);
      setSource(null);
      return;
    }
    let alive = true;
    const params = new URLSearchParams({ stack: stackKeys.join(",") });
    fetch(`/api/compile/risk?${params}`)
      .then((res) => res.json())
      .then((data: { text: string | null; source: "real" | "default" | "none" }) => {
        if (!alive) return;
        setText(data.text);
        setSource(data.source);
      })
      .catch(() => {
        if (alive) {
          setText(null);
          setSource(null);
        }
      });
    return () => {
      alive = false;
    };
  }, [stackKeys.join(",")]);

  if (!text) return null;

  return (
    <p className="reveal flex items-start gap-1.5 font-body text-xs leading-relaxed text-ink-subtle">
      <span className="mt-0.5 text-warning-ink">▲</span>
      <span>
        {text}{" "}
        <span className="text-ink-subtle/70">
          {source === "real" ? "(from real scan data)" : "(estimated)"}
        </span>
      </span>
    </p>
  );
}

export function StackPanel({
  prompt,
  focusMode,
  onFocusModeChange,
  onStackDetected,
}: {
  prompt: string;
  focusMode: FocusMode;
  onFocusModeChange: (mode: FocusMode) => void;
  onStackDetected?: (keys: StackKey[]) => void;
}) {
  const [stackKeys, setStackKeys] = useState<StackKey[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const lower = prompt.toLowerCase();
      const found = STACK_DEFS.filter((d) => d.keywords.some((kw) => lower.includes(kw))).map(
        (d) => d.key,
      );
      setStackKeys(found);
      onStackDetected?.(found);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  if (stackKeys.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 px-5 pb-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {stackKeys.map((key) => (
          <StackChip key={key} stackKey={key} />
        ))}
      </div>
      <RiskLine stackKeys={stackKeys} />
      <div className="flex flex-wrap items-center gap-1.5">
        {FOCUS_MODES.map((fm) => (
          <button
            key={fm.key}
            type="button"
            onClick={() => onFocusModeChange(fm.key)}
            className={`press rounded-full border px-3 py-1 font-body text-xs transition-colors ${
              focusMode === fm.key
                ? "border-ink bg-ink text-canvas"
                : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink"
            }`}
          >
            {fm.label}
          </button>
        ))}
      </div>
    </div>
  );
}
