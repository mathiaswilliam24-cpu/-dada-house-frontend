"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, Phone, Zap, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function DispatcherEmergencyPage() {
  const [pending, setPending] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/dispatcher/requests?status=PENDING")
      .then(r => r.json())
      .then(d => setPending((d.appointments ?? []).slice(0, 10)));
  }, []);
  return (
    <div className="space-y-6">
      <div className="bg-red-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2"><AlertTriangle className="w-8 h-8" /><h1 className="text-2xl font-bold">Emergency Queue</h1></div>
        <p className="text-red-100">Handle urgent service requests immediately</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <a href="tel:+18326294398" className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 hover:bg-red-100 transition-colors">
          <Phone className="w-5 h-5 text-red-600" /><div><p className="font-semibold text-red-900 text-sm">Emergency Line</p><p className="text-xs text-red-600">832-629-4398</p></div>
        </a>
        <a href="tel:+19106858042" className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 hover:bg-blue-100 transition-colors">
          <Phone className="w-5 h-5 text-blue-600" /><div><p className="font-semibold text-blue-900 text-sm">Service Line</p><p className="text-xs text-blue-600">910-685-8042</p></div>
        </a>
      </div>
      <div>
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" />Pending Jobs ({pending.length})</h2>
        <div className="space-y-2">
          {pending.map((a: any) => (
            <Link key={a.id} href={`/dispatcher/assign?id=${a.id}`} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 hover:border-red-200 group">
              <div><p className="font-medium text-gray-900 text-sm">{a.service}</p><p className="text-xs text-gray-500">{a.name} · {a.phone}</p></div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600" />
            </Link>
          ))}
          {pending.length === 0 && <p className="text-center text-gray-400 py-6 text-sm">No pending emergency jobs</p>}
        </div>
      </div>
    </div>
  );
}