import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShipRank",
    short_name: "ShipRank",
    description: "The finishing service for AI-built software",
    theme_color: "#c4622d",
    background_color: "#fbf7f1",
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
