import React, { useMemo } from "react";
import { Invoice } from "@/types";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import clsx from "clsx";

interface Props {
  invoices: Invoice[];
  onEdit: (invoice: Invoice) => void;
  onDelete: (id: string) => void;
}

export function InvoicesTable({ invoices, onEdit, onDelete }: Props) {
  const total = useMemo(
    () => invoices.reduce((sum, inv) => sum + inv.total, 0),
    [invoices]
  );

  const paid = useMemo(
    () => invoices.reduce((sum, inv) => sum + inv.paid_amount, 0),
    [invoices]
  );

  const balance = total - paid;

  const statusBadge = (status: string) => {
    const base = "px-2 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case "paid":
        return <span className={clsx(base, "bg-green-100 text-green-700")}>Paid</span>;
      case "unpaid":
        return <span className={clsx(base, "bg-red-100 text-red-700")}>Unpaid</span>;
      case "partially_paid":
        return <span className={clsx(base, "bg-yellow-100 text-yellow-700")}>Partially Paid</span>;
      default:
        return <span className={clsx(base, "bg-gray-100 text-gray-700")}>{status}</span>;
    }
  };

  return (
    <div className="overflow-auto border rounded-md shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-200 text-gray-700 uppercase text-xs">
          <tr>
            <th className="p-3 text-left">ID</th>
            <th className="p-3 text-left">Customer</th>
            <th className="p-3 text-center">Status</th>
            <th className="p-3 text-right">Total</th>
            <th className="p-3 text-right">Paid</th>
            <th className="p-3 text-right">Balance</th>
            <th className="p-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv, idx) => (
            <tr key={inv.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="p-3">{inv.id}</td>
              <td className="p-3">{inv.customer_name}</td>
              <td className="p-3 text-center">{statusBadge(inv.status)}</td>
              <td className="p-3 text-right text-gray-800">₹{inv.total.toFixed(2)}</td>
              <td className="p-3 text-right text-green-700">₹{inv.paid_amount.toFixed(2)}</td>
              <td className="p-3 text-right text-red-600">
                ₹{(inv.total - inv.paid_amount).toFixed(2)}
              </td>
              <td className="p-3 text-center space-x-2">
                <Button size="icon" variant="ghost" onClick={() => onEdit(inv)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-500"
                  onClick={() => onDelete(inv.id)}
                >
                  <Trash2 className="w-4 h-4" />
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
            <td className="p-3 text-right">₹{total.toFixed(2)}</td>
            <td className="p-3 text-right text-green-700">₹{paid.toFixed(2)}</td>
            <td className="p-3 text-right text-red-600">₹{balance.toFixed(2)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
