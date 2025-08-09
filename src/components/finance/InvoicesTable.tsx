import React, { useMemo } from "react";
import { Invoice } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, FileText, TrendingUp, DollarSign, Calendar } from "lucide-react";

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
    switch (status) {
      case "paid":
        return <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">Paid</Badge>;
      case "unpaid":
        return <Badge className="bg-gradient-to-r from-red-500 to-pink-600 text-white">Unpaid</Badge>;
      case "partially_paid":
        return <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">Partially Paid</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Total Amount</p>
                <p className="text-2xl font-bold text-blue-900">₹{total.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-green-900">₹{paid.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-700">Outstanding</p>
                <p className="text-2xl font-bold text-orange-900">₹{balance.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Table */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <CardTitle className="text-xl font-bold text-gray-800">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="p-4 text-left font-semibold text-gray-700">Invoice ID</th>
                  <th className="p-4 text-left font-semibold text-gray-700">Customer</th>
                  <th className="p-4 text-center font-semibold text-gray-700">Status</th>
                  <th className="p-4 text-right font-semibold text-gray-700">Total Amount</th>
                  <th className="p-4 text-right font-semibold text-gray-700">Paid Amount</th>
                  <th className="p-4 text-right font-semibold text-gray-700">Balance</th>
                  <th className="p-4 text-center font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, idx) => (
                  <tr 
                    key={inv.id} 
                    className={`border-b transition-colors hover:bg-gray-50 ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-gray-900">{inv.id}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{inv.customer_name}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Calendar className="h-3 w-3" />
                        Invoice #{inv.id.slice(-6)}
                      </div>
                    </td>
                    <td className="p-4 text-center">{statusBadge(inv.status)}</td>
                    <td className="p-4 text-right">
                      <span className="font-semibold text-gray-900">₹{inv.total.toLocaleString()}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-semibold text-green-700">₹{inv.paid_amount.toLocaleString()}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-semibold ${
                        (inv.total - inv.paid_amount) > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        ₹{(inv.total - inv.paid_amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-3 hover:bg-blue-50 hover:border-blue-300"
                          onClick={() => onEdit(inv)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 hover:bg-red-50 hover:border-red-300 text-red-600"
                          onClick={() => onDelete(inv.id)}
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
