import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { generateAppointmentNumber } from "@/lib/utils";
import { z } from "zod";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const schema = z.object({
  service: z.string().min(1),
  subservice: z.string().optional(),
  name: z.string().min(2),
  phone: z.string().min(7),
  email: z.union([z.literal(""), z.string().email()]).optional().default(""),
  address: z.string().min(3),
  city: z.string().min(2),
  zipCode: z.string().optional().default(""),
  description: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  technicianId: z.string().optional(),
  photos: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
  }

  const { technicianId, ...data } = parsed.data;
  const appointmentNumber = generateAppointmentNumber();
  const confirmationToken = crypto.randomBytes(32).toString("hex");

  const appointment = await db.appointment.create({
    data: {
      appointmentNumber,
      dispatcherId: auth.id,
      source: "dispatcher",
      confirmationToken,
      ...data,
      preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
      ...(technicianId ? { technicianId } : {}),
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.mydadahouse.com";
  const confirmUrl = `${baseUrl}/confirm/${confirmationToken}`;

  return NextResponse.json({ appointment, confirmUrl }, { status: 201 });
}
