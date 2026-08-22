import type { MetadataRoute } from "next";
import { NIGHT } from "@/lib/night-court";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShipRank",
    short_name: "ShipRank",
    description: "Don't ship AI-built software without a ShipRank.",
    theme_color: NIGHT.canvas,
    background_color: NIGHT.canvas,
    display: "standalone",
    start_url: "/",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
