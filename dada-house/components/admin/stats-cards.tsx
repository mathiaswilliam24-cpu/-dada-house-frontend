"use client";

import { TrendingUp, Clock, CheckCircle, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface StatsData {
  total: number;
  pending: number;
  completed: number;
  thisMonth: number;
  revenue: number;
}

export function StatsCards({ data }: { data: StatsData }) {
  const cards = [
    {
      label: "Total Appointments",
      value: data.total.toString(),
      icon: TrendingUp,
      color: "bg-blue-50 text-blue-600",
      change: `+${data.thisMonth} this month`,
    },
    {
      label: "Pending",
      value: data.pending.toString(),
      icon: Clock,
      color: "bg-yellow-50 text-yellow-600",
      change: "Awaiting confirmation",
    },
    {
      label: "Completed",
      value: data.completed.toString(),
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
      change: "All time",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(data.revenue),
      icon: DollarSign,
      color: "bg-orange-50 text-orange-600",
      change: "From paid invoices",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{card.label}</p>
              <div className={`p-2 rounded-lg ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.change}</p>
          </div>
        );
      })}
    </div>
  );
}
