import type { Metadata } from "next";
import Link from "next/link";
import { ShipCard } from "../../components/ship-card";
import { ShareActions } from "../../components/share-actions";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { formatPlatformName } from "@/lib/format-names";
import { cardUrl, publicAppUrl } from "@/lib/public-url";
import { lockedTweet } from "@/lib/tweet";
import { cardLine } from "@/lib/grade";

export const revalidate = 60;

async function loadCard(id: string) {
  if (!isSupabaseConfigured()) return null;
  const db = getServiceClient();
  const { data } = await db
    .from("scans")
    .select(
      "id, score, grade, projects ( name, framework, platform, metadata )",
    )
    .eq("id", id)
    .single();
  if (!data) return null;
  const project = data["projects"] as {
    name?: string;
    framework?: string | null;
    platform?: string | null;
    metadata?: { fileCount?: number } | null;
  } | null;
  return {
    id: data["id"] as string,
    score: (data["score"] as number) ?? 0,
    grade: (data["grade"] as string) ?? "F",
    projectName: project?.name ?? "Untitled",
    platform: project?.platform
      ? formatPlatformName(project.platform)
      : project?.framework ?? null,
    meta:
      project?.metadata?.fileCount != null
        ? `${project.metadata.fileCount} files`
        : undefined,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const card = await loadCard(id);
  if (!card) {
    return { title: "Card", description: "A ShipRank card." };
  }
  const url = cardUrl(card.id);
  return {
    title: `${card.projectName} is a ${card.grade}`,
    description: lockedTweet({
      name: card.projectName,
      score: card.score,
      grade: card.grade,
    }),
    alternates: { canonical: `/s/${card.id}` },
    openGraph: {
      title: `${card.projectName} is a ${card.grade} (${card.score})`,
      description: cardLine(card.score),
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${card.projectName} is a ${card.grade} (${card.score})`,
      description: cardLine(card.score),
    },
  };
}

export default async function PublicCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = await loadCard(id);

  if (!card) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-2xl text-ink">This card is gone.</p>
        <Link href="/dare" className="font-mono text-xs text-ink-subtle hover:text-ink">
          Dare a repo →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="w-full max-w-lg">
        <ShipCard
          score={card.score}
          grade={card.grade}
          projectName={card.projectName}
          platform={card.platform}
          meta={card.meta}
          size="hero"
          staticStamp
        />
      </div>
      <div className="w-full max-w-lg">
        <ShareActions
          scanId={card.id}
          projectName={card.projectName}
          score={card.score}
          grade={card.grade}
          closeHref={`/scan/${card.id}`}
          origin={publicAppUrl()}
        />
      </div>
    </div>
  );
}
