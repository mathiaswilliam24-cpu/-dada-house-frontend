import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://dada-house.com";
  const now = new Date();

  return [
    { url: base,                                      lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/booking`,                         lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/services`,                        lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/services/plumbing`,               lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/services/air-conditioning`,       lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/services/heating`,                lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/services/remodeling`,             lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/locations/north-carolina`,        lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/locations/maryland`,              lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/reviews`,                         lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${base}/gallery`,                         lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${base}/about`,                           lastModified: now, changeFrequency: "yearly",  priority: 0.5 },
    { url: `${base}/contact`,                         lastModified: now, changeFrequency: "yearly",  priority: 0.5 },
  ];
}
