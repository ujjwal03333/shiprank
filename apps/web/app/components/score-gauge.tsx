"use client";

import { useEffect, useRef } from "react";
import { gradeBadgeClass, gradeStroke } from "@/lib/grade";

interface ScoreGaugeProps {
  score: number;
  grade: string;
  size?: number;
}

export function ScoreGauge({ score, grade, size = 176 }: ScoreGaugeProps) {
  const R = 72;
  const C = 2 * Math.PI * R;
  const ARC = C * 0.75;
  const fill = ARC * (score / 100);
  const stroke = gradeStroke(grade);
  const circleRef = useRef<SVGCircleElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const circle = circleRef.current;
    if (circle) {
      circle.style.strokeDasharray = `0 ${C}`;
      requestAnimationFrame(() => {
        circle.style.transition = "stroke-dasharray 0.8s cubic-bezier(0.2, 0.7, 0.2, 1)";
        circle.style.strokeDasharray = `${fill} ${C - fill}`;
      });
    }

    const numEl = numberRef.current;
    if (numEl) {
      let start = 0;
      const duration = 700;
      const t0 = performance.now();
      function tick(now: number) {
        const elapsed = now - t0;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        start = Math.round(eased * score);
        if (numEl) numEl.textContent = String(start);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
  }, [score, fill, C]);

  return (
    <div
      className={`relative flex items-center justify-center ${score === 100 ? "score-perfect rounded-full" : ""}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        aria-label={`Score: ${score}/100, Grade: ${grade}`}
        role="img"
      >
        <circle
          r={R}
          cx={100}
          cy={100}
          fill="none"
          strokeWidth={10}
          stroke="#e4dacb"
          strokeLinecap="round"
          strokeDasharray={`${ARC} ${C - ARC}`}
          transform="rotate(-225 100 100)"
        />
        <circle
          ref={circleRef}
          r={R}
          cx={100}
          cy={100}
          fill="none"
          strokeWidth={10}
          stroke={stroke}
          strokeLinecap="round"
          strokeDasharray={`0 ${C}`}
          transform="rotate(-225 100 100)"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span ref={numberRef} className="font-mono text-4xl font-medium leading-none text-ink">
          0
        </span>
        <span className="mt-0.5 font-mono text-xs text-ink-subtle">/ 100</span>
        <span
          className={`chip-pop mt-2 rounded px-2 py-0.5 font-mono text-xs font-medium ${gradeBadgeClass(grade)}`}
          style={{ animationDelay: "700ms" }}
        >
          {grade}
        </span>
      </div>
    </div>
  );
}
