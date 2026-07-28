import { gradeBadgeClass, gradeStroke } from "@/lib/grade";

interface ScoreGaugeProps {
  score: number;
  grade: string;
  size?: number;
}

export function ScoreGauge({ score, grade, size = 176 }: ScoreGaugeProps) {
  const R = 72;
  const C = 2 * Math.PI * R;
  const ARC = C * 0.75; // 270° visible
  const fill = ARC * (score / 100);
  const stroke = gradeStroke(grade);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        aria-label={`Score: ${score}/100, Grade: ${grade}`}
        role="img"
      >
        {/* Track */}
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
        {/* Fill */}
        <circle
          r={R}
          cx={100}
          cy={100}
          fill="none"
          strokeWidth={10}
          stroke={stroke}
          strokeLinecap="round"
          strokeDasharray={`${fill} ${C - fill}`}
          transform="rotate(-225 100 100)"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-4xl font-medium text-ink leading-none">
          {score}
        </span>
        <span className="font-mono text-xs text-ink-subtle mt-0.5">/ 100</span>
        <span
          className={`mt-2 rounded px-2 py-0.5 font-mono text-xs font-medium ${gradeBadgeClass(grade)}`}
        >
          {grade}
        </span>
      </div>
    </div>
  );
}
