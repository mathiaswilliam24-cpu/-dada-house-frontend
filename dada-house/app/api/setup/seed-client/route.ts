import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// One-time endpoint — DELETE AFTER USE
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-setup-secret");
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = "cmt63619l000004kzayfkhni2"; // client.test@dada-house.com

  // Create appointment 1 — Plumbing (COMPLETED)
  const appt1 = await db.appointment.create({
    data: {
      userId,
      appointmentNumber: `APT${Date.now().toString().slice(-6)}`,
      service: "Plumbing",
      subservice: "Pipe Leak Repair",
      name: "Client Test",
      phone: "3465550001",
      email: "client.test@dada-house.com",
      address: "1234 Oak Hollow Dr",
      city: "Houston",
      zipCode: "77001",
      description: "Water leaking under the kitchen sink, noticed a pool of water forming every morning.",
      notes: "Found a cracked P-trap fitting under the kitchen sink. Replaced the full P-trap assembly and inspected all supply lines. Tightened compression fittings on the hot/cold valves. Ran water for 15 minutes — no more leaks. Area cleaned and dried.",
      photos: [
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
        "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&q=80",
        "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=600&q=80",
      ],
      status: "COMPLETED",
      preferredDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      preferredTime: "10:00 AM",
    },
  });

  // Invoice for appt1
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
      },
    },
  });

  // Create appointment 2 — AC (COMPLETED, unpaid)
  const appt2 = await db.appointment.create({
    data: {
      userId,
      appointmentNumber: `APT${(Date.now() + 1).toString().slice(-6)}`,
      service: "Air Conditioning",
      subservice: "AC Tune-Up & Filter Change",
      name: "Client Test",
      phone: "3465550001",
      email: "client.test@dada-house.com",
      address: "1234 Oak Hollow Dr",
      city: "Houston",
      zipCode: "77001",
      description: "AC unit not cooling as efficiently as before. Wants a general tune-up before summer.",
      notes: "Replaced 20x25x1 air filter (was clogged). Cleaned condenser coils. Checked refrigerant levels — within spec. Inspected capacitor and contactor — both in good condition. System now running at peak efficiency. Recommended changing filter every 60 days.",
      photos: [
        "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80",
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80",
      ],
      status: "COMPLETED",
      preferredDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      preferredTime: "2:00 PM",
    },
  });

  // Invoice for appt2 (SENT, unpaid)
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
      },
    },
  });

  // Create appointment 3 — upcoming (CONFIRMED)
  const appt3 = await db.appointment.create({
    data: {
      userId,
      appointmentNumber: `APT${(Date.now() + 2).toString().slice(-6)}`,
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
      preferredDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      preferredTime: "9:00 AM",
    },
  });

  return NextResponse.json({
    ok: true,
    created: [
      { id: appt1.id, service: appt1.service, invoiceId: inv1.id },
      { id: appt2.id, service: appt2.service, invoiceId: inv2.id },
      { id: appt3.id, service: appt3.service },
    ],
  });
}
