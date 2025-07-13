"use client";

import React, { useEffect, useState } from "react";
import FiltersBar from "@/components/products/FiltersBar";
import ProductGrid from "@/components/products/ProductGrid";
import CartDrawer from "@/components/products/CartDrawer";
import { CartItem, Customer, ProductWithInventory, Supplier } from "@/types";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import NewCustomProductModal from "@/components/products/NewCustomProductModal";
import CustomizeProductModal from "@/components/products/CustomizeProductModal";

export default function ProductsSalesPage() {
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isNewCustomOpen, setIsNewCustomOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [productToCustomize, setProductToCustomize] = useState<ProductWithInventory | null>(null);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  const user = getCurrentUser();

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: ProductWithInventory[]) => setProducts(data));

    fetch("/api/crm/customers")
      .then((r) => r.json())
      .then((data: Customer[]) => setCustomers(data));

    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((data: Supplier[]) => setSuppliers(data));
  }, []);

  // function addToCart(p: ProductWithInventory) {
  //   setCartItems((prev) => {
  //     const exist = prev.find((i) => i.id === p.product_id && !i.isCustom);
  //     if (exist) {
  //       return prev.map((i) =>
  //         i.id === p.product_id && !i.isCustom ? { ...i, qty: i.qty + 1 } : i
  //       );
  //     }
  //     return [
  //       ...prev,
  //       {
  //         id: p.product_id,
  //         name: p.product_name,
  //         price: p.product_price || 0,
  //         qty: 1,
  //         isCustom: false,
  //         product_id: p.product_id,
  //       },
  //     ];
  //   });
  // }

  function addToCart(p: ProductWithInventory) {
  const availableStock = p.quantity ?? 0;

  setCartItems((prev) => {
    const existing = prev.find((i) => i.id === p.product_id && !i.isCustom);
    const totalInCart = existing ? existing.qty : 0;
    const remainingStock = availableStock - totalInCart;

    // If no stock left, add as custom directly
        if (remainingStock <= 0) {
          return [
            ...prev,
            {
              id: `${p.product_id}-custom-${Date.now()}`,
              name: p.product_name,
              price: p.product_price ?? 0,
              qty: 1,
              isCustom: true,
              product_id: null,
              custom_supplier_id: p.supplier_id ?? null,
              custom_supplier_name: p.supplier_name ?? null,
            },
          ];
        }


    // If there's stock, add one normal and one custom if needed
if (remainingStock === 1) {
  if (existing) {
    // Product already in cart, just increase
    return prev.map((i) =>
      i.id === p.product_id && !i.isCustom ? { ...i, qty: i.qty + 1 } : i
    );
  } else {
    // Product not in cart, add new
    return [
      ...prev,
      {
        id: p.product_id,
        name: p.product_name,
        price: p.product_price ?? 0,
        qty: 1,
        isCustom: false,
        product_id: p.product_id,
      },
    ];
  }
}


    // Add 1 stock item + 1 custom item if more requested
    if (remainingStock < 1) {
      const updated = existing
        ? prev.map((i) =>
            i.id === p.product_id && !i.isCustom ? { ...i, qty: i.qty + remainingStock } : i
          )
        : [
            ...prev,
            {
              id: p.product_id,
              name: p.product_name,
              price: p.product_price || 0,
              qty: remainingStock,
              isCustom: false,
              product_id: p.product_id,
            },
          ];

      return [
        ...updated,
        {
          id: `${p.product_id}-custom-${Date.now()}`,
          name: p.product_name,
          price: p.product_price ?? 0,
          qty: 1,
          isCustom: true,
          product_id: null,
          custom_supplier_id: null,
          custom_supplier_name: null,
        },
      ];
    }

    // Default: enough stock, add normally
    return existing
      ? prev.map((i) =>
          i.id === p.product_id && !i.isCustom ? { ...i, qty: i.qty + 1 } : i
        )
      : [
          ...prev,
          {
            id: p.product_id,
            name: p.product_name,
            price: p.product_price || 0,
            qty: 1,
            isCustom: false,
            product_id: p.product_id,
          },
        ];
  });
}


