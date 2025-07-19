"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ProductWithInventory } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Check } from "lucide-react";

type Props = {
  products: ProductWithInventory[];
  addToCart: (p: ProductWithInventory) => Promise<void> | void;
  onCustomize: (p: ProductWithInventory) => Promise<void> | void;
};

export default function ProductGrid({ products, addToCart, onCustomize }: Props) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const handleAddToCart = async (product: ProductWithInventory) => {
    if (processingId || addedItems.has(product.product_id)) return;
    setProcessingId(product.product_id);
    try {
      await addToCart(product);
      setAddedItems((prev) => new Set(prev).add(product.product_id));
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCustomize = async (product: ProductWithInventory) => {
    if (processingId) return;
    setProcessingId(product.product_id);
    try {
      await onCustomize(product);
    } catch (error) {
      console.error("Failed to customize:", error);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div
      className="
        grid
        grid-cols-1
        sm:grid-cols-2
        md:grid-cols-3
        lg:grid-cols-4
        xl:grid-cols-5
        gap-4
        px-2
        w-full
        max-w-screen-xl
        mx-auto
      "
    >
      {products.map((p) => {
        const isProcessing = processingId === p.product_id;
        const isAdded = addedItems.has(p.product_id);
        const isOutOfStock = p.quantity <= 0;

        return (
          <Card
            key={p.product_id}
            className="group flex flex-col rounded-lg border hover:shadow-lg transition-shadow duration-300 overflow-hidden"
          >
            <Dialog>
              <DialogTrigger asChild>
                <div className="cursor-pointer overflow-hidden rounded-t-lg">
                  {p.product_image_url ? (
                    <Image
                      src={p.product_image_url}
                      alt={p.product_name}
                      width={400}
                      height={400}
                      className="h-40 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="h-40 w-full bg-muted flex items-center justify-center text-xs text-muted-foreground text-center p-2">
                      {p.product_name}
                    </div>
                  )}
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{p.product_name}</DialogTitle>
                  <DialogDescription>{p.product_category}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                  {p.product_image_url && (
                    <div className="relative h-64 w-full">
                      <Image
                        src={p.product_image_url}
                        alt={p.product_name}
                        className="rounded-md object-cover"
                        fill
                      />
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {p.product_description || "No description available."}
                  </p>
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-lg text-primary">₹ {p.price?.toFixed(2)}</p>
                    <p className={`font-semibold ${p.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                      {p.quantity > 0 ? `In Stock (${p.quantity})` : "Out of Stock"}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <Button
                      className="flex-1 max-w-full sm:max-w-[calc(50%-4px)]"
                      disabled={isOutOfStock || isProcessing || isAdded}
                      onClick={() => handleAddToCart(p)}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isAdded ? (
                        <>
                          <Check className="w-4 h-4 mr-1" /> Added
                        </>
                      ) : (
                        "Add to Cart"
                      )}
                    </Button>
                    <Button
                      className="flex-1 max-w-full sm:max-w-[calc(50%-4px)]"
                      variant="outline"
                      onClick={() => handleCustomize(p)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Customize"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <CardContent className="flex flex-col gap-2 p-3 flex-1">
              <h3 className="text-sm font-semibold truncate" title={p.product_name}>
                {p.product_name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {p.product_category || "Uncategorized"}
              </p>
              <div className="flex-grow" />
              <div className="flex justify-between items-center">
                <p className="text-base font-bold text-primary">₹ {p.price?.toFixed(2)}</p>
                <p
                  className={`text-xs font-medium ${
                    isOutOfStock ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {isOutOfStock ? "Out of Stock" : "In Stock"}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Button
                  size="sm"
                  className="w-full sm:w-auto max-w-full sm:max-w-[calc(50%-4px)]"
                  onClick={() => handleAddToCart(p)}
                  disabled={isOutOfStock || isProcessing || isAdded}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isAdded ? (
                    <>
                      <Check className="w-4 h-4 mr-1" /> Added
                    </>
                  ) : (
                    "Add"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto max-w-full sm:max-w-[calc(50%-4px)]"
                  onClick={() => handleCustomize(p)}
                  disabled={isProcessing}
                >
                  Customize
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
