'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Package, DollarSign, RefreshCw, Layers, ShoppingCart, Box } from 'lucide-react';

interface ProductSummaryData {
  product_name: string;
  category: string;
  subcategory: string;
  variant_count: number;
  total_quantity: number;
  total_stock_value: number;
  total_stock_cost: number;
  locations_count: number;
  suppliers_count: number;
  total_sales_qty: number;
  total_sales_value: number;
}

interface StatsData {
  total_items: number;
  total_products: number;
  total_quantity: number;
  total_stock_value: number;
  total_stock_cost: number;
  total_sales_value: number;
}

export function ProductSummary() {
  const router = useRouter();
  const [summaryData, setSummaryData] = useState<ProductSummaryData[]>([]);
  const [filteredData, setFilteredData] = useState<ProductSummaryData[]>([]);
  const [stats, setStats] = useState<StatsData>({
    total_items: 0,
    total_products: 0,
    total_quantity: 0,
    total_stock_value: 0,
    total_stock_cost: 0,
    total_sales_value: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await fetch(`/api/inventory/product-summary?_t=${Date.now()}`).then(r => r.json());
      setSummaryData(data.summary || []);
      setFilteredData(data.summary || []);
      setStats(data.stats || stats);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchSummary(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    setFilteredData(query ? summaryData.filter(i => i.product_name.toLowerCase().includes(query) || i.category.toLowerCase().includes(query)) : summaryData);
  }, [searchQuery, summaryData]);

  const formatCurrency = (a: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(a);
  const formatNumber = (a: number) => new Intl.NumberFormat('en-IN').format(a);
  
  return (
    <div className="max-w-full mx-auto space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="bg-white border-l-4 border-l-purple-500">
          <CardContent className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Items</p>
                <p className="text-2xl font-bold mt-1">{formatNumber(stats.total_items)}</p>
                <p className="text-xs text-gray-500 mt-1">{formatNumber(stats.total_products)} unique products</p>
              </div>
              <Box className="h-4 w-4 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-l-blue-500">
          <CardContent className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Stock Value (MRP)</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.total_stock_value)}</p>
                <p className="text-xs text-gray-500 mt-1">Qty: {formatNumber(stats.total_quantity)}</p>
              </div>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-l-green-500">
          <CardContent className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Stock Cost</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.total_stock_cost)}</p>
                <p className="text-xs text-gray-500 mt-1">Purchase value</p>
              </div>
              <Package className="h-4 w-4 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-l-orange-500">
          <CardContent className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Sales Value</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.total_sales_value)}</p>
                <p className="text-xs text-gray-500 mt-1">Total revenue</p>
              </div>
              <ShoppingCart className="h-4 w-4 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Product Summary</span>
            <Button onClick={fetchSummary} variant="outline" size="sm" className="h-7">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 px-6 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input 
                placeholder="Search products or categories..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="pl-9 h-8 text-sm" 
              />
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="h-9 text-xs">Product</TableHead>
                  <TableHead className="h-9 text-xs">Category</TableHead>
                  <TableHead className="h-9 text-xs text-center">Variants</TableHead>
                  <TableHead className="h-9 text-xs text-right">Qty</TableHead>
                  <TableHead className="h-9 text-xs text-right">Value</TableHead>
                  <TableHead className="h-9 text-xs text-right">Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((p, i) => (
                  <TableRow 
                    key={i} 
                    className="h-10 cursor-pointer hover:bg-blue-50 transition-colors" 
                    onClick={() => router.push(`/inventory/product/${encodeURIComponent(p.product_name)}`)}
                  >
                    <TableCell className="py-2 text-sm font-medium">{p.product_name}</TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-xs h-5">{p.category}</Badge>
                    </TableCell>
                    <TableCell className="py-2 text-center text-sm">
                      <Layers className="inline h-3.5 w-3.5 mr-1" />
                      {p.variant_count}
                    </TableCell>
                    <TableCell className="py-2 text-right text-sm">{p.total_quantity}</TableCell>
                    <TableCell className="py-2 text-right text-sm text-green-600 font-medium">
                      {formatCurrency(p.total_stock_value)}
                    </TableCell>
                    <TableCell className="py-2 text-right text-sm text-orange-600 font-medium">
                      {formatCurrency(p.total_sales_value || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
