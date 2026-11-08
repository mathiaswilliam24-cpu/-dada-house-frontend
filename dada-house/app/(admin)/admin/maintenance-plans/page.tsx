import type { Metadata } from "next";
import { db } from "@/lib/db";
import AdminMaintenancePlansClient from "./AdminMaintenancePlansClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Maintenance Plans — Admin | DADA HOUSE" };

export default async function AdminMaintenancePlansPage() {
  const [contracts, stats, planTypes] = await Promise.all([
    db.maintenanceContract.findMany({
      where: {
        OR: [
          { selfEnrolled: true },
          { selfEnrolled: false, membershipNumber: { not: null } },
        ],
      },
      include: {
        customer: { select: { firstName: true, lastName: true, phone: true, userId: true } },
        properties: { select: { id: true, address: true, city: true, state: true, systemCount: true } },
        planType: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.maintenanceContract.aggregate({
      where: {
        status: "ACTIVE",
        OR: [{ selfEnrolled: true }, { selfEnrolled: false, membershipNumber: { not: null } }],
      },
      _count: { id: true },
      _sum: { annualTotal: true, numberOfSystems: true },
    }),
    db.maintenancePlanType.findMany({
      where: { isActive: true },
      select: { id: true, name: true, monthlyPrice: true, annualPrice: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const monthlyRevenue = await db.maintenanceContract.aggregate({
    where: {
      status: "ACTIVE",
      billingInterval: "monthly",
      OR: [{ selfEnrolled: true }, { selfEnrolled: false, membershipNumber: { not: null } }],
    },
    _sum: { monthlyTotal: true },
  });

  return (
    <AdminMaintenancePlansClient
      contracts={JSON.parse(JSON.stringify(contracts))}
      planTypes={JSON.parse(JSON.stringify(planTypes))}
      stats={{
        activeCount: stats._count.id ?? 0,
        totalSystems: stats._sum.numberOfSystems ?? 0,
        annualRevenue: stats._sum.annualTotal ?? 0,
        monthlyRecurring: monthlyRevenue._sum.monthlyTotal ?? 0,
      }}
    />
  );
}
