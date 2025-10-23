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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-xl font-bold">{formatNumber(stats.total_items)}</p>
                <p className="text-xs text-gray-500 mt-1">{formatNumber(stats.total_products)} unique products</p>
              </div>
              <Box className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stock Value (MRP)</p>
                <p className="text-xl font-bold">{formatCurrency(stats.total_stock_value)}</p>
                <p className="text-xs text-gray-500 mt-1">Qty: {formatNumber(stats.total_quantity)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stock Cost</p>
                <p className="text-xl font-bold">{formatCurrency(stats.total_stock_cost)}</p>
                <p className="text-xs text-gray-500 mt-1">Purchase value</p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sales Value</p>
                <p className="text-xl font-bold">{formatCurrency(stats.total_sales_value)}</p>
                <p className="text-xs text-gray-500 mt-1">Total revenue</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex justify-between"><span>Product Summary</span><Button onClick={fetchSummary} variant="outline" size="sm"><RefreshCw className="h-4 w-4" /></Button></CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
            {loading ? <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Category</TableHead><TableHead className="text-center">Variants</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="text-right">Sales</TableHead></TableRow></TableHeader>
                <TableBody>{filteredData.map((p, i) => (
                  <TableRow key={i} className="cursor-pointer hover:bg-blue-50" onClick={() => router.push(`/inventory/product/${encodeURIComponent(p.product_name)}`)}>
                    <TableCell className="font-medium">{p.product_name}</TableCell>
                    <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                    <TableCell className="text-center"><Layers className="inline h-4 w-4 mr-1" />{p.variant_count}</TableCell>
                    <TableCell className="text-right">{p.total_quantity}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(p.total_stock_value)}</TableCell>
                    <TableCell className="text-right text-orange-600">{formatCurrency(p.total_sales_value || 0)}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
