import type { MetadataRoute } from "next";
import { publicAppUrl } from "@/lib/public-url";

const BASE_URL = publicAppUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
