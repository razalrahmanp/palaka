"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Trash2, Download, Receipt, Calculator, CreditCard, Calendar } from "lucide-react";
import { subcategoryMap } from "@/types";
import { getCurrentUser } from "@/lib/auth";

interface Expense {
  id: string;
  date: string;
  category: string;
  description?: string;
  amount: number;
  payment_method?: string;
  type?: string;
  subcategory?: string;
}

interface BankAccount {
  id: string;
  name: string;
  account_number?: string;
}


export function ExpensesTable() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  // const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<Expense>>({});
  const [filters, setFilters] = useState({
    category: "",
    payment_method: "",
    startDate: "",
    endDate: "",
  });

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

useEffect(() => {
  fetch("/api/finance/bank_accounts")
    .then((res) => res.json())
    .then((res) => setBankAccounts(res.data ?? []));
}, []);

  const fetchExpenses = async () => {
    const res = await fetch("/api/finance/expenses");
    const { data } = await res.json();
    setExpenses(data);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSave = async () => {
    if (!form.date || !form.category || !form.amount) return;
    const currentUser = getCurrentUser();
    await fetch("/api/finance/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
          payment_method: form.payment_method === "cash" ? "cash" : "bank",
          bank_account_id: form.payment_method !== "cash" ? form.payment_method : null,
        created_by: currentUser?.id,
      }),
    });
    setDialogOpen(false);
    setForm({});
    fetchExpenses();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete expense?")) {
      await fetch("/api/finance/expenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchExpenses();
    }
  };

  const exportCSV = () => {
    const rows = [
      ["Date", "Category", "Description", "Amount", "Payment Method"],
      ...filteredExpenses.map(e => [
        e.date,
        e.category,
        e.description || "",
        e.amount.toFixed(2),
        e.payment_method || ""
      ])
    ];
    const csv = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.csv";
    a.click();
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const categoryMatch = !filters.category || e.category === filters.category;
      const methodMatch = !filters.payment_method || e.payment_method === filters.payment_method;
      const dateMatch = (!filters.startDate || e.date >= filters.startDate) &&
                        (!filters.endDate || e.date <= filters.endDate);
      return categoryMatch && methodMatch && dateMatch;
    });
  }, [expenses, filters]);

  const totalExpense = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const badge = (text: string) => (
    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
      {text}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-orange-100">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl">
              <PlusCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-700">Total Expenses</p>
              <p className="text-3xl font-bold text-red-900">₹{totalExpense.toLocaleString()}</p>
              <p className="text-sm text-red-600 mt-1">
                {filteredExpenses.length} expense{filteredExpenses.length !== 1 && "s"} recorded
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Expenses Card */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-gray-800">Expense Management</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportCSV} className="hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
              <Button 
                onClick={() => setDialogOpen(true)}
                className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> New Expense
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
        {/* Enhanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            title="Select Category"
          >
            <option value="">All Categories</option>
            {Array.from(new Set(expenses.map(e => e.category))).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={filters.payment_method}
            onChange={(e) => setFilters({ ...filters, payment_method: e.target.value })}
            className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            title="Select Payment Method"
          >
            <option value="">All Payment Methods</option>
            {Array.from(new Set(expenses.map(e => e.payment_method))).filter(Boolean).map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            title="Select Start Date"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            title="Select End Date"
          />
        </div>

        <div className="overflow-auto rounded-lg border border-gray-200 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-100 to-gray-200">
                <TableHead className="font-semibold text-gray-700">Date</TableHead>
                <TableHead className="font-semibold text-gray-700">Category</TableHead>
                <TableHead className="font-semibold text-gray-700">Description</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">Amount</TableHead>
                <TableHead className="font-semibold text-gray-700">Method</TableHead>
                <TableHead className="text-center font-semibold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((e, idx) => (
                <TableRow key={e.id} className={`border-b transition-colors hover:bg-gray-50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                  <TableCell className="font-medium">{e.date}</TableCell>
                  <TableCell>{badge(e.subcategory || e.category)}</TableCell>
                  <TableCell className="text-gray-600">{e.description || "-"}</TableCell>
                  <TableCell className="text-right text-red-600 font-bold text-lg">
                    ₹{e.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      {e.payment_method || "Cash"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 hover:bg-red-50 hover:border-red-300 text-red-600"
                      onClick={() => handleDelete(e.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-gradient-to-r from-red-50 to-orange-50 font-semibold border-t-2 border-red-200">
                <TableCell colSpan={3} className="text-red-800 font-bold">Total Expenses</TableCell>
                <TableCell className="text-right text-red-800 font-bold text-xl">
                  ₹{totalExpense.toLocaleString()}
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Record New Expense
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Date and Category Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Expense Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date *
                  </Label>
                  <Input
                    type="date"
                    value={form.date || ""}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Subcategory *</Label>
                  <Select
                    value={form.subcategory || ""}
                    onValueChange={(selected) => {
                      const mapping =
                        subcategoryMap[selected as keyof typeof subcategoryMap] || {
                          category: "Other",
                          type: "Indirect",
                        };

                      setForm({
                        ...form,
                        subcategory: selected,
                        category: mapping.category,
                        type: mapping.type,
                      });
                    }}
                  >
                    <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(subcategoryMap).map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Category</Label>
                  <Input
                    placeholder="Category"
                    value={form.category || ""}
                    readOnly
                    className="bg-gray-50 border-gray-300 text-gray-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Type</Label>
                  <div className="flex items-center h-10">
                    <Badge 
                      variant="secondary" 
                      className={`${
                        form.type === 'Direct' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {form.type || "Not Selected"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Financial Information</h3>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Description</Label>
                <Input
                  placeholder="Enter expense description"
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Amount *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter amount"
                  value={form.amount ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Payment Method</h3>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Payment Method</Label>
                <Select
                  value={form.payment_method || "cash"}
                  onValueChange={(value) => setForm({ ...form, payment_method: value })}
                >
                  <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">Cash</Badge>
                    </SelectItem>
                    {bankAccounts.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span>{b.name}</span>
                          {b.account_number && (
                            <span className="text-gray-500">- {b.account_number}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                onClick={handleSave}
                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white border-0"
              >
                Save Expense
              </Button>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </Card>
    </div>
  );
}
