import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CustomerDetailClient } from "./customer-detail-client";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const allowedRoles = ["ADMIN", "SUPER_ADMIN", "MANAGER", "CUSTOMER_SERVICE_REP", "DISPATCHER"];
  if (!session?.user || !allowedRoles.includes(session.user.role)) redirect("/");

  const { id } = await params;
  const customerId = decodeURIComponent(id);
  return <CustomerDetailClient customerId={customerId} />;
}
