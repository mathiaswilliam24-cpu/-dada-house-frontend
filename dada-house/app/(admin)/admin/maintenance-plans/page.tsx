import type { Metadata } from "next";
import { db } from "@/lib/db";
import AdminMaintenancePlansClient from "./AdminMaintenancePlansClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Maintenance Plans — Admin | DADA HOUSE" };

export default async function AdminMaintenancePlansPage() {
  const [contracts, stats] = await Promise.all([
    db.maintenanceContract.findMany({
      where: { selfEnrolled: true },
      include: {
        customer: { select: { firstName: true, lastName: true, phone: true } },
        properties: { select: { id: true, address: true, city: true, state: true, systemCount: true } },
        planType: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.maintenanceContract.aggregate({
      where: { selfEnrolled: true, status: "ACTIVE" },
      _count: { id: true },
      _sum: { annualTotal: true, numberOfSystems: true },
    }),
  ]);

  const monthlyRevenue = await db.maintenanceContract.aggregate({
    where: { selfEnrolled: true, status: "ACTIVE", billingInterval: "monthly" },
    _sum: { monthlyTotal: true },
  });

  return (
    <AdminMaintenancePlansClient
      contracts={JSON.parse(JSON.stringify(contracts))}
      stats={{
        activeCount: stats._count.id ?? 0,
        totalSystems: stats._sum.numberOfSystems ?? 0,
        annualRevenue: stats._sum.annualTotal ?? 0,
        monthlyRecurring: monthlyRevenue._sum.monthlyTotal ?? 0,
      }}
    />
  );
}
