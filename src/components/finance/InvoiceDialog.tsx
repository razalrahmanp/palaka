// components/finance/InvoiceDialog.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Invoice, InvoiceStatus, Order } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Invoice | null;
  onSave: (data: Omit<Invoice, "id"> & { sales_order_id: string }) => void;
}

export function InvoiceDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
}: Props) {
  // Initialize as empty array and filter out drafts
  const [salesOrders, setSalesOrders] = useState<Order[]>([]);
  const [salesOrderId, setSalesOrderId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [status, setStatus] = useState<InvoiceStatus>("Unpaid");
  const [total, setTotal] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  useEffect(() => {
  fetch("/api/sales/orders")
    .then((r) => r.json())
    .then((data) => {
      setSalesOrders(data);
    });
}, []);


  useEffect(() => {
    if (initialData) {
      setCustomerName(initialData.customer_name);
      setStatus(initialData.status);
      setTotal(initialData.total);
      setPaidAmount(initialData.paid_amount);
      // If you have sales_order_id stored, uncomment to set it:
      // setSalesOrderId(initialData.sales_order_id);
    } else {
      setSalesOrderId("");
      setCustomerName("");
      setStatus("Unpaid");
      setTotal(0);
      setPaidAmount(0);
    }
  }, [initialData]);

  // Auto-fill customer & total when a sales order is selected
  useEffect(() => {
    const so = salesOrders.find((o) => o.id === salesOrderId);
    if (so) {
      setCustomerName(so.customer);
      setTotal(so.total);
    }
  }, [salesOrderId, salesOrders]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Invoice" : "New Invoice"}
          </DialogTitle>
        </DialogHeader>
<form
  onSubmit={(e) => {
    e.preventDefault();
    onSave({
      sales_order_id: salesOrderId,
      customer_name: customerName,
      status,
      total,
      paid_amount: paidAmount,
    });
  }}
  className="space-y-4"
>
  <Select
    value={salesOrderId}
    onValueChange={(v) => setSalesOrderId(v)}
    required
  >
    <SelectTrigger className="w-full">
      {salesOrderId ||
        (salesOrders.length ? "Select Sales Order" : "Loading orders…")}
    </SelectTrigger>
    <SelectContent>
      {salesOrders.map((so) => (
        <SelectItem key={so.id} value={so.id}>
          {so.id} — {so.customer}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

  <Input placeholder="Customer Name" value={customerName} readOnly />

  <select
    value={status}
    onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
    className="border p-2 rounded w-full"
    title="select"
  >
    <option value="Unpaid">Unpaid</option>
    <option value="Paid">Paid</option>
    <option value="Overdue">Overdue</option>
  </select>

  <Input type="number" placeholder="Total" value={total} readOnly />

  <Input
    type="number"
    placeholder="Paid Amount"
    value={paidAmount}
    onChange={(e) => setPaidAmount(parseFloat(e.target.value))}
  />

  <Input
    readOnly
    placeholder="Balance"
    value={(total - paidAmount).toFixed(2)}
    className="bg-gray-100 text-gray-700"
  />

  {/* ✅ Responsive action buttons */}
  <div className="flex flex-col sm:flex-row gap-2 pt-2">
    <Button type="submit" className="w-full sm:w-auto">
      {initialData ? "Update" : "Create"}
    </Button>
    <Button
      type="button"
      variant="ghost"
      onClick={() => onOpenChange(false)}
      className="w-full sm:w-auto"
    >
      Cancel
    </Button>
  </div>
</form>


      </DialogContent>
    </Dialog>
  );
}
