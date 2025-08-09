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
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Payment } from "@/types";
import { CreditCard, Calendar, Hash, FileText } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Payment | null;
  onSave: (data: Omit<Payment, "id">) => void;
  balanceAmount?: number; // 🆕 Optional balance shown in placeholder
}

export function PaymentDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
  balanceAmount,
}: Props) {
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount);
      setDate(initialData.date);
      setMethod(initialData.method || "");
      setReference(initialData.reference || "");
      setDescription(initialData.description || "");
    } else {
      setAmount(0);
      setDate("");
      setMethod("");
      setReference("");
      setDescription("");
    }
  }, [initialData]);

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {initialData ? "Edit Payment" : "Record New Payment"}
          </DialogTitle>
        </DialogHeader>
        
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              ...(initialData?.id ? { id: initialData.id } : {}),
              amount,
              date,
              method,
              reference,
              description,
            } as Payment);
          }}
          className="space-y-6 py-4"
        >
          {/* Amount */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Amount *
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder={
                balanceAmount !== undefined
                  ? `Max: ₹${balanceAmount.toFixed(2)}`
                  : "Enter amount"
              }
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              required
            />
            {balanceAmount !== undefined && (
              <p className="text-xs text-gray-500">
                Maximum amount: ₹{balanceAmount.toFixed(2)}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Payment Date *
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Payment Method *</Label>
            <Select
              value={method}
              onValueChange={(v) => setMethod(v)}
              required
            >
              <SelectTrigger className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">Cash</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="bank_transfer">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">Bank Transfer</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="credit_card">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">Credit Card</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="cheque">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">Cheque</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="upi">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">UPI</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Reference Number
            </Label>
            <Input
              placeholder="Transaction/Reference ID"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description
            </Label>
            <Input
              placeholder="Payment description or notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white border-0"
            >
              {initialData ? "Update Payment" : "Record Payment"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={handleClose}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
