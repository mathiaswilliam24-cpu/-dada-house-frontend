import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import OpenAI from "openai";

export const maxDuration = 60;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const base64: string | undefined = body?.base64;
  if (!base64) return NextResponse.json({ error: "No image" }, { status: 400 });

  // Strip data URL prefix if present, keep only the base64 part for size check
  const sizeKB = Math.round((base64.length * 3) / 4 / 1024);
  if (sizeKB > 3000) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: base64, detail: "low" },
            },
            {
              type: "text",
              text: `You are a receipt OCR assistant. Extract from this receipt image: merchant name, transaction date, and total amount paid.
Return ONLY valid JSON, no markdown, no explanation:
{"merchant":"Store Name","date":"2024-01-15","amount":42.50,"description":""}
Rules:
- date: the actual purchase/transaction date printed on the receipt (NOT today's date). Must be YYYY-MM-DD format. Look for any date pattern anywhere on the receipt — it may appear with a label like "Date", "Sale Date", "Transaction Date", or it may appear alone as a formatted date like "05/31/2026", "2026-05-31", "May 31 2026", "31/05/26", etc. It is usually near the top or bottom of the receipt.
- amount: the final TOTAL amount paid (look for "Total", "Amount Due", "Grand Total", "Subtotal+Tax"). Must be a number.
- merchant: the store or business name, usually at the top of the receipt.
- Use null for any field you cannot clearly read.`,
            },
          ],
        },
      ],
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[scan] GPT response:", content);
      return NextResponse.json({ error: "Could not parse receipt" }, { status: 422 });
    }

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      merchant: data.merchant ?? null,
      date: data.date ?? null,
      amount: typeof data.amount === "number" ? data.amount : null,
      description: data.description ?? null,
    });
  } catch (err) {
    console.error("[scan] OpenAI error:", err);
    return NextResponse.json({ error: "AI scan failed", detail: String(err) }, { status: 500 });
  }
}
