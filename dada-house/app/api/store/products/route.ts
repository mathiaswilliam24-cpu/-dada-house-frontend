import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const featured = searchParams.get("featured");

  const products = await db.product.findMany({
    where: {
      inStock: true,
      ...(category ? { category } : {}),
      ...(featured === "true" ? { featured: true } : {}),
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ products });
}
