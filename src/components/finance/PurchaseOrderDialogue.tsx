import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FinPurchaseOrder } from "@/types";

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Purchase Order" : "New Purchase Order"}
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
          className="space-y-4"
        >
          <Input
            title="Supplier Name"
            placeholder="Enter supplier name"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            required
          />

          <Input
            type="date"
            title="Purchase Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <Input
            type="date"
            title="Due Date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "pending" | "approved" | "received")
            }
            className="border p-2 rounded w-full"
            title="Order Status"
          >
            <option value="pending">Status: Pending</option>
            <option value="approved">Status: Approved</option>
            <option value="received">Status: Received</option>
          </select>

          <select
            value={paymentStatus}
            onChange={(e) =>
              setPaymentStatus(
                e.target.value as "unpaid" | "partially_paid" | "paid"
              )
            }
            className="border p-2 rounded w-full"
            title="Payment Status"
          >
            <option value="unpaid">Payment: Unpaid</option>
            <option value="partially_paid">Payment: Partially Paid</option>
            <option value="paid">Payment: Fully Paid</option>
          </select>

          <Input
            type="number"
            title="Paid Amount"
            placeholder="Enter amount paid"
            value={paidAmount}
            onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
          />

          <Input
            type="number"
            title="Total Amount"
            placeholder="Total purchase order amount"
            value={total}
            onChange={(e) => setTotal(parseFloat(e.target.value))}
            required
          />

          <Textarea
            title="Products"
            value={productsText}
            onChange={(e) => setProductsText(e.target.value)}
            placeholder="Enter product names, one per line"
            rows={4}
          />

          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="border p-2 rounded w-full"
            title="Payment Method"
          >
            <option value="cash">Cash</option>
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.account_number ? ` - ${b.account_number}` : ""}
              </option>
            ))}
          </select>

          <Button type="submit" className="w-full">
            {initialData ? "Update Purchase Order" : "Create Purchase Order"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
