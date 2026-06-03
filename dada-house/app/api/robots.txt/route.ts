import { NextResponse } from "next/server";

export async function GET() {
  const content = `User-agent: *
Allow: /

Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /auth/

Sitemap: https://dada-house.com/api/sitemap.xml
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
