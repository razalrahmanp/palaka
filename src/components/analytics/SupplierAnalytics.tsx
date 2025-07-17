
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, IndianRupee, Truck, Package, PackageCheck, FileText } from 'lucide-react';

// --- Helper Functions ---
const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// --- Reusable KPI Card ---
const KpiCard = ({ title, value, icon: Icon, format = 'number' }: { title: string; value: number; icon: React.ElementType; format?: 'currency' | 'percent' | 'number' }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {format === 'currency' && '₹'}
        {(value || 0).toLocaleString('en-IN', { minimumFractionDigits: format === 'percent' ? 1 : 2, maximumFractionDigits: 2 })}
        {format === 'percent' && '%'}
      </div>
    </CardContent>
  </Card>
);

// --- Type Definitions for Vendor Details ---
interface KpiData {
  items_sold: number;
  in_stock: number;
  new_pos: number;
  amount_pending: number;
}
interface ItemSold { name: string; quantity_sold: number; }
interface StockItem { name: string; stock_level: number; }
interface PurchaseOrder { id: string; status: string; total: number; created_at: string; }
interface VendorDetailsData {
  kpis: KpiData;
  items_sold_list: ItemSold[];
  in_stock_list: StockItem[];
  new_pos_list: PurchaseOrder[];
}

// --- API Fetching Functions ---
const fetchSupplierListData = async () => {
    const res = await fetch('/api/analytics/suppliers');
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'Failed to fetch supplier data');
    }
    return res.json();
};

const fetchVendorDetails = async (vendorId: string): Promise<VendorDetailsData> => {
    if (!vendorId) throw new Error("Vendor ID is required.");
    const res = await fetch(`/api/analytics/vendor-details?vendorId=${vendorId}`);
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'Failed to fetch vendor details');
    }
    return res.json();
};


// --- Vendor Detail View Component ---
function VendorDetailDashboard({ vendorId, vendorName, onBackClick }: { vendorId: string; vendorName: string; onBackClick: () => void; }) {
    const { data, isLoading, isError, error } = useQuery<VendorDetailsData, Error>({
        queryKey: ['vendorDetails', vendorId],
        queryFn: () => fetchVendorDetails(vendorId),
        enabled: !!vendorId,
    });

    if (isLoading) return <div className="p-4">Loading Vendor Details...</div>;
    if (isError) return <div className="p-4 text-red-500">Error: {error.message}</div>;
    if (!data) return <div className="p-4">No data available for this vendor.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={onBackClick}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold">Vendor Analytics: {vendorName}</h1>
            </div>
            
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Total Items Sold" value={data.kpis.items_sold} icon={PackageCheck} />
                <KpiCard title="Total Items In Stock" value={data.kpis.in_stock} icon={Package} />
                <KpiCard title="New Purchase Orders" value={data.kpis.new_pos} icon={FileText} />
                <KpiCard title="Pending PO Amount" value={data.kpis.amount_pending} icon={IndianRupee} format="currency" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card><CardHeader><CardTitle>Top Sold Items</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Units Sold</TableHead></TableRow></TableHeader><TableBody>{data.items_sold_list.map((item) => (<TableRow key={item.name}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.quantity_sold}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
                <Card><CardHeader><CardTitle>Current Stock</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Stock Level</TableHead></TableRow></TableHeader><TableBody>{data.in_stock_list.map((item) => (<TableRow key={item.name}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.stock_level}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
                <div className="lg:col-span-2"><Card><CardHeader><CardTitle>Recent Pending POs</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>PO Number</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{data.new_pos_list.map((po) => (<TableRow key={po.id}><TableCell className="font-mono text-sm">{po.id.substring(0, 8)}</TableCell><TableCell><Badge variant="outline">{po.status}</Badge></TableCell><TableCell>{formatDate(po.created_at)}</TableCell><TableCell className="text-right">{formatCurrency(po.total)}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card></div>
            </div>
        </div>
    );
}

// --- Main Supplier Analytics Component (List View) ---
export default function SupplierAnalytics() {
    const [viewMode, setViewMode] = useState('table');
    const [selectedVendor, setSelectedVendor] = useState<{ id: string; name: string } | null>(null);
    
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['supplierAnalyticsData'],
        queryFn: fetchSupplierListData,
        enabled: !selectedVendor, // Only fetch list data if no vendor is selected
    });

    const handleRowClick = (supplier: { id: string; name: string }) => {
        setSelectedVendor(supplier);
    };

    // If a vendor is selected, render the detail view
    if (selectedVendor) {
        return <VendorDetailDashboard 
                    vendorId={selectedVendor.id} 
                    vendorName={selectedVendor.name} 
                    onBackClick={() => setSelectedVendor(null)} 
                />;
    }

    // Otherwise, render the main list view
    if (isLoading) return <div className="p-4">Loading Supplier Analytics...</div>;
    if (isError) return <div className="p-4 text-red-500">Error: {(error as Error).message}</div>;
    if (!data) return <div className="p-4">No data available.</div>;

    const renderContent = () => {
        if (viewMode === 'chart') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle>Top 5 Suppliers by Spend</CardTitle></CardHeader>
                        <CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={data.topSuppliersBySpend} layout="vertical" margin={{ right: 30, left: 20 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={(value) => formatCurrency(value as number)} /><YAxis dataKey="name" type="category" width={100} /><Tooltip formatter={(value: number) => formatCurrency(value)} /><Legend /><Bar dataKey="spend" name="Total Spend" fill="#8884d8" /></BarChart></ResponsiveContainer></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>On-Time Delivery Performance</CardTitle></CardHeader>
                        <CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={data.onTimeDelivery} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} /><Tooltip formatter={(value: number) => `${(value || 0).toFixed(2)}%`} /><Legend /><Bar dataKey="performance" name="On-Time %" fill="#82ca9d" /></BarChart></ResponsiveContainer></CardContent>
                    </Card>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Top 5 Suppliers by Spend</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead className="text-right">Total Spend</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {data.topSuppliersBySpend.map((item: { id: string; name: string; spend: number }) => (
                                    <TableRow key={item.id} onClick={() => handleRowClick(item)} className="cursor-pointer hover:bg-muted/50">
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.spend)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>On-Time Delivery Performance</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead className="text-right">On-Time Rate</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {data.onTimeDelivery.map((item: { id: string; name: string; performance: number }) => (
                                    <TableRow key={item.id} onClick={() => handleRowClick(item)} className="cursor-pointer hover:bg-muted/50">
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right">{(item.performance || 0).toFixed(2)}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="grid gap-4 md:grid-cols-2">
                <KpiCard title="Total Supplier Spend" value={data.kpis.totalSpend} icon={IndianRupee} format="currency" />
                <KpiCard title="Average On-Time Delivery" value={data.kpis.averageOnTimeDelivery} icon={Truck} format="percent" />
            </div>
            <Tabs defaultValue="table" onValueChange={setViewMode} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chart">Chart View</TabsTrigger>
                    <TabsTrigger value="table">Table View</TabsTrigger>
                </TabsList>
                <TabsContent value="chart" className="mt-4">{renderContent()}</TabsContent>
                <TabsContent value="table" className="mt-4">{renderContent()}</TabsContent>
            </Tabs>
        </div>
    );
}
