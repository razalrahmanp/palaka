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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Invoice, InvoiceStatus, Order } from "@/types";
import { FileText, Calculator, CreditCard } from "lucide-react";

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
  const [status, setStatus] = useState<InvoiceStatus>("draft");
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
      setStatus("draft");
      setTotal(0);
      setPaidAmount(0);
    }
  }, [initialData]);

  // Auto-fill customer & total when a sales order is selected
  useEffect(() => {
    const so = salesOrders.find((o) => o.id === salesOrderId);
    if (so) {
      setCustomerName(so.customer?.name || 'Unknown Customer');
      setTotal(so.total);
    }
  }, [salesOrderId, salesOrders]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {initialData ? "Edit Invoice" : "Create New Invoice"}
          </DialogTitle>
        </DialogHeader>
        
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              sales_order_id: salesOrderId,
              invoice_number: `INV-${Date.now()}`,
              customer_id: salesOrderId, // Temporary - should be proper customer ID
              customer_name: customerName,
              status,
              total,
              amount: total,
              paid_amount: paidAmount,
              created_at: new Date().toISOString(),
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            });
          }}
          className="space-y-6 py-4"
        >
          {/* Sales Order Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Sales Order *</Label>
            <Select
              value={salesOrderId}
              onValueChange={(v) => setSalesOrderId(v)}
              required
            >
              <SelectTrigger className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder={salesOrders.length ? "Select Sales Order" : "Loading orders..."} />
              </SelectTrigger>
              <SelectContent>
                {salesOrders.map((so) => (
                  <SelectItem key={so.id} value={so.id}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{so.id}</span>
                      <span className="text-gray-600">— {so.customer?.name || 'Unknown Customer'}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Customer Name</Label>
            <Input 
              placeholder="Customer Name" 
              value={customerName} 
              readOnly 
              className="bg-gray-50 border-gray-300"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as InvoiceStatus)}
            >
              <SelectTrigger className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Unpaid">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                    Unpaid
                  </Badge>
                </SelectItem>
                <SelectItem value="Paid">
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Paid
                  </Badge>
                </SelectItem>
                <SelectItem value="Overdue">
                  <Badge variant="secondary" className="bg-red-100 text-red-700">
                    Overdue
                  </Badge>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Financial Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Total Amount
              </Label>
              <Input 
                type="number" 
                placeholder="Total" 
                value={total} 
                readOnly 
                className="bg-gray-50 border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Paid Amount
              </Label>
              <Input
                type="number"
                placeholder="Paid Amount"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Balance Display */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Remaining Balance</Label>
            <div className={`p-3 rounded-lg border-2 ${
              (total - paidAmount) > 0 
                ? 'border-red-200 bg-red-50 text-red-800' 
                : 'border-green-200 bg-green-50 text-green-800'
            }`}>
              <div className="text-lg font-bold">
                ₹{(total - paidAmount).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
            >
              {initialData ? "Update Invoice" : "Create Invoice"}
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