function updateQty(id: string, delta: number) {
  setCartItems((prev) => {
    const updated: CartItem[] = [];

    for (const item of prev) {
      if (item.id !== id) {
        updated.push(item);
        continue;
      }

      const product = products.find(p => p.product_id === item.product_id);
      const maxStock = product?.quantity ?? 0;

      const newQty = item.qty + delta;

      if (newQty <= 0) continue;

      if (!item.isCustom && newQty > maxStock) {
        // Exceeds stock
        if (product) {
          setProductToCustomize(product);
          setIsCustomizeOpen(true);
        }

        // Add up to stock, rest is custom prompt
        if (item.qty < maxStock) {
          updated.push({ ...item, qty: maxStock });
        }
        continue;
      }

      updated.push({ ...item, qty: newQty });
    }

    return updated;
  });
}



  async function handleCheckout() {
    if (!selectedCustomer) {
      alert("Select a customer");
      return;
    }
    if (!user) {
      alert("Not authenticated");
      return;
    }
    setIsSubmitting(true);

    const total = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

    const res = await fetch("/api/sales/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: selectedCustomer.id,
        customer: selectedCustomer.name,
        items: cartItems.map((i) => ({
          product_id: i.isCustom ? i.product_id || null : i.id,
          name: i.name,
          quantity: i.qty,
          price: i.price,
          type: i.isCustom ? "custom" : "standard",
          configuration: i.isCustom ? i.configuration : null,
            supplier_id: i.isCustom ? i.custom_supplier_id : null,
            supplier_name: i.isCustom ? i.custom_supplier_name : null,
        })),
        total_price: total,
        status: "Draft",
        created_by: user.id,
      }),
    });

    setIsSubmitting(false);

    if (res.ok) {
      alert("Quote created!");
      setCartItems([]);
    } else {
      alert("Error creating quote");
    }
  }

  const filtered = products.filter(
    (p) =>
      (!selectedCategory || p.category === selectedCategory) &&
      (p.product_name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 font-sans">
      {/* Filter + Cart */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 w-full">
          <FiltersBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            categories={[
              ...new Set(products.map((p) => p.category).filter((c): c is string => !!c)),
            ]}
            customers={customers}
            setSelectedCustomer={setSelectedCustomer}
          />
        </div>

        {/* Cart Drawer always full width on mobile */}
        <div className="w-full md:w-auto">
        <CartDrawer
          cartItems={cartItems}
          updateQty={updateQty}
          handleCheckout={handleCheckout}
          isSubmitting={isSubmitting}
          onEditCustom={(item) => {
            setProductToCustomize({
              product_id: item.product_id || "", // fallback
              product_name: item.name,
              product_price: item.price,
              quantity: 0,
              category: null,
              subcategory: null,
              material: null,
              location: null,
              reorder_point: 0,
              updated_at: "",
              inventory_id: "",
            });
            setIsCustomizeOpen(true);
          }}
          extraAction={
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsNewCustomOpen(true)}
            >
              + Custom Product
            </Button>
          }
        />


        </div>
      </div>

      {/* Product grid */}
      <ProductGrid
        products={filtered}
        addToCart={addToCart}
        onCustomize={(product) => {
          setProductToCustomize(product);
          setIsCustomizeOpen(true);
        }}
      />

      {/* Custom Product Button
      <div className="mt-4">
        <Button
          variant="outline"
          className="w-full md:w-auto"
          onClick={() => setIsNewCustomOpen(true)}
        >
          + Custom Product
        </Button>
      </div> */}

      {/* Modals */}
      <NewCustomProductModal
        isOpen={isNewCustomOpen}
        onClose={() => setIsNewCustomOpen(false)}
        suppliers={suppliers}
        onSave={(item) => setCartItems((prev) => [...prev, item])}
      />

      <CustomizeProductModal
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        product={productToCustomize}
        suppliers={suppliers} 
        onSave={(item) => setCartItems((prev) => [...prev, item])}
      />
    </div>
  );
}
