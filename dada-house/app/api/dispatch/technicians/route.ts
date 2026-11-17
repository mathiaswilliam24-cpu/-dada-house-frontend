import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getDispatchConfig, PAY_ROLES } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

/** Every technician account with its dispatch profile (inactive ones included). */
export async function GET(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  const canSeePay = PAY_ROLES.includes(auth.role);

  const [users, cfg] = await Promise.all([
    db.user.findMany({
      where: { role: "TECHNICIAN" },
      select: { id: true, name: true, email: true, phone: true, image: true, technicianProfile: true },
      orderBy: { name: "asc" },
    }),
    getDispatchConfig(),
  ]);

  return NextResponse.json({
    canEditPay: canSeePay,
    businessHours: cfg.businessHours,
    technicians: users.map((u) => {
      const p = u.technicianProfile;
      return {
        id: u.id, name: u.name, email: u.email, phone: u.phone, image: u.image,
        hasProfile: !!p,
        isActive: p?.isActive ?? true,
        employeeId: p?.employeeId ?? null,
        employmentType: p?.employmentType ?? null,
        techRole: p?.techRole ?? null,
        skills: p?.skills ?? [],
        specialties: p?.specialties ?? [],
        serviceAreas: p?.serviceAreas ?? [],
        workingHours: p?.workingHours ?? null,
        emergencyAvailable: p?.emergencyAvailable ?? false,
        boardColor: p?.boardColor ?? null,
        homeAddress: p?.homeAddress ?? null,
        homeLat: p?.homeLat ?? null,
        homeLng: p?.homeLng ?? null,
        vehicle: p?.vehicle ?? null,
        licenseNumber: p?.licenseNumber ?? null,
        hourlyRate: canSeePay ? p?.hourlyRate ?? null : undefined,
        commissionRate: canSeePay ? p?.commissionRate ?? null : undefined,
      };
    }),
  });
}
