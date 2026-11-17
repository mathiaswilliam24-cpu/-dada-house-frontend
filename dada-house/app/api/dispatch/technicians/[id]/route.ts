import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { geocodeAddress, TECH_ROLES, PAY_ROLES } from "@/lib/dispatch";
import { Prisma } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const day = z.object({ start: time, end: time }).refine((d) => d.end > d.start, "End must be after start").nullable();
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const tags = z.array(z.string().trim().min(1).max(60)).max(40);

const schema = z.object({
  isActive: z.boolean().optional(),
  employeeId: z.string().trim().max(40).nullable().optional(),
  employmentType: z.enum(["W2", "1099"]).nullable().optional(),
  techRole: z.enum(TECH_ROLES).nullable().optional(),
  skills: tags.optional(),
  serviceAreas: tags.optional(),
  workingHours: z.object(Object.fromEntries(DAYS.map((d) => [d, day])) as Record<(typeof DAYS)[number], typeof day>).nullable().optional(),
  emergencyAvailable: z.boolean().optional(),
  boardColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  homeAddress: z.string().trim().max(200).nullable().optional(),
  vehicle: z.string().trim().max(120).nullable().optional(),
  licenseNumber: z.string().trim().max(60).nullable().optional(),
  hourlyRate: z.number().min(0).max(1000).nullable().optional(),
  commissionRate: z.number().min(0).max(100).nullable().optional(),
});

/** Updates (or creates) a technician's dispatch profile. Pay fields are manager-only. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  const input = parsed.data;

  if ((input.hourlyRate !== undefined || input.commissionRate !== undefined) && !PAY_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: "Only managers can change pay rates." }, { status: 403 });
  }

  const user = await db.user.findUnique({ where: { id }, select: { role: true, technicianProfile: { select: { homeAddress: true } } } });
  if (!user || user.role !== "TECHNICIAN") return NextResponse.json({ error: "Technician not found" }, { status: 404 });

  const { workingHours, ...rest } = input;
  const data: Prisma.TechnicianProfileUncheckedUpdateInput = { ...rest };
  if (workingHours !== undefined) data.workingHours = workingHours === null ? Prisma.DbNull : workingHours;

  // Home base → coordinates for travel-time estimates.
  let geocodeWarning: string | null = null;
  if (input.homeAddress !== undefined && input.homeAddress !== user.technicianProfile?.homeAddress) {
    if (!input.homeAddress) {
      data.homeLat = null; data.homeLng = null;
    } else {
      const geo = await geocodeAddress(input.homeAddress);
      if (geo) { data.homeLat = geo.lat; data.homeLng = geo.lng; data.homeAddress = geo.formatted; }
      else { data.homeLat = null; data.homeLng = null; geocodeWarning = "Address saved, but it could not be located on the map — travel times from home won't be available."; }
    }
  }

  const profile = await db.technicianProfile.upsert({
    where: { userId: id },
    update: data,
    create: { ...(data as Prisma.TechnicianProfileUncheckedCreateInput), userId: id },
  });
  return NextResponse.json({ ok: true, geocodeWarning, homeAddress: profile.homeAddress, homeLat: profile.homeLat, homeLng: profile.homeLng });
}
