"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  cost?: number | null;
  category: string | null;
  image_url: string | null;
  quantity: number;
  supplierName: string | null;
};

function formatPrice(price: number | null | undefined) {
  return Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(price ?? 0);
}

function calculateMargin(cost: number | null | undefined, price: number | null | undefined): number | null {
  if (typeof cost === "number" && typeof price === "number" && cost > 0) {
    return ((price - cost) / cost) * 100;
  }
  return null;
}

export default function ProductCard({
  product,
  addToCart,
}: {
  product: Product;
  addToCart: (p: Product) => void;
}) {
  const margin = calculateMargin(product.cost, product.price);

  return (
    <Card className="group flex flex-col rounded-lg border hover:shadow-lg transition">
      <Dialog>
        <DialogTrigger asChild>
          <div className="cursor-pointer">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                width={400}
                height={192}
                className="h-48 w-full object-cover rounded-t"
              />
            ) : (
              <div className="h-48 w-full bg-muted flex items-center justify-center text-muted-foreground">
                {product.name}
              </div>
            )}
          </div>
        </DialogTrigger>
        <DialogContent>
          <div className="flex flex-col gap-4">
            {product.image_url && (
              <Image
                src={product.image_url}
                alt={product.name}
                className="rounded"
                width={400}
                height={300}
              />
            )}
            <h2 className="text-lg font-semibold">{product.name}</h2>
            <p className="text-sm text-muted-foreground">{product.description}</p>
            {product.supplierName && (
              <p className="text-sm text-muted-foreground">Supplier: {product.supplierName}</p>
            )}
            <div className="flex items-center justify-between">
              <p className="font-bold text-yellow-600">
                  ₹ {typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
                </p>

              {margin !== null && (
                <Badge className="text-xs" variant="outline">
                  +{margin.toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className={product.quantity > 0 ? "text-green-600" : "text-red-600"}>
              {product.quantity > 0 ? `In Stock (${product.quantity})` : "Out of Stock"}
            </p>
            <Button disabled={product.quantity <= 0} onClick={() => addToCart(product)}>
              {product.quantity <= 0 ? "Out of Stock" : "Add to Cart"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CardContent className="flex flex-col gap-2 p-4 flex-1">
        <h3 className="font-semibold">{product.name}</h3>
        <p className="text-xs text-muted-foreground">{product.category}</p>
        {product.supplierName && (
          <p className="text-xs text-muted-foreground">Supplier: {product.supplierName}</p>
        )}
        <div className="flex items-center justify-between">
          <p className="font-bold text-yellow-600">{formatPrice(product.price)}</p>
          {margin !== null && (
            <Badge className="text-xs" variant="outline">
              +{margin.toFixed(1)}%
            </Badge>
          )}
        </div>
        <p
          className={`text-xs ${product.quantity > 0 ? "text-green-600" : "text-red-600"}`}
        >
          {product.quantity > 0 ? `${product.quantity} in stock` : "Out of Stock"}
        </p>
        <Button size="sm" onClick={() => addToCart(product)} disabled={product.quantity <= 0}>
          {product.quantity <= 0 ? "Out of Stock" : "Add"}
        </Button>
      </CardContent>
    </Card>
  );
}
