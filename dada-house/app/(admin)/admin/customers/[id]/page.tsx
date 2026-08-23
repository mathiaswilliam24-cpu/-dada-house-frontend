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
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const { id } = await params;
  const customerId = decodeURIComponent(id);
  return <CustomerDetailClient customerId={customerId} />;
}
