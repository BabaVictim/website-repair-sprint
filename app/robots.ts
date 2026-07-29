import type { MetadataRoute } from "next";

const siteUrl = "https://babavictim.github.io/website-repair-sprint/";
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteUrl}sitemap.xml`,
    host: "https://babavictim.github.io",
  };
}
