import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FinPurchaseOrder } from "@/types";
import { ShoppingCart, Calendar, CreditCard, Package } from "lucide-react";

interface BankAccount {
  id: string;
  name: string;
  account_number?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: FinPurchaseOrder | null;
  onSave: (data: Omit<FinPurchaseOrder, "id"> & { bank_account_id?: string | null }) => void;
}

export function PurchaseOrderDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
}: Props) {
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<"pending" | "approved" | "received">("pending");
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "partially_paid" | "paid">("unpaid");
  const [paidAmount, setPaidAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [productsText, setProductsText] = useState("");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");

  // Load bank accounts
useEffect(() => {
  fetch("/api/finance/bank_accounts")
    .then((res) => res.json())
    .then((res) => {
      console.log("Bank accounts fetched:", res); // 🔍 DEBUG
      if (res?.data?.length) {
        setBankAccounts(res.data);
      } else {
        setBankAccounts([]); // fallback
      }
    })
    .catch((err) => {
      console.error("Failed to fetch bank accounts", err);
    });
}, []);


  useEffect(() => {
    if (initialData) {
      setSupplier(initialData.supplier?.name ?? "");
      setDate(initialData.date);
      setDueDate(initialData.due_date ?? "");
      setStatus(initialData.status);
      setPaymentStatus(initialData.payment_status);
      setPaidAmount(initialData.paid_amount);
      setTotal(initialData.total);
      const productNames = initialData.products_id?.map((p) => p.name).join("\n") ?? "";
      setProductsText(productNames);
      setPaymentMethod(initialData.bank_account_id ?? "cash");
    } else {
      setSupplier("");
      setDate("");
      setDueDate("");
      setStatus("pending");
      setPaymentStatus("unpaid");
      setPaidAmount(0);
      setTotal(0);
      setProductsText("");
      setPaymentMethod("cash");
    }
  }, [initialData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {initialData ? "Edit Purchase Order" : "Create Purchase Order"}
          </DialogTitle>
        </DialogHeader>
        
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const productsArray = productsText
              .split("\n")
              .map((name) => ({
                id: "",
                name: name.trim(),
                quantity: 1,
                price: 0,
              }))
              .filter((p) => p.name);

            const selectedBankId = paymentMethod === "cash" ? null : paymentMethod;

            onSave({
              supplier: { id: "", name: supplier },
              date,
              due_date: dueDate,
              status,
              total,
              paid_amount: paidAmount,
              payment_status: paymentStatus,
              products_id: productsArray,
              bank_account_id: selectedBankId,
            });
          }}
          className="space-y-6 py-4"
        >
          {/* Supplier Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Supplier Information</h3>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Supplier Name *</Label>
              <Input
                placeholder="Enter supplier name"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Order Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Purchase Date *
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Due Date
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Order Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Order Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Order Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as "pending" | "approved" | "received")}
                >
                  <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Pending</Badge>
                    </SelectItem>
                    <SelectItem value="approved">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">Approved</Badge>
                    </SelectItem>
                    <SelectItem value="received">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">Received</Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Payment Status</Label>
                <Select
                  value={paymentStatus}
                  onValueChange={(v) => setPaymentStatus(v as "unpaid" | "partially_paid" | "paid")}
                >
                  <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">
                      <Badge variant="secondary" className="bg-red-100 text-red-700">Unpaid</Badge>
                    </SelectItem>
                    <SelectItem value="partially_paid">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">Partially Paid</Badge>
                    </SelectItem>
                    <SelectItem value="paid">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">Fully Paid</Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Financial Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Total Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Total purchase amount"
                  value={total || ""}
                  onChange={(e) => setTotal(parseFloat(e.target.value) || 0)}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Paid Amount
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Amount paid"
                  value={paidAmount || ""}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Balance Display */}
            <div className={`p-3 rounded-lg border-2 ${
              (total - paidAmount) > 0 
                ? 'border-red-200 bg-red-50 text-red-800' 
                : 'border-green-200 bg-green-50 text-green-800'
            }`}>
              <div className="text-sm font-medium">Remaining Balance:</div>
              <div className="text-lg font-bold">₹{(total - paidAmount).toFixed(2)}</div>
            </div>
          </div>

          {/* Products */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b pb-2 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Products
            </h3>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Product List</Label>
              <Textarea
                value={productsText}
                onChange={(e) => setProductsText(e.target.value)}
                placeholder="Enter product names, one per line"
                rows={4}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500">Enter each product on a new line</p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Payment Method</h3>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v)}
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
          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
            >
              {initialData ? "Update Purchase Order" : "Create Purchase Order"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
