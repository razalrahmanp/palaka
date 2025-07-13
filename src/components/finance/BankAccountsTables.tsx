import React, { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BankAccount {
  id: string;
  name: string;
  account_number?: string;
  currency?: string;
  current_balance?: number;
}

interface BankTransaction {
  id: string;
  bank_account_id: string;
  date: string;
  type: "deposit" | "withdrawal";
  amount: number;
  description?: string;
  reference?: string;
  account_name?: string; // joined from bank_accounts
}

export function BankAccountsTable() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: "",
    account_number: "",
    currency: "INR",
    current_balance: "",
  });

  // fetch bank accounts
  const fetchAccounts = async () => {
    const res = await fetch("/api/finance/bank_accounts");
    const { data } = await res.json();
    setAccounts(data);
  };

  // fetch bank transactions
  const fetchTransactions = async () => {
    const res = await fetch("/api/finance/bank_accounts/transactions");
    const { data } = await res.json();
    // optionally map account name
    setTransactions(data);
  };

  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
  }, []);

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + (acc.current_balance ?? 0),
    0
  );

  // handler to add bank account (same as before)
  const handleSave = async () => {
    const payload = {
      name: newAccount.name.trim(),
      account_number: newAccount.account_number.trim() || null,
      currency: newAccount.currency.trim() || "INR",
      current_balance: parseFloat(newAccount.current_balance || "0"),
    };
    if (!payload.name || isNaN(payload.current_balance)) {
      alert("Name and valid balance are required.");
      return;
    }
    const res = await fetch("/api/finance/bank_accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      console.error("Error saving bank account:", error);
      alert("Failed to save account.");
      return;
    }
    setNewAccount({ name: "", account_number: "", currency: "INR", current_balance: "" });
    setDialogOpen(false);
    fetchAccounts();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Bank Accounts Summary</CardTitle>
          <Button onClick={() => setDialogOpen(true)}>+ Add Account</Button>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100 text-gray-700">
                <TableHead>Name</TableHead>
                <TableHead>Account #</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id} className="hover:bg-gray-50">
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{a.account_number ?? "-"}</TableCell>
                  <TableCell>{a.currency ?? "-"}</TableCell>
                  <TableCell className="text-right font-medium text-blue-700">
                    {a.current_balance != null
                      ? `₹${a.current_balance.toFixed(2)}`
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-gray-50 font-semibold">
                <TableCell colSpan={3}>Total Balance</TableCell>
                <TableCell className="text-right text-green-700">
                  ₹{totalBalance.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bank Transactions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Bank Transactions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100 text-gray-700">
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t, idx) => (
                <TableRow key={t.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <TableCell>{t.date}</TableCell>
                  <TableCell>{t.description || "-"}</TableCell>
                  <TableCell className={t.type === 'withdrawal' ? 'text-red-600' : 'text-green-600'}>
                    {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {t.type === 'withdrawal' ? '-' : ''}₹{t.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>{t.reference || "-"}</TableCell>
                  <TableCell>{t.account_name || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Bank Account Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Bank Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input
                value={newAccount.account_number}
                onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })}
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Input
                value={newAccount.currency}
                onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })}
              />
            </div>
            <div>
              <Label>Initial Balance</Label>
              <Input
                type="number"
                value={newAccount.current_balance}
                onChange={(e) => setNewAccount({ ...newAccount, current_balance: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
