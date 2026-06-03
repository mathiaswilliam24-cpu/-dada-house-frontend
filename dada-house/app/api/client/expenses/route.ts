import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const FREE_LIMIT = 10;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [expenses, sub] = await Promise.all([
    db.expense.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
    }),
    db.expenseSubscription.findUnique({ where: { userId: session.user.id } }),
  ]);

  const isPremium = sub?.status === "active";
  const count = expenses.length;
  const limitReached = !isPremium && count >= FREE_LIMIT;

  return NextResponse.json({ expenses, count, isPremium, limitReached, freeLimit: FREE_LIMIT });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [count, sub] = await Promise.all([
    db.expense.count({ where: { userId: session.user.id } }),
    db.expenseSubscription.findUnique({ where: { userId: session.user.id } }),
  ]);

  const isPremium = sub?.status === "active";
  if (!isPremium && count >= FREE_LIMIT) {
    return NextResponse.json({ error: "limit_reached", freeLimit: FREE_LIMIT }, { status: 403 });
  }

  const body = await req.json();
  const expense = await db.expense.create({
    data: {
      userId: session.user.id,
      merchant: body.merchant ?? null,
      description: body.description ?? null,
      amount: Number(body.amount) || 0,
      date: body.date ? new Date(body.date) : new Date(),
      receiptUrl: body.receiptUrl ?? null,
      source: body.source ?? "manual",
    },
  });

  return NextResponse.json(expense, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await db.expense.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
