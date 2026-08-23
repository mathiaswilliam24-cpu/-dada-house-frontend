import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// DELETE THIS FILE after calling once
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-setup-secret");
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = "cmt63619l000004kzayfkhni2";

  const appt1 = await db.appointment.create({
    data: {
      userId,
      appointmentNumber: `APT${Date.now().toString().slice(-6)}A`,
      service: "Plumbing",
      subservice: "Pipe Leak Repair",
      name: "Client Test",
      phone: "3465550001",
      email: "client.test@dada-house.com",
      address: "1234 Oak Hollow Dr",
      city: "Houston",
      zipCode: "77001",
      description: "Water leaking under the kitchen sink, water pooling every morning.",
      notes: "Found a cracked P-trap fitting under the kitchen sink. Replaced the full P-trap assembly and inspected all supply lines. Tightened compression fittings on the hot/cold valves. Ran water for 15 minutes — no more leaks.",
      photos: [
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
        "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&q=80",
        "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=600&q=80",
      ],
      status: "COMPLETED",
      preferredDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      preferredTime: "10:00 AM",
    },
  });

  const inv1 = await db.invoice.create({
    data: {
      appointmentId: appt1.id,
      amount: 285,
      status: "PAID",
      notes: "Parts + Labor: P-trap assembly replacement",
      paidAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      paymentMethod: "Zelle",
      lineItems: {
        taxEnabled: true,
        taxRate: 8.25,
        items: [
          { description: "P-trap assembly & parts", rate: 180, qty: 1 },
          { description: "Labor (1.5 hrs)", rate: 70, qty: 1.5 },
        ],
      } as object,
    },
  });

  const appt2 = await db.appointment.create({
    data: {
      userId,
      appointmentNumber: `APT${(Date.now() + 1).toString().slice(-6)}B`,
      service: "Air Conditioning",
      subservice: "AC Tune-Up & Filter Change",
      name: "Client Test",
      phone: "3465550001",
      email: "client.test@dada-house.com",
      address: "1234 Oak Hollow Dr",
      city: "Houston",
      zipCode: "77001",
      description: "AC unit not cooling efficiently. Wants a tune-up before summer.",
      notes: "Replaced 20x25x1 air filter (was clogged). Cleaned condenser coils. Checked refrigerant — within spec. Capacitor and contactor in good condition. System running at peak efficiency. Recommend filter change every 60 days.",
      photos: [
        "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80",
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80",
      ],
      status: "COMPLETED",
      preferredDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      preferredTime: "2:00 PM",
    },
  });

  const inv2 = await db.invoice.create({
    data: {
      appointmentId: appt2.id,
      amount: 195,
      status: "SENT",
      notes: "AC tune-up service",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      lineItems: {
        taxEnabled: true,
        taxRate: 8.25,
        items: [
          { description: "AC Tune-Up & Inspection", rate: 120, qty: 1 },
          { description: "20x25x1 Air Filter", rate: 25, qty: 1 },
          { description: "Coil Cleaning", rate: 50, qty: 1 },
        ],
      } as object,
    },
  });

  const appt3 = await db.appointment.create({
    data: {
      userId,
      appointmentNumber: `APT${(Date.now() + 2).toString().slice(-6)}C`,
      service: "Remodeling",
      subservice: "Bathroom Tile Installation",
      name: "Client Test",
      phone: "3465550001",
      email: "client.test@dada-house.com",
      address: "1234 Oak Hollow Dr",
      city: "Houston",
      zipCode: "77001",
      description: "Master bathroom needs new floor tiles. About 45 sq ft.",
      status: "CONFIRMED",
      preferredDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      preferredTime: "9:00 AM",
    },
  });

  return NextResponse.json({
    ok: true,
    appointments: [appt1.id, appt2.id, appt3.id],
    invoices: [inv1.id, inv2.id],
  });
}
