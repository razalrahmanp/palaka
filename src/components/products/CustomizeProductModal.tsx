"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"; // Assuming you have a select component
import { CartItem, ProductWithInventory } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: ProductWithInventory | null;
  onSave: (item: CartItem) => void;
  suppliers: { id: string; name: string }[];  // 🟢 list of suppliers to choose
}

export default function CustomizeProductModal({
  isOpen,
  onClose,
  product,
  onSave,
  suppliers
}: Props) {
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [material, setMaterial] = useState("");
  const [color, setColor] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setQty(1);
      setPrice((product.price ?? 0));
      setMaterial("");
      setColor("");
      setDimensions("");
      setSupplierId(product.supplier_id || null);  // prefill supplier if present
    }
  }, [product]);

  if (!product) return null;

  const handleSubmit = () => {
    onSave({
      id: crypto.randomUUID(),
      name: product.product_name,
      price,
      qty,
      configuration: { material, color, dimensions },
      isCustom: true,
      product_id: product.product_id,
      custom_supplier_id: supplierId,   // 🟢 pass supplier
       custom_supplier_name: suppliers.find(s => s.id === supplierId)?.name || null,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize Product</DialogTitle>
          <DialogDescription>
            Modify options before adding to cart.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} placeholder="Quantity" />
          <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} placeholder="Price per unit" />
          <Input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Material" />
          <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color" />
          <Input value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="Dimensions" />
           
            <Select value={supplierId ?? ""} onValueChange={setSupplierId}>
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
          <Button onClick={handleSubmit}>Add to Cart</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
