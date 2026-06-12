import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const category = searchParams.get("category");

  const where: Record<string, unknown> = {};
  if (category && category !== "ALL") where.category = category;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, allCategories] = await Promise.all([
    db.priceBookItem.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    db.priceBookItem.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

  return NextResponse.json({
    items,
    total: items.length,
    categories: allCategories.map((c) => c.category),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const {
    industry, category, subcategory1, subcategory2,
    name, description, price, cost, taxable,
    unit, taskCode, onlineBooking,
  } = body;

  if (!name || !category) {
    return NextResponse.json({ error: "Name and category are required" }, { status: 400 });
  }

  const item = await db.priceBookItem.create({
    data: {
      industry: industry ?? "",
      category,
      subcategory1: subcategory1 || null,
      subcategory2: subcategory2 || null,
      name,
      description: description || null,
      price: price ?? 0,
      cost: cost ?? 0,
      taxable: taxable ?? true,
      unit: unit || null,
      taskCode: taskCode || null,
      onlineBooking: onlineBooking ?? false,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
