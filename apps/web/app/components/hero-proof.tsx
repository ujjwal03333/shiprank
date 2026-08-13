import Link from "next/link";
import { ScoreGauge } from "./score-gauge";
import type { HeroProofScan } from "@/lib/hero-proof";

export function HeroProof({ proof }: { proof: HeroProofScan }) {
  return (
    <Link
      href={`/scan/${proof.scanId}`}
      className="card-hover group flex w-full max-w-md items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left shadow-sm"
    >
      <ScoreGauge score={proof.score} grade={proof.grade} size={72} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-mono text-[11px] uppercase tracking-widest text-ink-subtle">
          Real scan, not a mock
        </span>
        <span className="font-body text-sm text-ink">
          ShipRank scanning <span className="font-mono text-brand-ink">its own engine</span>
        </span>
        <span className="font-body text-xs text-ink-subtle transition-colors group-hover:text-brand-ink">
          See the full report →
        </span>
      </div>
    </Link>
  );
}
