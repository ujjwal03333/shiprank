import type { MetadataRoute } from "next";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { publicAppUrl } from "@/lib/public-url";

const BASE_URL = publicAppUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/dare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.95 },
    { url: `${BASE_URL}/leaderboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/methodology`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/dashboard`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  if (!isSupabaseConfigured()) {
    return staticPages;
  }

  try {
    const db = getServiceClient();
    const { data } = await db
      .from("scans")
      .select("id, updated_at")
      .eq("status", "completed")
      .neq("provenance", "seed")
      .order("updated_at", { ascending: false })
      .limit(1000);

    const scanPages: MetadataRoute.Sitemap = (data ?? []).map((scan) => ({
      url: `${BASE_URL}/s/${scan["id"] as string}`,
      lastModified: new Date(scan["updated_at"] as string),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    return [...staticPages, ...scanPages];
  } catch {
    return staticPages;
  }
}
