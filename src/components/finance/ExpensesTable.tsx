"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
import { PlusCircle, Trash2, Download } from "lucide-react";
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
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Expenses</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Expense
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 flex-wrap">
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="border px-3 py-2 rounded"
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
            className="border px-3 py-2 rounded"
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
            className="border px-3 py-2 rounded"
            title="Select Start Date"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="border px-3 py-2 rounded"
            title="Select End Date"
          />
        </div>

        <div className="overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100 text-gray-600 uppercase text-xs">
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((e, idx) => (
                <TableRow key={e.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <TableCell>{e.date}</TableCell>
                  <TableCell>{badge(e.subcategory || e.category)}</TableCell>
                  <TableCell>{e.description || "-"}</TableCell>
                  <TableCell className="text-right text-red-600 font-semibold">
                    ₹{e.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>{e.payment_method || "-"}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(e.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-gray-100 font-semibold">
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right text-red-700">
                  ₹{totalExpense.toFixed(2)}
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="date"
              value={form.date || ""}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="border px-3 py-2 w-full rounded"
              required
              title="Select Date"
            />
            <select
              value={form.subcategory || ""}
              onChange={(e) => {
                const selected = e.target.value;
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
              className="border px-3 py-2 w-full rounded"
              required
              title="Select Subcategory"
            >
              <option value="">Select Subcategory</option>
              {Object.keys(subcategoryMap).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <input
              placeholder="Category"
              value={form.category || ""}
              readOnly
              className="border px-3 py-2 w-full rounded bg-gray-100 text-gray-700"
            />
            <input
              placeholder="Expense Type"
              value={form.type || ""}
              readOnly
              className="border px-3 py-2 w-full rounded bg-gray-100 text-gray-700"
            />

            <input
              placeholder="Description"
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="border px-3 py-2 w-full rounded"
            />
            <input
              type="number"
              placeholder="Amount"
              value={form.amount ?? ""}
              onChange={(e) =>
                setForm({ ...form, amount: parseFloat(e.target.value) })
              }
              className="border px-3 py-2 w-full rounded"
            />
            <select
              value={form.payment_method || "cash"}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              className="border px-3 py-2 w-full rounded"
              required
              title="Select Payment Method"
            >
              <option value="cash">Cash</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.account_number ? `(${b.account_number})` : ""}
                </option>
              ))}
            </select>

            <Button className="w-full" onClick={handleSave}>
              Save Expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
