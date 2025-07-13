import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Payment } from "@/types";

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Payment" : "New Payment"}</DialogTitle>
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
          className="space-y-4"
        >
          <Input
            type="number"
            placeholder={
              balanceAmount !== undefined
                ? `Max: ${balanceAmount.toFixed(2)}`
                : "Amount"
            }
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            required
          />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            placeholder="Method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            required
          />
          <Input
            placeholder="Reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <Input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" className="w-full">
              {initialData ? "Update" : "Create"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
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
