import type { MetadataRoute } from "next";

const siteUrl = "https://babavictim.github.io/website-repair-sprint/";
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${siteUrl}invoice/`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}invoice/project/`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
