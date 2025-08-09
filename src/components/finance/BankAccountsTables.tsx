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
import { Badge } from "@/components/ui/badge";
import { Wallet, CreditCard, TrendingUp, TrendingDown, Plus } from "lucide-react";

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
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Bank Accounts Management
        </h2>
        <p className="text-gray-600 mt-2">Manage your bank accounts and monitor transactions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Total Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              {accounts.length}
            </div>
            <p className="text-xs text-blue-600 mt-1">Active bank accounts</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">
              ₹{totalBalance.toFixed(2)}
            </div>
            <p className="text-xs text-green-600 mt-1">Combined balance</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800">
              {transactions.length}
            </div>
            <p className="text-xs text-orange-600 mt-1">Total transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts Table */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 hover:shadow-xl transition-all duration-300">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Bank Accounts Summary
          </CardTitle>
          <Button 
            onClick={() => setDialogOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Account #</TableHead>
                <TableHead className="font-semibold">Currency</TableHead>
                <TableHead className="text-right font-semibold">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200">
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-gray-600">{a.account_number ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {a.currency ?? "INR"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-blue-700">
                    {a.current_balance != null
                      ? `₹${a.current_balance.toFixed(2)}`
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-gradient-to-r from-green-50 to-emerald-50 font-bold border-t-2 border-green-200">
                <TableCell colSpan={3} className="text-green-800">Total Balance</TableCell>
                <TableCell className="text-right text-green-800 text-lg">
                  ₹{totalBalance.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bank Transactions Section */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 hover:shadow-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Recent Bank Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="text-right font-semibold">Amount</TableHead>
                <TableHead className="font-semibold">Reference</TableHead>
                <TableHead className="font-semibold">Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200">
                  <TableCell className="font-medium">{new Date(t.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-gray-600">{t.description || "-"}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={t.type === 'withdrawal' ? 'destructive' : 'default'}
                      className={t.type === 'withdrawal' 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }
                    >
                      {t.type === 'withdrawal' ? (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      )}
                      {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${
                    t.type === 'withdrawal' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {t.type === 'withdrawal' ? '-' : '+'}₹{t.amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-gray-600">{t.reference || "-"}</TableCell>
                  <TableCell className="font-medium">{t.account_name || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Bank Account Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Bank Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Account Name *</Label>
              <Input
                placeholder="Enter account name"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Account Number</Label>
              <Input
                placeholder="Enter account number"
                value={newAccount.account_number}
                onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Currency</Label>
              <Input
                placeholder="INR"
                value={newAccount.currency}
                onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Initial Balance *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={newAccount.current_balance}
                onChange={(e) => setNewAccount({ ...newAccount, current_balance: e.target.value })}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
            >
              Save Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
