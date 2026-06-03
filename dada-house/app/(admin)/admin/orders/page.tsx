"use client";
import { useEffect, useState } from "react";
import {
  Package, ChevronDown, ChevronUp, Loader2, Wrench, MapPin,
  Calendar, Clock, User, CheckCircle, Truck, Home, AlertCircle, X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type OrderItem = { productName: string; quantity: number; price: number };
type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  customerEmail: string | null;
  customerPhone: string | null;
  installationFirstName: string | null;
  installationLastName: string | null;
  installationAddress: string | null;
  installationCity: string | null;
  installationDate: string | null;
  installationTime: string | null;
  technicianName: string | null;
  jobComplete: boolean;
  adminConfirmed: boolean;
  installationPhotos: string[];
  user: { name: string | null; email: string | null } | null;
  items: OrderItem[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:    { label: "Pending",    color: "bg-yellow-50 text-yellow-700 border-yellow-200",  icon: <AlertCircle className="w-3.5 h-3.5" /> },
  CONFIRMED:  { label: "Confirmed",  color: "bg-blue-50 text-blue-700 border-blue-200",        icon: <CheckCircle className="w-3.5 h-3.5" /> },
  PROCESSING: { label: "Processing", color: "bg-purple-50 text-purple-700 border-purple-200",  icon: <Package className="w-3.5 h-3.5" /> },
  ASSIGNED:   { label: "Assigned",   color: "bg-indigo-50 text-indigo-700 border-indigo-200",  icon: <User className="w-3.5 h-3.5" /> },
  EN_ROUTE:   { label: "En Route",   color: "bg-orange-50 text-orange-700 border-orange-200",  icon: <Truck className="w-3.5 h-3.5" /> },
  ARRIVED:    { label: "Arrived",    color: "bg-teal-50 text-teal-700 border-teal-200",        icon: <Home className="w-3.5 h-3.5" /> },
  INSTALLED:  { label: "Installed",  color: "bg-green-50 text-green-700 border-green-200",     icon: <Wrench className="w-3.5 h-3.5" /> },
  CANCELLED:  { label: "Cancelled",  color: "bg-gray-50 text-gray-500 border-gray-200",        icon: <X className="w-3.5 h-3.5" /> },
};

const WORKFLOW_STEPS = ["PENDING", "CONFIRMED", "PROCESSING", "ASSIGNED", "EN_ROUTE", "ARRIVED", "INSTALLED"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState<string | null>(null);
  const [techNames, setTechNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/orders")
      .then(r => r.json())
      .then(d => { setOrders(d.orders ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  async function patch(id: string, payload: Record<string, unknown>) {
    setSaving(id);
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    const data = await res.json();
    if (data.order) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...data.order } : o));
    }
    setSaving(null);
  }

  async function setStatus(id: string, status: string, extra?: Record<string, unknown>) {
    await patch(id, { status, ...extra });
  }

  async function assignTech(id: string) {
    const name = techNames[id]?.trim();
    if (!name) return;
    await patch(id, { status: "ASSIGNED", technicianName: name });
  }

  function clientName(order: Order) {
    const n = `${order.installationFirstName ?? ""} ${order.installationLastName ?? ""}`.trim();
    return n || order.user?.name || order.user?.email || "Guest";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Installation Orders</h1>
          <p className="text-gray-500 text-sm mt-0.5">{orders.length} total orders</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", ...WORKFLOW_STEPS, "CANCELLED"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filter === s ? "bg-[#1B3FA8] text-white border-[#1B3FA8]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}>
            {s === "all" ? "All" : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400 text-sm">No orders found</div>
          ) : filtered.map(order => {
            const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, color: "bg-gray-50 text-gray-600 border-gray-200", icon: null };
            const isExpanded = expanded === order.id;
            const isSaving = saving === order.id;
            const installDateStr = order.installationDate
              ? new Date(order.installationDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : null;

            return (
              <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Row header */}
                <div className="px-5 py-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : order.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{order.orderNumber}</span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${cfg.color}`}>
                        {cfg.icon}{cfg.label}
                      </span>
                      {order.adminConfirmed && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 border border-green-200">
                          <CheckCircle className="w-3 h-3" />Admin Confirmed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500">{clientName(order)}</span>
                      {installDateStr && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{installDateStr}
                          {order.installationTime && <><Clock className="w-3 h-3 ml-1" />{order.installationTime}</>}
                        </span>
                      )}
                      {order.installationAddress && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{order.installationAddress}, {order.installationCity}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-bold text-gray-900 shrink-0">{formatCurrency(order.total)}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-5 space-y-5 bg-gray-50/40">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* Products */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Products</p>
                        <div className="space-y-1.5">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="flex-1 text-gray-700">{item.productName}</span>
                              <span className="text-gray-400">×{item.quantity}</span>
                              <span className="font-medium text-gray-900 text-xs">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Client & contact */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Client</p>
                        <div className="space-y-1 text-sm text-gray-700">
                          <p className="font-medium">{clientName(order)}</p>
                          {order.customerEmail && <p className="text-gray-500 text-xs">{order.customerEmail}</p>}
                          {order.customerPhone && <p className="text-gray-500 text-xs">{order.customerPhone}</p>}
                          {order.installationAddress && (
                            <p className="text-gray-500 text-xs flex items-start gap-1 mt-1">
                              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                              {order.installationAddress}, {order.installationCity}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Technician */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Technician</p>
                        {order.technicianName ? (
                          <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[#1B3FA8]" />{order.technicianName}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Not yet assigned</p>
                        )}
                      </div>
                    </div>

                    {/* Installation photos (if any) */}
                    {order.installationPhotos?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Installation Photos</p>
                        <div className="flex flex-wrap gap-2">
                          {order.installationPhotos.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Workflow actions */}
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions</p>
                      <div className="flex flex-wrap gap-2">
                        {isSaving ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />Saving…
                          </div>
                        ) : (
                          <>
                            {order.status === "CONFIRMED" && (
                              <button onClick={() => setStatus(order.id, "PROCESSING")}
                                className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5" />Mark Processing
                              </button>
                            )}

                            {order.status === "PROCESSING" && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <input
                                  value={techNames[order.id] ?? ""}
                                  onChange={e => setTechNames(p => ({ ...p, [order.id]: e.target.value }))}
                                  placeholder="Technician name…"
                                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
                                />
                                <button onClick={() => assignTech(order.id)}
                                  disabled={!techNames[order.id]?.trim()}
                                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5" />Assign Technician
                                </button>
                              </div>
                            )}

                            {order.status === "ASSIGNED" && (
                              <button onClick={() => setStatus(order.id, "EN_ROUTE")}
                                className="px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5" />En Route
                              </button>
                            )}

                            {order.status === "EN_ROUTE" && (
                              <button onClick={() => setStatus(order.id, "ARRIVED")}
                                className="px-3 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1.5">
                                <Home className="w-3.5 h-3.5" />Mark Arrived
                              </button>
                            )}

                            {order.status === "ARRIVED" && (
                              <button onClick={() => setStatus(order.id, "INSTALLED")}
                                className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5" />Job Complete
                              </button>
                            )}

                            {order.status === "INSTALLED" && !order.adminConfirmed && (
                              <button onClick={() => patch(order.id, { adminConfirmed: true })}
                                className="px-3 py-1.5 bg-[#1B3FA8] text-white text-xs font-semibold rounded-lg hover:bg-[#163291] transition-colors flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5" />Confirm Installation
                              </button>
                            )}

                            {order.status === "INSTALLED" && order.adminConfirmed && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-green-700 font-semibold">
                                <CheckCircle className="w-3.5 h-3.5" />Installation Confirmed
                              </span>
                            )}

                            {order.status !== "CANCELLED" && order.status !== "INSTALLED" && (
                              <button onClick={() => setStatus(order.id, "CANCELLED")}
                                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-500 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 ml-auto">
                                <X className="w-3.5 h-3.5" />Cancel Order
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
