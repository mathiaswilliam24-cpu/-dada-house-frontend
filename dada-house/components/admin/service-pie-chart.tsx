"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ServiceData {
  service: string;
  count: number;
}

const COLORS = ["#F7921A", "#1B3FA8", "#3b82f6", "#10b981", "#8b5cf6"];

export function ServicePieChart({ data }: { data: ServiceData[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">
        Services Breakdown
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="count"
            nameKey="service"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              fontSize: "13px",
            }}
            formatter={(value) => [value ?? 0, "Appointments"]}
          />
          <Legend
            formatter={(value) => (
              <span style={{ fontSize: "12px", color: "#4b5563" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
