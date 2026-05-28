import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/lib/api-auth";
import { db } from "@/lib/db";

interface CheckoutItem {
  productId: string;
  quantity: number;
  price?: number;
  productName?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { items, shippingAddress, shipping } = await req.json();
    if (!items?.length) return NextResponse.json({ error: "No items" }, { status: 400 });

    // Auth is optional — guest checkout is allowed
    const token = await getAuthToken(req);

    const productIds: string[] = items.map((i: CheckoutItem) => i.productId);
    const products = await db.product.findMany({ where: { id: { in: productIds } } });

    const subtotal = items.reduce((sum: number, item: CheckoutItem) => {
      const p = products.find((p) => p.id === item.productId);
      return sum + (p?.price ?? item.price ?? 0) * item.quantity;
    }, 0);

    const tax = subtotal * 0.0825;
    const total = subtotal + tax;

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    await db.order.create({
      data: {
        orderNumber,
        userId: token?.id ?? null,
        status: "PENDING",
        subtotal,
        tax,
        shipping: 0,
        total,
        shippingAddress: shippingAddress ?? shipping ?? null,
        items: {
          create: items.map((item: CheckoutItem) => {
            const p = products.find((p) => p.id === item.productId);
            return {
              productId: item.productId,
              quantity: item.quantity,
              price: p?.price ?? item.price ?? 0,
              productName: p?.name ?? item.productName ?? "",
            };
          }),
        },
      },
    });

    return NextResponse.json({ success: true, orderNumber });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
}
