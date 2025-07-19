"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { CartItem } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: CartItem) => void;
  suppliers: { id: string; name: string }[];
}

export default function NewCustomProductModal({ isOpen, onClose, onSave, suppliers }: Props) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [qty, setQty] = useState(1);
  const [config, setConfig] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // To disable button after submit

  useEffect(() => {
    if (isOpen) {
      setName("");
      setPrice(0);
      setQty(1);
      setConfig("");
      setSupplierId(null);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (isSubmitting) return; // Prevent double clicks
    setIsSubmitting(true); // Disable button during submission
    onSave({
      id: crypto.randomUUID(),
      name,
      price,
      qty,
      configuration: { description: config },
      isCustom: true,
      product_id: null,
      custom_supplier_id: supplierId,
      custom_supplier_name: suppliers.find(s => s.id === supplierId)?.name || null,
    });
    onClose();
    setIsSubmitting(false); // Re-enable button after process finishes
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md mx-auto p-6 space-y-4">
        <DialogHeader>
          <DialogTitle>Add Custom Product</DialogTitle>
          <DialogDescription>
            Specify the details for this custom item.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product Name"
            className="w-full"
          />
          <Input
            type="number"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            placeholder="Quantity"
            className="w-full"
          />
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            placeholder="Price"
            className="w-full"
          />
          <Textarea
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            placeholder="Configuration / Notes"
            className="w-full"
          />

          <Select
            value={supplierId ?? ""}
            onValueChange={(value) => setSupplierId(value)}
          >
            <SelectTrigger className="w-full">Select Supplier</SelectTrigger>
            <SelectContent>
              {suppliers.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name || !price || !qty || !supplierId}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Adding..." : "Add to Cart"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
