import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CreditCard, Calendar, Hash, FileText } from "lucide-react";
import { Payment } from "@/types";

interface Props {
  payments: Payment[];
  onEdit: (payment: Payment) => void;
  onDelete: (id: string) => void;
}

export function PaymentsTable({ payments, onEdit, onDelete }: Props) {
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  const getMethodBadge = (method: string) => {
    switch (method?.toLowerCase()) {
      case "cash":
        return <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">Cash</Badge>;
      case "bank":
      case "bank transfer":
        return <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">Bank</Badge>;
      default:
        return <Badge variant="secondary">{method}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-100">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">Total Payments</p>
              <p className="text-3xl font-bold text-green-900">₹{totalAmount.toLocaleString()}</p>
              <p className="text-sm text-green-600 mt-1">
                {payments.length} payment{payments.length !== 1 && "s"} recorded
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Table */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <CardTitle className="text-xl font-bold text-gray-800">Payment Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="p-4 text-left font-semibold text-gray-700">Payment ID</th>
                  <th className="p-4 text-right font-semibold text-gray-700">Amount</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Date</th>
                  <th className="p-4 text-center font-semibold text-gray-700">Method</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Reference</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Description</th>
                  <th className="p-4 text-center font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`border-b transition-colors hover:bg-gray-50 ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-gray-900">{p.id}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-bold text-lg ${
                        p.amount > 0 ? "text-green-700" : "text-red-600"
                      }`}>
                        ₹{p.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{p.date}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {getMethodBadge(p.method)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-700 font-mono text-sm">{p.reference}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-700">{p.description}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-3 hover:bg-blue-50 hover:border-blue-300"
                          onClick={() => onEdit(p)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 hover:bg-red-50 hover:border-red-300 text-red-600"
                          onClick={() => onDelete(p.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
