import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Payment } from "@/types";

interface Props {
  payments: Payment[];
  onEdit: (payment: Payment) => void;
  onDelete: (id: string) => void;
}

export function PaymentsTable({ payments, onEdit, onDelete }: Props) {
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="overflow-auto border rounded-md shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-200 text-gray-700 uppercase text-xs">
          <tr>
            <th className="p-3 text-left">ID</th>
            <th className="p-3 text-right">Amount</th>
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">Method</th>
            <th className="p-3 text-left">Reference</th>
            <th className="p-3 text-left">Description</th>
            <th className="p-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p, idx) => (
            <tr
              key={p.id}
              className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              <td className="p-3">{p.id}</td>
              <td
                className={`p-3 text-right font-semibold ${
                  p.amount > 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                ${p.amount.toFixed(2)}
              </td>
              <td className="p-3">{p.date}</td>
              <td
                className={`p-3 font-medium ${
                  p.method === "Cash"
                    ? "text-blue-600"
                    : p.method === "Bank"
                    ? "text-indigo-600"
                    : "text-gray-700"
                }`}
              >
                {p.method}
              </td>
              <td className="p-3">{p.reference}</td>
              <td className="p-3 text-gray-600">{p.description}</td>
              <td className="p-3 text-center space-x-2">
                <Button size="icon" variant="ghost" onClick={() => onEdit(p)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-500"
                  onClick={() => onDelete(p.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-100 font-semibold">
          <tr>
            <td className="p-3 text-right" colSpan={1}>
              Total
            </td>
            <td className="p-3 text-right text-green-700">
              ${totalAmount.toFixed(2)}
            </td>
            <td className="p-3 text-left" colSpan={5}>
              {/* Additional summary if needed */}
              {payments.length} payment{payments.length !== 1 && "s"} recorded
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
