import { NextResponse } from "next/server";

const BASE_URL = "https://dada-house.com";

const PAGES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/services", priority: "0.9", changefreq: "monthly" },
  { path: "/services/plumbing", priority: "0.9", changefreq: "monthly" },
  { path: "/services/air-conditioning", priority: "0.9", changefreq: "monthly" },
  { path: "/services/heating", priority: "0.9", changefreq: "monthly" },
  { path: "/services/remodeling", priority: "0.9", changefreq: "monthly" },
  { path: "/booking", priority: "0.8", changefreq: "weekly" },
  { path: "/reviews", priority: "0.7", changefreq: "daily" },
  { path: "/about", priority: "0.6", changefreq: "monthly" },
  { path: "/contact", priority: "0.7", changefreq: "monthly" },
  { path: "/store", priority: "0.5", changefreq: "monthly" },
];

export async function GET() {
  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(
  (p) => `  <url>
    <loc>${BASE_URL}${p.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
).join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
