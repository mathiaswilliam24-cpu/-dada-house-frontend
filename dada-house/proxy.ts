import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/services",
  "/booking",
  "/reviews",
  "/about",
  "/contact",
  "/store",
  "/auth",
  "/api/auth",
  "/api/appointments",
  "/api/reviews",
  "/api/contact",
  "/api/availability",
  "/api/gallery",
  "/api/store/products",
  "/api/ai/chat",
  "/sitemap.xml",
  "/robots.txt",
];

const PROTECTED_PATHS = [
  "/dashboard",
  "/portal",
  "/technician",
  "/dispatcher",
  "/admin",
];

const SEMI_PROTECTED = ["/store/checkout", "/store/orders"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) =>
      pathname === p ||
      pathname.startsWith(p + "/") ||
      pathname.startsWith(p + "?")
  );
}

function isProtected(pathname: string): boolean {
  return (
    PROTECTED_PATHS.some((p) => pathname.startsWith(p)) ||
    SEMI_PROTECTED.some((p) => pathname.startsWith(p))
  );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const sessionCookie =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionCookie && isProtected(pathname)) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|manifest.json|sw.js|workbox-.*)$).*)",
  ],
};
