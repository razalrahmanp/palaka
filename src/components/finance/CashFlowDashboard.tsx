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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

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
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Cash Flow Analytics
        </h2>
        <p className="text-gray-600 mt-2">Track your business cash flow trends and patterns</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Inflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">
              ₹{data.reduce((sum, r) => sum + r.inflows, 0).toFixed(2)}
            </div>
            <p className="text-xs text-green-600 mt-1">Money coming in</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-rose-50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Outflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800">
              ₹{data.reduce((sum, r) => sum + r.outflows, 0).toFixed(2)}
            </div>
            <p className="text-xs text-red-600 mt-1">Money going out</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Net Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              data.reduce((sum, r) => sum + r.net, 0) >= 0 ? 'text-blue-800' : 'text-red-800'
            }`}>
              ₹{data.reduce((sum, r) => sum + r.net, 0).toFixed(2)}
            </div>
            <p className="text-xs text-blue-600 mt-1">Overall cash position</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 hover:shadow-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">Cash Flow Trends</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 hover:shadow-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700">
                <tr>
                  <th className="p-3 border font-semibold">Month</th>
                  <th className="p-3 border text-green-700 font-semibold">Inflows</th>
                  <th className="p-3 border text-red-700 font-semibold">Outflows</th>
                  <th className="p-3 border text-blue-700 font-semibold">Net Position</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-t hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200">
                    <td className="p-3 border font-medium">{row.month}</td>
                    <td className="p-3 border text-green-600 font-semibold">
                      ₹{row.inflows.toFixed(2)}
                    </td>
                    <td className="p-3 border text-red-600 font-semibold">
                      ₹{row.outflows.toFixed(2)}
                    </td>
                    <td
                      className={`p-3 border font-bold ${
                        row.net >= 0 ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      ₹{row.net.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gradient-to-r from-gray-100 to-gray-200 font-bold">
                <tr>
                  <td className="p-3 border text-gray-800">Total</td>
                  <td className="p-3 border text-green-700">
                    ₹{data.reduce((sum, r) => sum + r.inflows, 0).toFixed(2)}
                  </td>
                  <td className="p-3 border text-red-700">
                    ₹{data.reduce((sum, r) => sum + r.outflows, 0).toFixed(2)}
                  </td>
                  <td
                    className={`p-3 border ${
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
        </CardContent>
      </Card>
    </div>
  );
}
