import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type CartItem = { productId: string; quantity: number; price: number; name: string; image?: string };

async function getCart(userId?: string, sessionId?: string) {
  if (userId) return db.cart.findUnique({ where: { userId } });
  if (sessionId) return db.cart.findUnique({ where: { sessionId } });
  return null;
}

export async function GET(req: NextRequest) {
  const token = await getAuthToken(req);
  const sessionId = req.cookies.get("cart-session")?.value;
  const cart = await getCart(token?.id, sessionId ?? undefined);
  return NextResponse.json({ items: (cart?.items as CartItem[]) ?? [] });
}

export async function POST(req: NextRequest) {
  const token = await getAuthToken(req);
  const sessionId = req.cookies.get("cart-session")?.value ?? crypto.randomUUID();
  const { productId, quantity = 1 } = await req.json();

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const existingCart = await getCart(token?.id, sessionId);
  const items: CartItem[] = (existingCart?.items as CartItem[]) ?? [];
  const idx = items.findIndex((i) => i.productId === productId);
  if (idx >= 0) {
    items[idx].quantity += quantity;
  } else {
    items.push({ productId, quantity, price: product.price, name: product.name, image: product.images[0] });
  }

  const data = {
    items: items as unknown as import("@/lib/generated/prisma/client").Prisma.JsonArray,
    userId: token?.id ?? null,
    sessionId: token?.id ? null : sessionId,
  };

  await db.cart.upsert({
    where: token?.id ? { userId: token.id } : { sessionId },
    create: data,
    update: { items: data.items },
  });

  const res = NextResponse.json({ items });
  if (!token?.id) {
    res.cookies.set("cart-session", sessionId, { httpOnly: true, maxAge: 60 * 60 * 24 * 30 });
  }
  return res;
}

export async function DELETE(req: NextRequest) {
  const token = await getAuthToken(req);
  const sessionId = req.cookies.get("cart-session")?.value;
  const { productId } = await req.json();

  const existingCart = await getCart(token?.id, sessionId ?? undefined);
  if (!existingCart) return NextResponse.json({ items: [] });

  const items = ((existingCart.items as CartItem[]) ?? []).filter((i) => i.productId !== productId);
  await db.cart.update({
    where: { id: existingCart.id },
    data: { items: items as unknown as import("@/lib/generated/prisma/client").Prisma.JsonArray },
  });

  return NextResponse.json({ items });
}
