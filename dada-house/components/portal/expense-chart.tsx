"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface MonthData { month: string; amount: number }

export function ExpenseChart({ data }: { data: MonthData[] }) {
  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Monthly Expenses</h3>
        <a href="/portal/expenses" className="text-sm text-[#F7921A] hover:underline">Manage →</a>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}
            tickFormatter={(v) => `$${v}`} width={48} />
          <Tooltip
            formatter={(v) => [`$${Number(v).toFixed(2)}`, "Total"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
          />
          <Bar dataKey="amount" fill="#1B3FA8" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
