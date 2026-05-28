"use client";
import { useEffect, useState } from "react";
import { Package, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type OrderItem = { productName: string; quantity: number; price: number };
type Order = { id: string; orderNumber: string; status: string; total: number; createdAt: string; user: { name: string | null; email: string | null } | null; items: OrderItem[] };

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  PROCESSING: "bg-blue-50 text-blue-700",
  SHIPPED: "bg-purple-50 text-purple-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-gray-50 text-gray-500",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/admin/orders").then(r => r.json()).then(d => { setOrders(d.orders ?? []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/admin/orders`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-0.5">{orders.length} total orders</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {["all", "PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter === s ? "bg-[#1B3FA8] text-white border-[#1B3FA8]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No orders found</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(order => (
                <div key={order.id}>
                  <div className="px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-0.5">
                        <p className="font-semibold text-gray-900 text-sm">{order.orderNumber}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-50 text-gray-600"}`}>{order.status}</span>
                      </div>
                      <p className="text-xs text-gray-500">{order.user?.name ?? order.user?.email ?? "Guest"} · {new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
                    <select
                      value={order.status}
                      onChange={e => updateStatus(order.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none"
                      onClick={e => e.stopPropagation()}
                    >
                      {["PENDING","PROCESSING","SHIPPED","DELIVERED","CANCELLED"].map(s => <option key={s}>{s}</option>)}
                    </select>
                    <button onClick={() => setExpanded(expanded === order.id ? null : order.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                      {expanded === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  {expanded === order.id && (
                    <div className="px-5 pb-4 border-t border-gray-50 bg-gray-50/50">
                      <div className="pt-3 space-y-2">
                        {order.items?.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm">
                            <Package className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="flex-1 text-gray-700">{item.productName}</span>
                            <span className="text-gray-500">×{item.quantity}</span>
                            <span className="font-medium text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
