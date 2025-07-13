// components/products/ProductGrid.tsx
import React from "react";
import Image from "next/image";
import { ProductWithInventory } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

type Props = {
  products: ProductWithInventory[];
  addToCart: (p: ProductWithInventory) => void;
  onCustomize: (p: ProductWithInventory) => void;
};

export default function ProductGrid({ products, addToCart, onCustomize }: Props) {
  return (
    <div
      className="
        grid
        grid-cols-2
        sm:grid-cols-3
        md:grid-cols-4
        lg:grid-cols-5
        xl:grid-cols-6
        gap-3
      "
    >
      {products.map((p) => (
        <Card
          key={p.product_id}
          className="group flex flex-col rounded-md border hover:shadow-md transition"
        >
          <Dialog>
            <DialogTrigger asChild>
              <div className="cursor-pointer">
                {p.product_image_url ? (
                  <Image
                    src={p.product_image_url}
                    alt={p.product_name}
                    width={400}
                    height={160}
                    className="h-32 w-full object-cover rounded-t"
                  />
                ) : (
                  <div className="h-32 w-full bg-muted flex items-center justify-center text-xs text-muted-foreground text-center p-2">
                    {p.product_name}
                  </div>
                )}
              </div>
            </DialogTrigger>
            <DialogContent>
              <div className="flex flex-col gap-3">
                {p.product_image_url && (
                  <Image
                    src={p.product_image_url}
                    alt={p.product_name}
                    className="rounded"
                    width={400}
                    height={300}
                  />
                )}
                <h2 className="text-base font-semibold">{p.product_name}</h2>
                <p className="text-sm text-muted-foreground">{p.product_description}</p>
                {p.supplier_name && (
                  <p className="text-sm text-muted-foreground">
                    Supplier: {p.supplier_name}
                  </p>
                )}
                {p.material && (
                  <p className="text-sm text-muted-foreground">
                    Material: {p.material}
                  </p>
                )}

                <p className="font-bold text-primary">₹ {p.product_price?.toFixed(2)}</p>
                <p
                  className={p.quantity > 0 ? "text-green-600" : "text-red-600"}
                >
                  {p.quantity > 0 ? `In Stock (${p.quantity} left)` : "Out of Stock"}
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={p.quantity <= 0}
                    onClick={() => addToCart(p)}
                  >
                    {p.quantity <= 0 ? "Out of Stock" : "Add to Cart"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onCustomize(p)}
                  >
                    Customize
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <CardContent className="flex flex-col gap-1 p-2 flex-1">
            <div>
              <h3 className="text-sm font-medium truncate">{p.product_name}</h3>
              <p className="text-[10px] text-muted-foreground truncate">{p.product_category}</p>
              {p.supplier_name && (
                <p className="text-[10px] text-muted-foreground truncate">
                  Supplier: {p.supplier_name}
                </p>
              )}

              {p.material && (
                <p className="text-[10px] text-muted-foreground truncate">
                  Material: {p.material}
                </p>
              )}

            </div>
            <p className="text-sm font-bold text-yellow-600">
              ₹ {p.product_price?.toFixed(2)}
            </p>
            <p
              className={`text-[10px] ${
                p.quantity > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {p.quantity > 0 ? `${p.quantity} in stock` : "Out of Stock"}
            </p>
            <div className="flex gap-1 mt-1">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => addToCart(p)}
                disabled={p.quantity <= 0}
              >
                {p.quantity <= 0 ? "Out" : "Add"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onCustomize(p)}
              >
                Customize
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
