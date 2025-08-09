import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Download, Check, Building, TrendingUp, DollarSign } from "lucide-react";
import { FinPurchaseOrder } from "@/types";

interface Props {
  orders: FinPurchaseOrder[];
  onEdit: (order: FinPurchaseOrder) => void;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
}

export function PurchaseOrdersTable({
  orders,
  onEdit,
  onDelete,
  onRefresh,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "received"
  >("all");

  const filteredOrders = useMemo(
    () =>
      statusFilter === "all"
        ? orders
        : orders.filter((o) => o.status === statusFilter),
    [orders, statusFilter]
  );

  const totalAmount = useMemo(
    () => filteredOrders.reduce((sum, o) => sum + o.total, 0),
    [filteredOrders]
  );

  const totalPaid = useMemo(
    () =>
      filteredOrders.reduce((sum, o) => sum + (o.paid_amount ?? 0), 0),
    [filteredOrders]
  );

  const totalPending = totalAmount - totalPaid;

  const handleExportCSV = () => {
    const csvRows = [
      ["ID", "Supplier", "Date", "Status", "Total"],
      ...filteredOrders.map((o) => [
        o.id,
        o.supplier?.name ?? "",
        o.date,
        o.status,
        o.total.toFixed(2),
      ]),
    ];
    const csvContent = csvRows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "purchase_orders.csv";
    a.click();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">Pending</Badge>;
      case "approved":
        return <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">Approved</Badge>;
      case "received":
        return <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">Received</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-indigo-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-700">Total Amount</p>
                <p className="text-2xl font-bold text-purple-900">₹{totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Paid Amount</p>
                <p className="text-2xl font-bold text-green-900">₹{totalPaid.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-red-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-700">Pending Amount</p>
                <p className="text-2xl font-bold text-orange-900">₹{totalPending.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Purchase Orders Card */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-gray-800">Purchase Orders</CardTitle>
            <Button onClick={handleExportCSV} variant="outline" className="hover:bg-gray-50">
              <Download className="mr-2 w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Enhanced Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            {["all", "pending", "approved", "received"].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                className={statusFilter === s ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white" : ""}
                onClick={() => setStatusFilter(s as "all" | "pending" | "approved" | "received")}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>

      {/* Table */}
      <div className="overflow-auto border rounded-md shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-200 text-gray-700 uppercase text-xs">
            <tr>
              <th className="p-3 text-left">PO #</th>
              <th className="p-3 text-left">Supplier</th>
              <th className="p-3 text-left">Products</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Paid</th>
              <th className="p-3 text-right">Pending</th>
              <th className="p-3 text-center">Due Date</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o, idx) => (
              <tr
                key={o.id}
                className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="p-3">{o.id}</td>
                <td className="p-3">{o.supplier?.name}</td>
                <td className="p-3">
                  {o.products_id?.map((p) => p.name).join(", ")}
                </td>
                <td className="p-3 text-right text-gray-800 font-medium">
                  ₹{o.total.toFixed(2)}
                </td>
                <td className="p-3 text-right text-green-700">
                  ₹{(o.paid_amount ?? 0).toFixed(2)}
                </td>
                <td className="p-3 text-right text-red-500">
                  ₹{(o.total - (o.paid_amount ?? 0)).toFixed(2)}
                </td>
                <td className="p-3 text-center">{o.due_date}</td>
                <td className="p-3 text-center">{statusBadge(o.status)}</td>
                <td className="p-3 text-center space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => onEdit(o)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-500"
                    onClick={() => onDelete(o.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-green-600"
                    onClick={async () => {
                      if (confirm("Mark this PO as received?")) {
                        await fetch(`/api/finance/purchase-orders/${o.id}/receive`, {
                          method: "PATCH",
                        });
                        onRefresh?.();
                      }
                    }}
                    disabled={o.status !== "approved"}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 font-semibold">
            <tr>
              <td className="p-3 text-right" colSpan={3}>
                Totals
              </td>
              <td className="p-3 text-right">₹{totalAmount.toFixed(2)}</td>
              <td className="p-3 text-right text-green-700">
                ₹{totalPaid.toFixed(2)}
              </td>
              <td className="p-3 text-right text-red-500">
                ₹{totalPending.toFixed(2)}
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
        </CardContent>
      </Card>
    </div>
  );
}
