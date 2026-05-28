import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ServiceHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const logs = await db.maintenanceLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service History</h1>
        <p className="text-gray-500 text-sm mt-0.5">Complete record of all work performed at your properties</p>
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <Wrench size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">{formatDate(log.createdAt)}</p>
                  {log.laborHours && (
                    <span className="text-xs text-gray-500">{log.laborHours}h labor</span>
                  )}
                </div>
                {log.notes && <p className="text-sm text-gray-600 mt-1">{log.notes}</p>}
                {log.photos.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {log.photos.slice(0, 4).map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt={`Photo ${i+1}`} className="w-16 h-16 object-cover rounded-lg" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            No service records yet
          </div>
        )}
      </div>
    </div>
  );
}
