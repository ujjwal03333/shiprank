"use client";

import { useMemo } from "react";
import {
  CONSTRAINT_CATALOG,
  isConstraintMentioned,
  firstKeywordHit,
  scorePrompt,
  type StackKey,
} from "@shiprank/compile/client";
import { CopyButton } from "../command-card";

interface CompileStepLike {
  name: string;
  index: number;
  stack: string;
  build: string;
  constraints: string;
  output: string;
}

interface LeftAnnotation {
  start: number;
  end: number;
  checkId: string;
  message: string;
}

const CHECK_LINE_RE = /^- (.+?) \[([A-Z]+-\d{3})\]/gm;

function extractAddressedLines(constraints: string): Array<{ text: string; checkId: string; deferred: boolean }> {
  const [primaryPart, deferredPart] = constraints.split("### Phase 2: Harden");
  const parse = (block: string | undefined, deferred: boolean) => {
    if (!block) return [];
    const out: Array<{ text: string; checkId: string; deferred: boolean }> = [];
    for (const m of block.matchAll(CHECK_LINE_RE)) {
      out.push({ text: m[1]!, checkId: m[2]!, deferred });
    }
    return out;
  };
  return [...parse(primaryPart, false), ...parse(deferredPart, true)];
}

function buildLeftAnnotations(prompt: string, detectedStack: StackKey[]): LeftAnnotation[] {
  const annotations: LeftAnnotation[] = [];
  for (const key of detectedStack) {
    const hit = firstKeywordHit(prompt, key);
    if (!hit) continue;
    const candidates = CONSTRAINT_CATALOG.filter((c) => c.category === key && c.critical);
    const unmentioned = candidates.find((c) => !isConstraintMentioned(prompt, c.id));
    if (!unmentioned) continue;
    annotations.push({
      start: hit.index,
      end: hit.index + hit.keyword.length,
      checkId: unmentioned.checkId,
      message: `${unmentioned.text} — commonly missing when this is unmentioned`,
    });
  }
  return annotations.sort((a, b) => a.start - b.start);
}

function AnnotatedPrompt({ prompt, annotations }: { prompt: string; annotations: LeftAnnotation[] }) {
  const segments: React.ReactNode[] = [];
  let cursor = 0;
  annotations.forEach((a, i) => {
    if (a.start > cursor) segments.push(<span key={`t-${i}`}>{prompt.slice(cursor, a.start)}</span>);
    segments.push(
      <mark
        key={`m-${i}`}
        className="rounded bg-warning-soft px-0.5 text-ink"
        style={{ textDecoration: "none" }}
      >
        {prompt.slice(a.start, a.end)}
      </mark>,
    );
    cursor = a.end;
  });
  if (cursor < prompt.length) segments.push(<span key="t-last">{prompt.slice(cursor)}</span>);

  return (
    <div className="flex flex-col gap-3">
      <p className="whitespace-pre-wrap font-body text-sm leading-relaxed text-ink">{segments}</p>
      {annotations.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border/70 pt-3">
          {annotations.map((a, i) => (
            <p key={i} className="flex items-start gap-1.5 font-body text-xs leading-relaxed text-warning-ink">
              <span className="mt-0.5">▲</span>
              <span>
                {a.message} <span className="font-mono text-[11px] text-ink-subtle">[{a.checkId}]</span>
              </span>
            </p>
          ))}
        </div>
      )}
      {annotations.length === 0 && (
        <p className="font-body text-xs text-ink-subtle">
          No unmentioned critical constraints detected for this stack.
        </p>
      )}
    </div>
  );
}

function CompiledStepAnnotated({ step }: { step: CompileStepLike }) {
  const addressed = extractAddressedLines(step.constraints);
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-xs uppercase tracking-widest text-brand">
        {step.name}
      </span>
      <div className="flex flex-col gap-1.5">
        {addressed.map((a, i) => (
          <p
            key={i}
            className={`flex items-start gap-1.5 font-body text-xs leading-relaxed ${
              a.deferred ? "text-ink-subtle" : "text-success-ink"
            }`}
          >
            <span className="mt-0.5">{a.deferred ? "◷" : "✓"}</span>
            <span>
              {a.text}{" "}
              <span className="font-mono text-[11px] text-ink-subtle">
                [{a.checkId} {a.deferred ? "deferred" : "addressed"}]
              </span>
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function SplitOutput({
  originalPrompt,
  detectedStack,
  steps,
}: {
  originalPrompt: string;
  detectedStack: StackKey[];
  steps: CompileStepLike[];
}) {
  const annotations = useMemo(() => buildLeftAnnotations(originalPrompt, detectedStack), [originalPrompt, detectedStack]);

  const compiledText = useMemo(
    () => steps.map((s) => [s.stack, s.build, s.constraints, s.output].join("\n")).join("\n\n"),
    [steps],
  );

  const stats = useMemo(() => {
    const wordsBefore = originalPrompt.trim().split(/\s+/).filter(Boolean).length;
    const wordsAfter = compiledText.trim().split(/\s+/).filter(Boolean).length;
    const pct = wordsBefore > 0 ? Math.round(((wordsAfter - wordsBefore) / wordsBefore) * 100) : 0;

    const representative = steps[0];
    const injectedCount = representative
      ? [...representative.constraints.matchAll(CHECK_LINE_RE)].length
      : 0;

    const uniqueIds = new Set<string>();
    for (const s of steps) {
      for (const m of s.constraints.matchAll(CHECK_LINE_RE)) uniqueIds.add(m[2]!);
    }

    const scoreBefore = scorePrompt(originalPrompt, detectedStack);
    const scoreAfter = scorePrompt(compiledText, detectedStack);

    return {
      wordsBefore,
      wordsAfter,
      pct,
      injectedCount,
      uniqueIds: [...uniqueIds],
      scoreBefore,
      scoreAfter,
    };
  }, [originalPrompt, compiledText, steps, detectedStack]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-surface-raised/60 px-4 py-2.5">
            <span className="font-display text-sm text-ink">Your prompt</span>
          </div>
          <div className="p-4">
            <AnnotatedPrompt prompt={originalPrompt} annotations={annotations} />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-surface-raised/60 px-4 py-2.5">
            <span className="font-display text-sm text-ink">Compiled prompt</span>
            <CopyButton text={compiledText} label="compiled prompt" />
          </div>
          <div className="flex flex-col gap-4 p-4">
            {steps.map((s) => (
              <CompiledStepAnnotated key={s.index} step={s} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface-raised/50 p-4 sm:grid-cols-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">Word count</span>
          <span className="font-display text-sm text-ink">
            {stats.wordsBefore} → {stats.wordsAfter}{" "}
            <span className="font-mono text-xs text-success-ink">
              ({stats.pct >= 0 ? "+" : ""}
              {stats.pct}%)
            </span>
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
            Security constraints
          </span>
          <span className="font-display text-sm text-ink">+{stats.injectedCount} injected</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
            Failure patterns prevented
          </span>
          <span className="font-display text-sm text-ink" title={stats.uniqueIds.join(", ")}>
            {stats.uniqueIds.length} ({stats.uniqueIds.slice(0, 4).join(", ")}
            {stats.uniqueIds.length > 4 ? "…" : ""})
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">Prompt score</span>
          <span className="font-display text-sm text-ink">
            {stats.scoreBefore.total} → {stats.scoreAfter.total}
          </span>
        </div>
      </div>
    </div>
  );
}
