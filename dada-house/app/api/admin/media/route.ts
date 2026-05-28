import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const [appointments, invoices, gallery, reviews] = await Promise.all([
    db.appointment.findMany({
      where: { photos: { isEmpty: false } },
      select: { photos: true, appointmentNumber: true, name: true, service: true, createdAt: true },
      take: 200,
    }),
    db.invoice.findMany({
      where: { pdfUrl: { not: null } },
      select: { pdfUrl: true, createdAt: true, appointment: { select: { appointmentNumber: true, name: true } } },
      take: 200,
    }),
    db.galleryProject.findMany({
      where: { images: { isEmpty: false } },
      select: { images: true, title: true, category: true, createdAt: true },
      take: 200,
    }),
    db.review.findMany({
      where: { photos: { isEmpty: false } },
      select: { photos: true, name: true, service: true, createdAt: true },
      take: 200,
    }),
  ]);

  const files: { url: string; category: string; label: string; source: string; date: string }[] = [];

  for (const appt of appointments) {
    for (const url of appt.photos) {
      files.push({ url, category: "Job Photos", label: `${appt.appointmentNumber} — ${appt.service}`, source: appt.name, date: appt.createdAt.toISOString() });
    }
  }
  for (const inv of invoices) {
    if (inv.pdfUrl) {
      files.push({ url: inv.pdfUrl, category: "Invoice PDFs", label: `Invoice — ${inv.appointment.appointmentNumber}`, source: inv.appointment.name, date: inv.createdAt.toISOString() });
    }
  }
  for (const proj of gallery) {
    for (const url of proj.images) {
      files.push({ url, category: "Gallery Images", label: proj.title, source: proj.category, date: proj.createdAt.toISOString() });
    }
  }
  for (const rev of reviews) {
    for (const url of rev.photos) {
      files.push({ url, category: "Review Photos", label: `${rev.name} — ${rev.service ?? "Review"}`, source: rev.name, date: rev.createdAt.toISOString() });
    }
  }

  files.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ files, total: files.length });
}
