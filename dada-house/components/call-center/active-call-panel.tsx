"use client";

import { User, Phone, MapPin, Calendar } from "lucide-react";
import type { QueueCall } from "./live-queue";

export function ActiveCallPanel({ call }: { call: QueueCall | null }) {
  if (!call) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
        <User className="w-10 h-10 text-gray-200 mb-3" />
        <p className="text-gray-400 text-sm">No active call. Incoming calls will appear here when answered.</p>
      </div>
    );
  }

  const customer = call.customer;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 h-full">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-[#1B3FA8] rounded-full flex items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-white">{(customer?.firstName ?? call.fromNumber)[0]?.toUpperCase()}</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{customer ? `${customer.firstName} ${customer.lastName ?? ""}` : "Unknown Caller"}</h2>
          <p className="flex items-center gap-1 text-sm text-gray-500"><Phone className="w-3.5 h-3.5" /> {call.direction === "INBOUND" ? call.fromNumber : call.toNumber}</p>
          <span className="inline-block mt-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
            {customer ? "Returning Customer" : "New Caller"}
          </span>
        </div>
      </div>

      {customer?.tags && customer.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-4">
          {customer.tags.map((t) => <span key={t} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{t}</span>)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
        <div className="border border-gray-100 rounded-lg p-3">
          <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</p>
          <p className="text-gray-700 mt-0.5">—</p>
        </div>
        <div className="border border-gray-100 rounded-lg p-3">
          <p className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Last Service</p>
          <p className="text-gray-700 mt-0.5">See customer profile</p>
        </div>
      </div>
    </div>
  );
}
