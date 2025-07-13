"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, X } from "lucide-react";
import { CartItem } from "@/types";

export default function CartDrawer({
  cartItems,
  updateQty,
  handleCheckout,
  isSubmitting,
  extraAction,
  onEditCustom, // ✅ NEW
}: {
  cartItems: CartItem[];
  updateQty: (id: string, delta: number) => void;
  handleCheckout: () => void;
  isSubmitting: boolean;
  extraAction?: React.ReactNode;
  onEditCustom?: (item: CartItem) => void; // ✅ NEW
})
 {
  const [open, setOpen] = useState(false);

  const subtotal = cartItems.reduce(
    (sum, i) => sum + i.price * i.qty,
    0
  );

  function removeItem(id: string) {
    updateQty(id, -Infinity); // Trick: treat as full removal
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {cartItems.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-white rounded-full text-[10px] min-w-5 h-5 px-1 flex items-center justify-center border border-white shadow-sm">
              {cartItems.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-80 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Your Cart</h2>
        {cartItems.length === 0 ? (
          <p className="text-muted-foreground">Your cart is empty.</p>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
             {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-start bg-muted/50 rounded-lg p-3 shadow-sm hover:bg-muted/70 transition-colors relative"
              >
                <button
                  className="absolute top-1 right-1 text-muted-foreground hover:text-red-500"
                  onClick={() => updateQty(item.id, -Infinity)}
                >
                  <X className="w-4 h-4" />
                </button>
            <button
              className="absolute top-1 right-1 text-muted-foreground hover:text-red-500"
              onClick={() => removeItem(item.id)}
            ></button>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{item.name}</p>
                    {item.isCustom && onEditCustom && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => onEditCustom(item)}
                      >
                        ✏️ Edit
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ₹ {item.price.toFixed(2)} each
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Subtotal: ₹ {(item.price * item.qty).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => updateQty(item.id, -1)}
                  >
                    −
                  </Button>
                  <span className="text-sm w-4 text-center">{item.qty}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => updateQty(item.id, +1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}

            </div>
            <div className="pt-4 border-t mt-4">
              <p className="text-sm flex justify-between font-medium">
                <span>Total:</span>
                <span>₹ {subtotal.toFixed(2)}</span>
              </p>

              {extraAction && <div className="mt-3">{extraAction}</div>}

              <Button
                className="w-full mt-3"
                onClick={() => {
                  handleCheckout();
                  setOpen(false);
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Checkout"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
