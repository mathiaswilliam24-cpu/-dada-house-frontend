import type { MetadataRoute } from "next";

// Mirrors proxy.ts's PROTECTED_PATHS/SEMI_PROTECTED — keep these two lists in sync.
const DISALLOW = [
  "/dashboard",
  "/portal",
  "/technician",
  "/dispatcher",
  "/admin",
  "/print",
  "/call-center",
  "/calls",
  "/messages",
  "/customers",
  "/store/checkout",
  "/store/orders",
  "/api",
];

export default function robots(): MetadataRoute.Robots {
  const base = "https://dada-house.com";

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      // Explicitly allowed so AI assistants (ChatGPT, Perplexity, Claude) can cite DADA HOUSE.
      { userAgent: "GPTBot", allow: "/", disallow: DISALLOW },
      { userAgent: "PerplexityBot", allow: "/", disallow: DISALLOW },
      { userAgent: "ClaudeBot", allow: "/", disallow: DISALLOW },
      { userAgent: "CCBot", allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
