"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface DataPoint {
  month: string;
  count: number;
  revenue: number;
}

export function RevenueChart({ data }: { data: DataPoint[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Revenue & Jobs (Last 6 Months)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value, name) =>
              name === "Revenue" ? [`$${Number(value).toLocaleString()}`, name] : [value, name]
            }
          />
          <Legend />
          <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#1B3FA8" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="right" dataKey="count" name="Jobs" fill="#F7921A" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}