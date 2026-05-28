import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalInvoicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const invoices = await db.invoice.findMany({
    where: { appointment: { userId: session.user.id } },
    include: { appointment: { select: { service: true, appointmentNumber: true, preferredDate: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your billing history</p>
      </div>

      <div className="space-y-3">
        {invoices.map((inv) => (
          <Link
            key={inv.id}
            href={`/portal/invoices/${inv.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{inv.appointment.service}</p>
                <p className="text-sm text-gray-500 mt-0.5">{inv.appointment.appointmentNumber}</p>
                {inv.appointment.preferredDate && (
                  <p className="text-xs text-gray-400 mt-1">{formatDate(inv.appointment.preferredDate)}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{formatCurrency(inv.amount)}</p>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium mt-1 inline-block ${
                  inv.status === "PAID" ? "bg-green-50 text-green-700 border border-green-200" :
                  inv.status === "SENT" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                  "bg-gray-50 text-gray-700 border border-gray-200"
                }`}>
                  {inv.status}
                </span>
              </div>
            </div>
            {inv.dueDate && inv.status !== "PAID" && (
              <p className="text-xs text-red-600 mt-2">Due: {formatDate(inv.dueDate)}</p>
            )}
          </Link>
        ))}
        {invoices.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            No invoices yet
          </div>
        )}
      </div>
    </div>
  );
}
