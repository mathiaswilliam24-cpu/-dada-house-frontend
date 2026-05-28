import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { differenceInDays } from "date-fns";

export const dynamic = "force-dynamic";

export default async function WarrantiesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const warranties = await db.warranty.findMany({
    where: { userId: session.user.id },
    orderBy: { expiresAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Warranties</h1>
        <p className="text-gray-500 text-sm mt-0.5">Track equipment warranties and expiration dates</p>
      </div>

      <div className="space-y-3">
        {warranties.map((w) => {
          const daysLeft = w.expiresAt ? differenceInDays(w.expiresAt, new Date()) : null;
          const isExpired = daysLeft !== null && daysLeft < 0;
          const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
          const statusColor = isExpired
            ? "border-red-200 bg-red-50"
            : isExpiringSoon
            ? "border-yellow-200 bg-yellow-50"
            : "border-gray-200 bg-white";

          return (
            <div key={w.id} className={`rounded-xl border p-5 ${statusColor}`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isExpired ? "bg-red-100" : isExpiringSoon ? "bg-yellow-100" : "bg-green-100"}`}>
                  {isExpired || isExpiringSoon ? (
                    <AlertTriangle size={18} className={isExpired ? "text-red-600" : "text-yellow-600"} />
                  ) : (
                    <ShieldCheck size={18} className="text-green-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{w.equipmentName}</p>
                  {w.brand && <p className="text-sm text-gray-500">{w.brand} {w.model}</p>}
                  {w.serialNumber && <p className="text-xs text-gray-400 mt-0.5">S/N: {w.serialNumber}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    {w.installDate && <span>Installed: {formatDate(w.installDate)}</span>}
                    {w.expiresAt && (
                      <span className={isExpired ? "text-red-600 font-medium" : isExpiringSoon ? "text-yellow-700 font-medium" : ""}>
                        {isExpired ? "Expired: " : "Expires: "}{formatDate(w.expiresAt)}
                        {daysLeft !== null && !isExpired && ` (${daysLeft} days left)`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {warranties.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            No warranties recorded yet
          </div>
        )}
      </div>
    </div>
  );
}
