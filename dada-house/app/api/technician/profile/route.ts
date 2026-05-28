import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { techProfileSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const [user, profile] = await Promise.all([
    db.user.findUnique({
      where: { id: auth.id },
      select: { id: true, name: true, email: true, phone: true, image: true },
    }),
    db.technicianProfile.findUnique({ where: { userId: auth.id } }),
  ]);

  return NextResponse.json({ user, profile });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const result = techProfileSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const {
    name,
    phone,
    bio,
    specialties,
    skills,
    serviceAreas,
    vehicle,
    licenseNumber,
    vehicleInfo,
    certifications,
  } = result.data;

  const [user, profile] = await Promise.all([
    db.user.update({
      where: { id: auth.id },
      data: { name, phone: phone ?? null },
      select: { id: true, name: true, email: true, phone: true },
    }),
    db.technicianProfile.upsert({
      where: { userId: auth.id },
      create: {
        userId: auth.id,
        bio: bio ?? null,
        specialties: specialties ?? [],
        skills: skills ?? [],
        serviceAreas: serviceAreas ?? [],
        vehicle: vehicle ?? null,
        licenseNumber: licenseNumber ?? null,
        vehicleInfo: vehicleInfo ?? undefined,
        certifications: certifications ?? undefined,
      },
      update: {
        bio: bio ?? null,
        specialties: specialties ?? [],
        skills: skills ?? [],
        serviceAreas: serviceAreas ?? [],
        vehicle: vehicle ?? null,
        licenseNumber: licenseNumber ?? null,
        vehicleInfo: vehicleInfo ?? undefined,
        certifications: certifications ?? undefined,
      },
    }),
  ]);

  return NextResponse.json({ user, profile });
}
