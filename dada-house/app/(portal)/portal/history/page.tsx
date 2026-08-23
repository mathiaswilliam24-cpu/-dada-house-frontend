import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Calendar, Image as ImageIcon, FileText, Wrench, CheckCircle2, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ServiceHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const completed = await db.appointment.findMany({
    where: { userId: session.user.id, status: "COMPLETED" },
    include: {
      invoice: { select: { id: true, amount: true, status: true, paidAt: true } },
    },
    orderBy: { preferredDate: "desc" },
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service History</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Complete record of all work performed at your home
        </p>
      </div>

      {completed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-600 mb-1">No completed services yet</p>
          <p className="text-sm text-gray-400 mb-4">
            Your service history will appear here once a job is completed.
          </p>
          <Link href="/booking"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7921A] text-white rounded-lg text-sm font-semibold hover:bg-[#F7921A]/90">
            Book a Service
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {completed.map(appt => {
            const isPaid = appt.invoice?.status === "PAID";
            return (
              <Link
                key={appt.id}
                href={`/portal/appointments/${appt.id}`}
                className="flex items-start gap-4 bg-white rounded-xl border border-gray-200 p-5 hover:border-green-400 hover:shadow-md transition-all group"
              >
                {/* Green completed strip */}
                <div className="w-1 self-stretch rounded-full bg-green-400 shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                      {appt.service}
                      {appt.subservice && (
                        <span className="text-gray-500 font-normal"> — {appt.subservice}</span>
                      )}
                    </h3>
                    {appt.invoice && (
                      <span className={`shrink-0 text-sm font-bold ${isPaid ? "text-green-600" : "text-amber-600"}`}>
                        {isPaid ? "PAID ✓" : `$${appt.invoice.amount.toFixed(2)}`}
                      </span>
                    )}
                  </div>

                  {/* Notes preview */}
                  {appt.notes && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">{appt.notes}</p>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-3">
                    {appt.preferredDate && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(appt.preferredDate.toISOString())}
                      </span>
                    )}
                    {appt.notes && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Wrench className="w-3.5 h-3.5" />
                        Work summary
                      </span>
                    )}
                    {appt.photos.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <ImageIcon className="w-3.5 h-3.5 text-[#F7921A]" />
                        {appt.photos.length} photo{appt.photos.length > 1 ? "s" : ""}
                      </span>
                    )}
                    {appt.invoice && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <FileText className="w-3.5 h-3.5 text-[#1B3FA8]" />
                        Receipt
                      </span>
                    )}
                  </div>
                </div>

                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors shrink-0 mt-0.5" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
