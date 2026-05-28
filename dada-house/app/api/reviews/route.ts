import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { reviewSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  const reviews = await db.review.findMany({
    where: { approved: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      service: true,
      rating: true,
      content: true,
      createdAt: true,
    },
  });
  return NextResponse.json(reviews);
}

export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken(req);
    const body = await req.json();

    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const review = await db.review.create({
      data: {
        ...parsed.data,
        userId: token?.id ?? null,
        approved: false,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
