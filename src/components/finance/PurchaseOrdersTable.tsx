import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Download, Check } from "lucide-react";
import { FinPurchaseOrder } from "@/types";
import clsx from "clsx";

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
    const base = "px-2 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case "pending":
        return <span className={clsx(base, "bg-yellow-100 text-yellow-800")}>Pending</span>;
      case "approved":
        return <span className={clsx(base, "bg-blue-100 text-blue-800")}>Approved</span>;
      case "received":
        return <span className={clsx(base, "bg-green-100 text-green-800")}>Received</span>;
      default:
        return <span className={clsx(base, "bg-gray-100 text-gray-600")}>{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter & Export */}
      <div className="flex justify-between items-center">
        <div className="space-x-2">
          {["all", "pending", "approved", "received"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s as "all" | "pending" | "approved" | "received")}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
        <Button onClick={handleExportCSV}>
          <Download className="mr-2 w-4 h-4" />
          Export CSV
        </Button>
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
    </div>
  );
}
