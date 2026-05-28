import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

type AuthToken = {
  id: string;
  role: string;
  email?: string;
  name?: string;
};

export async function getAuthToken(req: NextRequest): Promise<AuthToken | null> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName:
      process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
  });
  if (!token?.id) return null;
  return {
    id: token.id as string,
    role: (token.role as string) ?? "",
    email: token.email ?? undefined,
    name: (token.name as string) ?? undefined,
  };
}

export async function requireRole(
  req: NextRequest,
  ...roles: string[]
): Promise<AuthToken | NextResponse> {
  const token = await getAuthToken(req);
  if (!token || !roles.includes(token.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return token;
}

export async function requireAuth(req: NextRequest): Promise<AuthToken | NextResponse> {
  const token = await getAuthToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return token;
}

export function requireAdmin(req: NextRequest) {
  return requireRole(req, "ADMIN");
}

export function requireAdminOrDispatcher(req: NextRequest) {
  return requireRole(req, "ADMIN", "DISPATCHER");
}

export function requireTechnician(req: NextRequest) {
  return requireRole(req, "ADMIN", "TECHNICIAN");
}
