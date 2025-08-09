"use client";

import React, { useEffect, useState } from "react";
import FiltersBar from "@/components/products/FiltersBar";
import ProductGrid from "@/components/products/ProductGrid";
import CartDrawer from "@/components/products/CartDrawer";
import { CartItem, Customer, ProductWithInventory, Supplier } from "@/types";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, CheckCircle, ShoppingCart, AlertTriangle } from "lucide-react";
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
    fetch("/api/products?limit=1000") // Get all products for the sales page
      .then((r) => r.json())
      .then((data) => {
        // Handle both old format (array) and new format (object with products array)
        const productsArray = Array.isArray(data) ? data : data.products || [];
        
        // Remove duplicates based on product_id
        const uniqueProducts = productsArray.filter((product: ProductWithInventory, index: number, self: ProductWithInventory[]) => 
          index === self.findIndex((p: ProductWithInventory) => p.product_id === product.product_id)
        );
        
        setProducts(uniqueProducts);
      })
      .catch((error) => {
        console.error('Error fetching products:', error);
      });

    fetch("/api/crm/customers")
      .then((r) => r.json())
      .then((data: Customer[]) => setCustomers(data))
      .catch((error) => {
        console.error('Error fetching customers:', error);
      });

    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((data: Supplier[]) => setSuppliers(data))
      .catch((error) => {
        console.error('Error fetching suppliers:', error);
      });
  }, []);

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
              price: p.price ?? 0,
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
        price: p.price ?? 0,
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
              price: p.price || 0,
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
          price: p.price ?? 0,
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
            price: p.price || 0,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-6 space-y-8">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Product Catalog
            </h1>
            <p className="text-gray-600 mt-2">Browse products and create quotes for customers</p>
          </div>
          <Button
            variant="outline"
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white border-0 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            onClick={() => setIsNewCustomOpen(true)}
          >
            + Custom Product
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">
                {[...new Set(products.map((p) => p.category).filter((c): c is string => !!c))].length}
              </span>
              <span className="text-gray-600 ml-1">categories</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {products.filter(p => (p.quantity || 0) > 0).length}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">
                {Math.round((products.filter(p => (p.quantity || 0) > 0).length / products.length) * 100)}%
              </span>
              <span className="text-gray-600 ml-1">availability</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cart Items</p>
                <p className="text-2xl font-bold text-gray-900">{cartItems.length}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-blue-600 font-medium">
                ${cartItems.reduce((s, i) => s + i.price * i.qty, 0).toLocaleString()}
              </span>
              <span className="text-gray-600 ml-1">total value</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {products.filter(p => (p.quantity || 0) <= (p.reorder_point || 5)).length}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-red-600 font-medium">Need attention</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Cart */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 w-full">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
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
        </div>

        {/* Cart Drawer */}
        <div className="w-full lg:w-80">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
            <CartDrawer
              cartItems={cartItems}
              updateQty={updateQty}
              handleCheckout={handleCheckout}
              isSubmitting={isSubmitting}
              onEditCustom={(item) => {
                setProductToCustomize({
                  product_id: item.product_id || "",
                  product_name: item.name,
                  price: item.price,
                  quantity: 0,
                  category: null,
                  subcategory: null,
                  material: null,
                  location: null,
                  reorder_point: 0,
                  updated_at: "",
                  inventory_id: "",
                  applied_margin: 0,
                  cost: 0,
                });
                setIsCustomizeOpen(true);
              }}
              extraAction={
                <Button
                  variant="outline"
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white border-0"
                  onClick={() => setIsNewCustomOpen(true)}
                >
                  + Custom Product
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Product Catalog</h2>
          <p className="text-gray-600">
            Showing {filtered.length} of {products.length} products
          </p>
        </div>
        <ProductGrid
          products={filtered}
          addToCart={addToCart}
          onCustomize={(product) => {
            setProductToCustomize(product);
            setIsCustomizeOpen(true);
          }}
        />
      </div>

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
