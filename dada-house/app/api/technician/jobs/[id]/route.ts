import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getCountyForAddress } from "@/lib/geocode";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const job = await db.appointment.findFirst({
    where: {
      id,
      technicianId: auth.role === "ADMIN" ? undefined : auth.id,
    },
    include: {
      diagnosisForm: true,
      jobPhotos: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "asc" } },
      checklist: true,
      timeLog: true,
      parts: { orderBy: { createdAt: "asc" } },
      invoice: true,
      maintenanceLogs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Tax county ("tax zone") is looked up once via geocoding and cached on the
  // appointment — no need to re-hit the Google API on every job page load.
  if (!job.taxCounty && job.address) {
    const county = await getCountyForAddress(job.address, job.city, job.zipCode);
    if (county) {
      await db.appointment.update({ where: { id }, data: { taxCounty: county } }).catch(() => {});
      job.taxCounty = county;
    }
  }

  const estimate = await db.estimate.findFirst({
    where: { appointmentId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ job, estimate });
}
