import type { MetadataRoute } from "next";

const SITE_URL = "https://winston.studio";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/resume`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
