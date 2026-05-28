import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const orders = await db.order.findMany({
    where: { userId: session.user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
    PROCESSING: "bg-blue-50 text-blue-700 border-blue-200",
    SHIPPED: "bg-purple-50 text-purple-700 border-purple-200",
    DELIVERED: "bg-green-50 text-green-700 border-green-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="text-gray-500 text-sm mt-0.5">Track your product orders</p>
      </div>

      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${statusColors[order.status] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
                  {order.status}
                </span>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-1">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{item.productName} × {item.quantity}</span>
                  <span className="text-gray-700">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            No orders yet. <a href="/store" className="text-[#F7921A] hover:underline">Browse the store →</a>
          </div>
        )}
      </div>
    </div>
  );
}
