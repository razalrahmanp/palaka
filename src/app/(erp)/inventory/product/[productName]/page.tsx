'use client';

import React, { useState, useEffect, use, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Package,
  DollarSign,
  TrendingUp,
  ArrowLeft,
  BarChart3,
  PieChart,
  Users,
  ShoppingCart,
  Boxes,
  AlertCircle,
  Check,
  X,
  Star,
  Award,
  Target,
  Activity,
  Info,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Create a singleton Supabase client outside the component
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ProductVariant {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  retail_price: number;
  sales_price: number;
  manufacture_price: number;
  total_quantity: number;
  category_id: string;
  category_name: string;
  material_type: string;
  status: string;
  min_stock_level: number;
  supplier_id: string | null;
  supplier_name: string | null;
}

interface SalesOrderItem {
  id: string;
  quantity: number;
  price: number;
  discount: number;
  created_at: string;
  sales_order: {
    order_number: string;
    status: string;
    total_amount: number;
    created_at: string;
    customer: {
      name: string;
    } | null;
    supplier: {
      name: string;
    } | null;
  };
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ productName: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [salesOrders, setSalesOrders] = useState<SalesOrderItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const productName = decodeURIComponent(resolvedParams.productName);

  const fetchVariants = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch inventory items
      const { data, error } = await supabaseClient
        .from('inventory_items')
        .select(
          `
          id,
          product_id,
          quantity,
          reorder_point,
          category,
          subcategory,
          material,
          location,
          updated_at,
          products!inner(
            id,
            name,
            sku,
            price,
            cost,
            supplier_id,
            category,
            description
          ),
          suppliers(
            id,
            name
          )
        `
        )
        .eq('products.name', productName);

      if (error) throw error;

      // Fetch sales order items to get actual sales prices
      const productIds = data?.map((item) => item.product_id) || [];
      
      const salesPriceMap = new Map<string, number>();
      
      if (productIds.length > 0) {
        const { data: salesData } = await supabaseClient
          .from('sales_order_items')
          .select('product_id, final_price')
          .in('product_id', productIds);

        // Calculate average sales price per product
        const salesByProduct = new Map<string, { total: number; count: number }>();
        
        salesData?.forEach((sale) => {
          if (!sale.product_id) return;
          const price = sale.final_price || 0;
          const existing = salesByProduct.get(sale.product_id) || { total: 0, count: 0 };
          existing.total += price;
          existing.count += 1;
          salesByProduct.set(sale.product_id, existing);
        });

        // Calculate averages
        salesByProduct.forEach((value, productId) => {
          salesPriceMap.set(productId, value.total / value.count);
        });
      }

      const formattedData: ProductVariant[] =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data?.map((item: any) => {
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          const supplier = Array.isArray(item.suppliers) ? item.suppliers[0] : item.suppliers;
          
          // Get actual sales price from sales orders, fallback to product price
          const actualSalesPrice = salesPriceMap.get(item.product_id) || product?.price || 0;
          
          return {
            product_id: item.product_id,
            product_name: product?.name || productName,
            sku: product?.sku || 'N/A',
            quantity: item.quantity || 0,
            retail_price: product?.price || 0,
            sales_price: actualSalesPrice,
            manufacture_price: product?.cost || 0,
            total_quantity: item.quantity || 0,
            category_id: product?.category || '',
            category_name: item.category || product?.category || 'Uncategorized',
            material_type: item.material || 'Unknown',
            status: 'active',
            min_stock_level: item.reorder_point || 0,
            supplier_id: product?.supplier_id || null,
            supplier_name: supplier?.name || 'No Supplier',
          };
        }) || [];

      setVariants(formattedData);
    } catch (error) {
      console.error('Error fetching variants:', error);
    } finally {
      setLoading(false);
    }
  }, [productName]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const fetchSalesOrders = async (productId: string) => {
    setLoadingOrders(true);
    try {
      const { data, error } = await supabaseClient
        .from('sales_order_items')
        .select(
          `
          id,
          quantity,
          price,
          discount,
          created_at,
          sales_orders!inner(
            order_number,
            status,
            total_amount,
            created_at,
            customers(name),
            suppliers(name)
          )
        `
        )
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedOrders: SalesOrderItem[] =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data?.map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount || 0,
          created_at: item.created_at,
          sales_order: {
            order_number: item.sales_orders?.order_number || '',
            status: item.sales_orders?.status || '',
            total_amount: item.sales_orders?.total_amount || 0,
            created_at: item.sales_orders?.created_at || '',
            customer: Array.isArray(item.sales_orders?.customers) 
              ? item.sales_orders.customers[0] 
              : item.sales_orders?.customers || null,
            supplier: Array.isArray(item.sales_orders?.suppliers)
              ? item.sales_orders.suppliers[0]
              : item.sales_orders?.suppliers || null,
          },
        })) || [];

      setSalesOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching sales orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleVariantClick = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    fetchSalesOrders(variant.product_id);
    setShowModal(true);
  };

  // Analytics calculations
  const analytics = useMemo(() => {
    if (!variants.length) return null;

    const totalQuantity = variants.reduce((sum, v) => sum + v.quantity, 0);
    const totalStockValue = variants.reduce(
      (sum, v) => sum + v.quantity * v.manufacture_price,
      0
    );
    const totalSalesQty = variants.reduce((sum, v) => sum + v.quantity, 0);
    const totalSalesValue = variants.reduce(
      (sum, v) => sum + v.quantity * v.sales_price,
      0
    );

    // Material distribution
    const materialCounts = variants.reduce(
      (acc, v) => {
        acc[v.material_type] = (acc[v.material_type] || 0) + v.quantity;
        return acc;
      },
      {} as Record<string, number>
    );

    const materialDistribution = Object.entries(materialCounts)
      .map(([material, count]) => ({
        material,
        count,
        percentage: (count / totalQuantity) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Category distribution
    const categoryCounts = variants.reduce(
      (acc, v) => {
        acc[v.category_name] = (acc[v.category_name] || 0) + v.quantity;
        return acc;
      },
      {} as Record<string, number>
    );

    const categoryDistribution = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category,
        count,
        percentage: (count / totalQuantity) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Supplier performance
    const supplierPerformance = variants.reduce(
      (acc, v) => {
        const supplier = v.supplier_name || 'No Supplier';
        if (!acc[supplier]) {
          acc[supplier] = {
            totalUnits: 0,
            totalOrders: 0,
            totalValue: 0,
          };
        }
        acc[supplier].totalUnits += v.quantity;
        acc[supplier].totalOrders += 1;
        acc[supplier].totalValue += v.quantity * v.sales_price;
        return acc;
      },
      {} as Record<string, { totalUnits: number; totalOrders: number; totalValue: number }>
    );

    const supplierRanking = Object.entries(supplierPerformance)
      .map(([supplier, stats]) => ({
        supplier,
        ...stats,
        avgOrderValue: stats.totalValue / stats.totalOrders,
        percentageContribution: (stats.totalValue / totalSalesValue) * 100,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    // Price analytics
    const prices = variants.map((v) => v.sales_price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    // Profit margin
    const totalProfit = variants.reduce(
      (sum, v) => sum + (v.sales_price - v.manufacture_price) * v.quantity,
      0
    );
    const profitMargin = (totalProfit / totalSalesValue) * 100;

    // Stock status
    const inStock = variants.filter((v) => v.quantity > v.min_stock_level).length;
    const outOfStock = variants.filter((v) => v.quantity === 0).length;
    const lowStock = variants.filter(
      (v) => v.quantity > 0 && v.quantity <= v.min_stock_level
    ).length;

    return {
      totalQuantity,
      totalStockValue,
      totalSalesQty,
      totalSalesValue,
      materialDistribution,
      categoryDistribution,
      supplierRanking,
      minPrice,
      maxPrice,
      avgPrice,
      profitMargin,
      inStock,
      outOfStock,
      lowStock,
    };
  }, [variants]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (!variants.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Button onClick={() => router.back()} variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-4 p-8">
              <AlertCircle className="h-12 w-12 text-red-600" />
              <div>
                <h2 className="text-2xl font-bold text-red-900">Product Not Found</h2>
                <p className="text-red-700 mt-2">
                  No variants found for product: {productName}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-full mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <Button onClick={() => router.back()} variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{productName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  <Package className="mr-1 h-3 w-3" />
                  {variants.length} Variants
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {variants[0]?.category_name}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {analytics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-l-4 border-l-blue-600 bg-white hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <Boxes className="h-3.5 w-3.5" />
                  Total Quantity
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-2xl font-bold text-blue-900">
                  {analytics.totalQuantity.toLocaleString()}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">units in stock</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-600 bg-white hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Stock Value
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-2xl font-bold text-green-900">
                  ₹{analytics.totalStockValue.toLocaleString()}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">total inventory value</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-600 bg-white hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Sales Quantity
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-2xl font-bold text-orange-900">
                  {analytics.totalSalesQty.toLocaleString()}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">units sold</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600 bg-white hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Sales Value
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-2xl font-bold text-purple-900">
                  ₹{analytics.totalSalesValue.toLocaleString()}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">total revenue</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto bg-white">
            <TabsTrigger value="overview" className="gap-1.5 text-sm data-[state=active]:bg-blue-50">
              <BarChart3 className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="variants" className="gap-1.5 text-sm data-[state=active]:bg-blue-50">
              <Package className="h-3.5 w-3.5" />
              Variants
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-sm data-[state=active]:bg-blue-50">
              <PieChart className="h-3.5 w-3.5" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-1.5 text-sm data-[state=active]:bg-blue-50">
              <Users className="h-3.5 w-3.5" />
              Suppliers
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Price Stats */}
              {analytics && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                      Price Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Minimum Price:</span>
                      <span className="font-bold text-lg text-green-600">
                        ₹{analytics.minPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Average Price:</span>
                      <span className="font-bold text-lg text-blue-600">
                        ₹{analytics.avgPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Maximum Price:</span>
                      <span className="font-bold text-lg text-red-600">
                        ₹{analytics.maxPrice.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Material Distribution */}
              {analytics && analytics.materialDistribution.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-purple-600" />
                      Material Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analytics.materialDistribution.slice(0, 5).map((item) => (
                      <div key={item.material} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-700">
                            {item.material}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {item.count} ({item.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Category Distribution */}
            {analytics && analytics.categoryDistribution.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-600" />
                    Category Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {analytics.categoryDistribution.map((item) => (
                      <div
                        key={item.category}
                        className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {item.category}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {item.percentage.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="text-2xl font-bold text-blue-900">
                          {item.count.toLocaleString()}
                        </div>
                        <div className="w-full bg-slate-300 rounded-full h-1.5 mt-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Variants Tab */}
          <TabsContent value="variants">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  All Variants ({variants.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="font-semibold text-xs h-9">SKU</TableHead>
                        <TableHead className="font-semibold text-xs h-9">Material</TableHead>
                        <TableHead className="font-semibold text-xs h-9">Category</TableHead>
                        <TableHead className="font-semibold text-xs h-9">Supplier</TableHead>
                        <TableHead className="font-semibold text-xs text-right h-9">Quantity</TableHead>
                        <TableHead className="font-semibold text-xs text-right h-9">Retail Price</TableHead>
                        <TableHead className="font-semibold text-xs text-right h-9">Sales Price</TableHead>
                        <TableHead className="font-semibold text-xs text-right h-9">Mfg Price</TableHead>
                        <TableHead className="font-semibold text-xs text-center h-9">Status</TableHead>
                        <TableHead className="font-semibold text-xs text-right h-9">Min Stock</TableHead>
                        <TableHead className="font-semibold text-xs text-center h-9">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map((variant) => (
                        <TableRow
                          key={variant.product_id}
                          className="hover:bg-blue-50/50 transition-colors cursor-pointer h-10"
                          onClick={() => handleVariantClick(variant)}
                        >
                          <TableCell className="font-mono text-xs py-2">{variant.sku}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-xs">{variant.material_type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm py-2">{variant.category_name}</TableCell>
                          <TableCell className="text-sm py-2">{variant.supplier_name}</TableCell>
                          <TableCell className="text-right font-semibold text-sm py-2">
                            {variant.quantity.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-sm py-2">
                            ₹{variant.retail_price.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-sm py-2">
                            ₹{variant.sales_price.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-sm py-2">
                            ₹{variant.manufacture_price.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            {variant.quantity === 0 ? (
                              <Badge variant="destructive" className="gap-1 text-xs h-5">
                                <X className="h-2.5 w-2.5" />
                                Out
                              </Badge>
                            ) : variant.quantity <= variant.min_stock_level ? (
                              <Badge variant="outline" className="gap-1 border-orange-500 text-orange-700 text-xs h-5">
                                <AlertCircle className="h-2.5 w-2.5" />
                                Low
                              </Badge>
                            ) : (
                              <Badge variant="default" className="gap-1 bg-green-600 text-xs h-5">
                                <Check className="h-2.5 w-2.5" />
                                In Stock
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm py-2">
                            {variant.min_stock_level.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVariantClick(variant);
                              }}
                            >
                              <Info className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            {analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Profit Margin */}
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-900">
                      <TrendingUp className="h-5 w-5" />
                      Profit Margin Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">Total Revenue:</span>
                      <span className="font-bold text-xl text-green-900">
                        ₹{analytics.totalSalesValue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">Total Cost:</span>
                      <span className="font-bold text-xl text-red-900">
                        ₹{analytics.totalStockValue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t-2 border-green-300">
                      <span className="text-lg font-semibold text-slate-900">Profit Margin:</span>
                      <span className="font-bold text-3xl text-green-600">
                        {analytics.profitMargin.toFixed(2)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Stock Status */}
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <Boxes className="h-5 w-5" />
                      Stock Status Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border-l-4 border-l-green-500">
                      <div className="flex items-center gap-3">
                        <Check className="h-6 w-6 text-green-600" />
                        <span className="font-medium text-slate-700">In Stock</span>
                      </div>
                      <span className="font-bold text-2xl text-green-900">{analytics.inStock}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border-l-4 border-l-red-500">
                      <div className="flex items-center gap-3">
                        <X className="h-6 w-6 text-red-600" />
                        <span className="font-medium text-slate-700">Out of Stock</span>
                      </div>
                      <span className="font-bold text-2xl text-red-900">
                        {analytics.outOfStock}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border-l-4 border-l-orange-500">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-6 w-6 text-orange-600" />
                        <span className="font-medium text-slate-700">Low Stock</span>
                      </div>
                      <span className="font-bold text-2xl text-orange-900">
                        {analytics.lowStock}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Materials */}
                {analytics.materialDistribution.length > 0 && (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-yellow-600" />
                        Top 5 Materials by Quantity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {analytics.materialDistribution.slice(0, 5).map((item, index) => (
                          <div key={item.material} className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold shadow-lg">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-slate-900">
                                  {item.material}
                                </span>
                                <span className="text-sm font-medium text-slate-600">
                                  {item.count} units ({item.percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
                                <div
                                  className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 h-3 rounded-full transition-all duration-700"
                                  style={{ width: `${item.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers">
            {analytics && analytics.supplierRanking.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-600" />
                    Supplier Performance Ranking
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableHead className="font-semibold text-xs w-12 h-9">Rank</TableHead>
                          <TableHead className="font-semibold text-xs h-9">Supplier</TableHead>
                          <TableHead className="font-semibold text-xs text-right h-9">Units Sold</TableHead>
                          <TableHead className="font-semibold text-xs text-right h-9">Orders</TableHead>
                          <TableHead className="font-semibold text-xs text-right h-9">Sales Value</TableHead>
                          <TableHead className="font-semibold text-xs text-right h-9">Avg Order Value</TableHead>
                          <TableHead className="font-semibold text-xs text-right h-9">Contribution %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.supplierRanking.map((supplier, index) => (
                          <TableRow
                            key={supplier.supplier}
                            className="hover:bg-yellow-50/50 transition-colors h-10"
                          >
                            <TableCell className="py-2">
                              <div
                                className={`flex items-center justify-center w-7 h-7 rounded-full font-bold text-white text-xs ${
                                  index === 0
                                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-md'
                                    : index === 1
                                      ? 'bg-gradient-to-br from-slate-300 to-slate-500'
                                      : index === 2
                                        ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                                        : 'bg-slate-400'
                                }`}
                              >
                                {index + 1}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-sm py-2">{supplier.supplier}</TableCell>
                            <TableCell className="text-right font-medium text-sm py-2">
                              {supplier.totalUnits.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-sm py-2">{supplier.totalOrders}</TableCell>
                            <TableCell className="text-right font-bold text-green-700 text-sm py-2">
                              ₹{supplier.totalValue.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-sm py-2">
                              ₹{supplier.avgOrderValue.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <Badge
                                variant={index === 0 ? 'default' : 'secondary'}
                                className={`text-xs h-5 ${
                                  index === 0
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : ''
                                }`}
                              >
                                {supplier.percentageContribution.toFixed(2)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Variant Detail Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                Variant Details: {selectedVariant?.sku}
              </DialogTitle>
              <DialogDescription>
                Complete information and sales history for this variant
              </DialogDescription>
            </DialogHeader>

            {selectedVariant && (
              <div className="space-y-6">
                {/* Variant Info Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="text-xs text-slate-600 mb-1">Quantity</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {selectedVariant.quantity.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="text-xs text-slate-600 mb-1">Sales Price</div>
                    <div className="text-2xl font-bold text-green-900">
                      ₹{selectedVariant.sales_price.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="text-xs text-slate-600 mb-1">Material</div>
                    <div className="text-lg font-bold text-purple-900">
                      {selectedVariant.material_type}
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="text-xs text-slate-600 mb-1">Supplier</div>
                    <div className="text-sm font-bold text-orange-900">
                      {selectedVariant.supplier_name}
                    </div>
                  </div>
                </div>

                {/* Sales Orders */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                    Sales Orders
                  </h3>
                  {loadingOrders ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-blue-600"></div>
                    </div>
                  ) : salesOrders.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-100">
                            <TableHead className="font-bold">Order #</TableHead>
                            <TableHead className="font-bold">Customer/Supplier</TableHead>
                            <TableHead className="font-bold text-right">Quantity</TableHead>
                            <TableHead className="font-bold text-right">Price</TableHead>
                            <TableHead className="font-bold text-right">Discount</TableHead>
                            <TableHead className="font-bold text-right">Total</TableHead>
                            <TableHead className="font-bold text-center">Status</TableHead>
                            <TableHead className="font-bold">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesOrders.map((order) => (
                            <TableRow key={order.id} className="hover:bg-slate-50">
                              <TableCell className="font-mono text-xs">
                                {order.sales_order.order_number}
                              </TableCell>
                              <TableCell>
                                {order.sales_order.customer?.name ||
                                  order.sales_order.supplier?.name ||
                                  'N/A'}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {order.quantity}
                              </TableCell>
                              <TableCell className="text-right">
                                ₹{order.price.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                ₹{order.discount.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-bold text-green-700">
                                ₹{((order.price - order.discount) * order.quantity).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={
                                    order.sales_order.status === 'completed'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                >
                                  {order.sales_order.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {new Date(order.created_at).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>No sales orders found for this variant</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
