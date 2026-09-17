import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type BillingRow = {
  id: string;
  title: string;
  subtitle: string;
  date: Date | null;
  amount: number;
  status: string;
  href: string | null;
  dueDate: Date | null;
};

export default async function PortalInvoicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const [invoices, estimates] = await Promise.all([
    db.invoice.findMany({
      where: { appointment: { userId: session.user.id } },
      include: { appointment: { select: { service: true, appointmentNumber: true, preferredDate: true } } },
      orderBy: { createdAt: "desc" },
    }),
    session.user.email
      ? db.estimate.findMany({
          where: { clientEmail: { equals: session.user.email, mode: "insensitive" } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  // Technician-created Estimates/Invoices live in a separate model, matched here
  // by email since Estimate has no direct userId — see the [id] appointment link
  // (often absent for walk-in-originated jobs) for why that join alone isn't reliable.
  const rows: BillingRow[] = [
    ...invoices.map((inv) => ({
      id: `invoice-${inv.id}`,
      title: inv.appointment.service,
      subtitle: inv.appointment.appointmentNumber,
      date: inv.appointment.preferredDate,
      amount: inv.amount,
      status: inv.status,
      href: `/portal/invoices/${inv.id}`,
      dueDate: inv.dueDate,
    })),
    ...estimates.map((est) => ({
      id: `estimate-${est.id}`,
      title: est.isInvoice ? "Invoice" : "Estimate",
      subtitle: est.estimateNumber,
      date: est.createdAt,
      amount: est.total,
      status: est.isInvoice ? (est.paidAt ? "PAID" : "SENT") : est.status,
      href: est.isInvoice && est.paymentToken ? `/pay/${est.paymentToken}` : null,
      dueDate: null,
    })),
  ].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your billing history</p>
      </div>

      <div className="space-y-3">
        {rows.map((row) => {
          const statusClass =
            row.status === "PAID" ? "bg-green-50 text-green-700 border border-green-200" :
            row.status === "SENT" ? "bg-orange-50 text-orange-700 border border-orange-200" :
            "bg-gray-50 text-gray-700 border border-gray-200";

          const content = (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{row.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{row.subtitle}</p>
                  {row.date && <p className="text-xs text-gray-400 mt-1">{formatDate(row.date)}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(row.amount)}</p>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium mt-1 inline-block ${statusClass}`}>
                    {row.status}
                  </span>
                </div>
              </div>
              {row.dueDate && row.status !== "PAID" && (
                <p className="text-xs text-red-600 mt-2">Due: {formatDate(row.dueDate)}</p>
              )}
              {!row.href && (
                <p className="text-xs text-gray-400 mt-2">Check your email for the full estimate details.</p>
              )}
            </>
          );

          return row.href ? (
            <Link key={row.id} href={row.href} className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-200 hover:shadow-sm transition-all">
              {content}
            </Link>
          ) : (
            <div key={row.id} className="bg-white rounded-xl border border-gray-200 p-5">
              {content}
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            No invoices yet
          </div>
        )}
      </div>
    </div>
  );
}
