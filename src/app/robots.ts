import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/secret-word",
          "/general-questions",
          "/guess-the-scene",
          "/quick-challenge",
        ],
        disallow: [
          "/admin",
          "/profile",
          "/account",
          "/history",
          "/room",
          "/private",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
