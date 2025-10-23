'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Package,
  DollarSign,
  TrendingUp,
  Layers,
  MapPin,
  Users,
  ShoppingCart,
} from 'lucide-react';

interface SalesOrder {
  order_id: string;
  order_number: string;
  order_date: string;
  customer_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  supplier_name: string;
}

interface ProductVariant {
  product_id: string;
  product_name: string;
  sku: string;
  category: string;
  subcategory: string;
  material: string;
  total_quantity: number;
  total_stock_value: number;
  total_stock_cost: number;
  price: number;
  cost: number;
  locations: string[];
  suppliers: { id: string; name: string }[];
  total_sales_qty: number;
  total_sales_value: number;
  sales_orders: SalesOrder[];
}

interface AggregateStats {
  product_name: string;
  variant_count: number;
  total_quantity: number;
  total_stock_value: number;
  total_stock_cost: number;
  total_sales_qty: number;
  total_sales_value: number;
  categories: string[];
  subcategories: string[];
}

interface ProductDetailResponse {
  success: boolean;
  data: {
    aggregate: AggregateStats;
    variants: ProductVariant[];
  };
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ productName: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const productName = decodeURIComponent(resolvedParams.productName);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProductDetailResponse['data'] | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const fetchProductDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/inventory/product-detail/${encodeURIComponent(productName)}`
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        console.error('Failed to fetch product details:', result.error);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setLoading(false);
    }
  }, [productName]);

  useEffect(() => {
    fetchProductDetail();
  }, [productName, fetchProductDetail]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Product Not Found</h2>
          <p className="text-gray-600 mt-2">The product you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const { aggregate, variants } = data;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{productName}</h1>
            <p className="text-gray-600 mt-1">
              {aggregate.variant_count} variant{aggregate.variant_count !== 1 ? 's' : ''} •{' '}
              {aggregate.categories.join(', ')}
            </p>
          </div>
        </div>
      </div>

      {/* Aggregate Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {aggregate.total_quantity}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stock Value</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(aggregate.total_stock_value)}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sales Quantity</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {aggregate.total_sales_qty}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sales Value</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {formatCurrency(aggregate.total_sales_value)}
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variants Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Product Variants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Stock Value</TableHead>
                  <TableHead className="text-right">Sales Qty</TableHead>
                  <TableHead className="text-right">Sales Value</TableHead>
                  <TableHead className="text-center">Locations</TableHead>
                  <TableHead className="text-center">Suppliers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                      No variants found
                    </TableCell>
                  </TableRow>
                ) : (
                  variants.map((variant) => (
                    <TableRow
                      key={variant.product_id}
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => setSelectedVariant(variant)}
                    >
                      <TableCell className="font-medium">{variant.sku}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-xs w-fit">
                            {variant.category}
                          </Badge>
                          {variant.subcategory && (
                            <Badge variant="outline" className="text-xs w-fit">
                              {variant.subcategory}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {variant.material || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {variant.total_quantity}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(variant.price)}
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        {formatCurrency(variant.cost)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatCurrency(variant.total_stock_value)}
                      </TableCell>
                      <TableCell className="text-right">
                        {variant.total_sales_qty}
                      </TableCell>
                      <TableCell className="text-right text-orange-600 font-medium">
                        {formatCurrency(variant.total_sales_value)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{variant.locations.length}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{variant.suppliers.length}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Variant Detail Dialog */}
      {selectedVariant && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVariant(null)}
        >
          <Card
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>
                {selectedVariant.product_name} - {selectedVariant.sku}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Variant Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-medium">{selectedVariant.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Subcategory</p>
                  <p className="font-medium">{selectedVariant.subcategory || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Material</p>
                  <p className="font-medium">{selectedVariant.material || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quantity</p>
                  <p className="font-medium">{selectedVariant.total_quantity}</p>
                </div>
              </div>

              {/* Locations */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Locations</p>
                <div className="flex flex-wrap gap-2">
                  {selectedVariant.locations.map((location, idx) => (
                    <Badge key={idx} variant="secondary">
                      {location}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Suppliers */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Suppliers</p>
                <div className="flex flex-wrap gap-2">
                  {selectedVariant.suppliers.map((supplier) => (
                    <Badge key={supplier.id} variant="secondary">
                      {supplier.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Sales Orders */}
              {selectedVariant.sales_orders.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Recent Sales</p>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Order</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedVariant.sales_orders.slice(0, 10).map((order, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {order.order_number}
                            </TableCell>
                            <TableCell>
                              {new Date(order.order_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{order.customer_name}</TableCell>
                            <TableCell className="text-right">{order.quantity}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {formatCurrency(order.total_amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setSelectedVariant(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
