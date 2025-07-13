"use client";

import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

interface Snapshot {
  month: string;
  inflows: number;
  outflows: number;
  net_position: number;
}

export function CashFlowDashboard() {
  const [data, setData] = useState<
    { month: string; inflows: number; outflows: number; net: number }[]
  >([]);

  useEffect(() => {
    fetch("/api/finance/cashflow")
      .then((res) => res.json())
      .then(({ data: snapshots }: { data: Snapshot[] }) => {
        const chartData = snapshots.map((s) => ({
          month: new Date(s.month).toLocaleString("default", {
            year: "numeric",
            month: "short",
          }),
          inflows: s.inflows,
          outflows: s.outflows,
          net: s.net_position,
        }));
        setData(chartData);
      })
      .catch((err) => {
        console.error("Failed to load cashflow snapshots:", err);
      });
  }, []);

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow space-y-6">
      <h2 className="text-xl font-semibold">Cashflow Trends</h2>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            <Line
              type="monotone"
              dataKey="inflows"
              name="Inflows"
              stroke="#10b981"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="outflows"
              name="Outflows"
              stroke="#ef4444"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="Net Position"
              stroke="#3b82f6"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border border-gray-200">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-2 border">Month</th>
              <th className="p-2 border text-green-700">Inflows</th>
              <th className="p-2 border text-red-700">Outflows</th>
              <th className="p-2 border text-blue-700">Net Position</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-t hover:bg-gray-50">
                <td className="p-2 border">{row.month}</td>
                <td className="p-2 border text-green-600 font-medium">
                  ₹{row.inflows.toFixed(2)}
                </td>
                <td className="p-2 border text-red-600 font-medium">
                  ₹{row.outflows.toFixed(2)}
                </td>
                <td
                  className={`p-2 border font-semibold ${
                    row.net >= 0 ? "text-green-700" : "text-red-700"
                  }`}
                >
                  ₹{row.net.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-semibold">
            <tr>
              <td className="p-2 border">Total</td>
              <td className="p-2 border text-green-700">
                ₹{data.reduce((sum, r) => sum + r.inflows, 0).toFixed(2)}
              </td>
              <td className="p-2 border text-red-700">
                ₹{data.reduce((sum, r) => sum + r.outflows, 0).toFixed(2)}
              </td>
              <td
                className={`p-2 border ${
                  data.reduce((sum, r) => sum + r.net, 0) >= 0
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                ₹{data.reduce((sum, r) => sum + r.net, 0).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
