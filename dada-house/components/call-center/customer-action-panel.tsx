"use client";

import Link from "next/link";
import { UserPlus, Briefcase, MessageSquare, StickyNote, History } from "lucide-react";
import type { QueueCall } from "./live-queue";

export function CustomerActionPanel({ call }: { call: QueueCall | null }) {
  const customerId = call?.customer?.id;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
      <h2 className="font-bold text-gray-900 text-sm mb-2">Customer Actions</h2>

      {!customerId && (
        <Link href="/customers" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 text-gray-700">
          <UserPlus className="w-4 h-4" /> Create Customer
        </Link>
      )}

      <Link href="/dispatcher/appointments/new" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm bg-[#F7921A]/10 hover:bg-[#F7921A]/20 text-[#B85E0F] font-medium">
        <Briefcase className="w-4 h-4" /> Create Job
      </Link>

      <Link href="/messages" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 text-gray-700">
        <MessageSquare className="w-4 h-4" /> Send SMS
      </Link>

      {customerId && (
        <>
          <Link href={`/customers/${customerId}`} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 text-gray-700">
            <History className="w-4 h-4" /> View History
          </Link>
          <Link href={`/customers/${customerId}`} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 text-gray-700">
            <StickyNote className="w-4 h-4" /> Add Note
          </Link>
        </>
      )}
    </div>
  );
}
