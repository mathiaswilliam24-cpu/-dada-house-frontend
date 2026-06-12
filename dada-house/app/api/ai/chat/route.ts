import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getOpenAI } from "@/lib/openai";

const SYSTEM_PROMPT = `You are an AI assistant for DADA HOUSE, a professional home services company in Houston, TX.
Services offered: HVAC (AC repair, heating), Plumbing, Electrical, Air Duct Cleaning, Remodeling.
Phone: +1 (346) 649-9353 | Emergency: 832-626-4398 | Available 24/7.

When a customer describes a problem:
1. Ask 1-2 clarifying questions to understand urgency and service type.
2. Determine the service category (one of: HVAC, Plumbing, Electrical, AirDuct, Remodeling, Emergency).
3. Determine urgency: low (can wait 1+ days), medium (today/tomorrow), high (needs same-day), emergency (right now).
4. After 2-3 messages, recommend booking and ask if they want to create an appointment.

Respond in JSON format:
{
  "reply": "Your response to the customer",
  "serviceType": "HVAC|Plumbing|Electrical|AirDuct|Remodeling|Emergency|null",
  "urgency": "low|medium|high|emergency|null",
  "suggestBooking": true|false
}`;

export async function POST(req: NextRequest) {
  const token = await getAuthToken(req);
  const { message, conversationId } = await req.json();
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const sessionId = conversationId ?? crypto.randomUUID();

  let conversation = await db.aIConversation.findUnique({ where: { sessionId } });
  if (!conversation) {
    conversation = await db.aIConversation.create({
      data: {
        sessionId,
        userId: token?.id ?? null,
        messages: [],
      },
    });
  }

  type Message = { role: "user" | "assistant"; content: string };
  const history = (conversation.messages as Message[]) ?? [];
  history.push({ role: "user", content: message });

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m: Message) => ({ role: m.role, content: m.content })),
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0].message.content ?? "{}";
  let parsed: { reply: string; serviceType?: string; urgency?: string; suggestBooking?: boolean };
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { reply: raw };
  }

  history.push({ role: "assistant", content: parsed.reply });

  await db.aIConversation.update({
    where: { sessionId },
    data: {
      messages: history as unknown as import("@/lib/generated/prisma/client").Prisma.JsonArray,
      serviceType: parsed.serviceType ?? conversation.serviceType,
      urgency: parsed.urgency ?? conversation.urgency,
    },
  });

  return NextResponse.json({
    reply: parsed.reply,
    conversationId: sessionId,
    serviceType: parsed.serviceType ?? null,
    urgency: parsed.urgency ?? null,
    suggestBooking: parsed.suggestBooking ?? false,
  });
}
