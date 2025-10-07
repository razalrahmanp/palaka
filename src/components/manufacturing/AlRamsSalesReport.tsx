'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  CreditCard, 
  Search, 
  Eye,
  BarChart3,
  Target
} from 'lucide-react';

interface SalesOrderItem {
  id: string;
  product_id: string;
  custom_product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  supplier_name: string;
  supplier_id: string;
  sales_orders: {
    id: string;
    customer_id: string;
    customer: string;
    created_at: string;
    status: string;
    created_by: string;
    final_price: number;
    is_invoiced: boolean;
    payment_status: string;
    users?: {
      name: string;
      email: string;
    };
  };
}

interface SalespersonStats {
  userId: string;
  name: string;
  email: string;
  totalSales: number;
  totalRevenue: number;
  totalCommission: number;
  orderCount: number;
  avgOrderValue: number;
}

interface PaymentDetail {
  id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  status: string;
  reference_number: string;
}

interface AlRamsSalesReportProps {
  alRamsId: string;
}

export function AlRamsSalesReport({ alRamsId }: AlRamsSalesReportProps) {
  const [salesData, setSalesData] = useState<SalesOrderItem[]>([]);
  const [salespersonStats, setSalespersonStats] = useState<SalespersonStats[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('sales');
  
  const [overallStats, setOverallStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    avgOrderValue: 0,
    totalPaid: 0,
    totalPending: 0
  });

  const fetchAlRamsSalesData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Note: Analytics data could be used for additional insights
      
      // Fetch detailed sales order items for Al Rams
      const orderItemsResponse = await fetch(`/api/sales/orders/items?supplier_id=${alRamsId}`);
      const orderItemsData = await orderItemsResponse.json();
      
      if (orderItemsData.success) {
        setSalesData(orderItemsData.items || []);
        
        // Calculate overall stats
        const totalRevenue = orderItemsData.items?.reduce((sum: number, item: SalesOrderItem) => 
          sum + (item.total_price || 0), 0) || 0;
        const uniqueOrders = new Set(orderItemsData.items?.map((item: SalesOrderItem) => item.sales_orders?.id)).size;
        const totalProducts = orderItemsData.items?.reduce((sum: number, item: SalesOrderItem) => 
          sum + (item.quantity || 0), 0) || 0;
        
        // Calculate salesperson statistics
        const salespersonMap = new Map<string, SalespersonStats>();
        
        orderItemsData.items?.forEach((item: SalesOrderItem) => {
          const userId = item.sales_orders?.created_by;
          const userName = item.sales_orders?.users?.name || 'Unknown';
          const userEmail = item.sales_orders?.users?.email || '';
          
          if (userId) {
            if (!salespersonMap.has(userId)) {
              salespersonMap.set(userId, {
                userId,
                name: userName,
                email: userEmail,
                totalSales: 0,
                totalRevenue: 0,
                totalCommission: 0,
                orderCount: 0,
                avgOrderValue: 0
              });
            }
            
            const stats = salespersonMap.get(userId)!;
            stats.totalSales += item.quantity || 0;
            stats.totalRevenue += item.total_price || 0;
            stats.totalCommission += (item.total_price || 0) * 0.05; // 5% commission
            stats.orderCount += 1;
          }
        });
        
        // Calculate average order values
        const salespersonArray = Array.from(salespersonMap.values()).map(stats => ({
          ...stats,
          avgOrderValue: stats.orderCount > 0 ? stats.totalRevenue / stats.orderCount : 0
        }));
        
        setSalespersonStats(salespersonArray);
        
        setOverallStats({
          totalRevenue,
          totalOrders: uniqueOrders,
          totalProducts,
          avgOrderValue: uniqueOrders > 0 ? totalRevenue / uniqueOrders : 0,
          totalPaid: totalRevenue * 0.7, // Mock - 70% paid
          totalPending: totalRevenue * 0.3 // Mock - 30% pending
        });
      }
      
      // Fetch payment details
      const paymentsResponse = await fetch(`/api/sales/payments?supplier_id=${alRamsId}`);
      const paymentsData = await paymentsResponse.json();
      if (paymentsData.success) {
        setPaymentDetails(paymentsData.payments || []);
      }
      
    } catch (error) {
      console.error('Error fetching Al Rams sales data:', error);
    } finally {
      setLoading(false);
    }
  }, [alRamsId]);

  useEffect(() => {
    if (alRamsId) {
      fetchAlRamsSalesData();
    }
  }, [alRamsId, fetchAlRamsSalesData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
      case 'partial':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredSalesData = salesData.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sales_orders?.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sales_orders?.users?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSalespersonStats = salespersonStats.filter(person =>
    person.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPaymentDetails = paymentDetails.filter(payment =>
    payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.payment_method?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading Al Rams sales data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(overallStats.totalRevenue)}</p>
              </div>
              <div className="h-8 w-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-xl font-bold text-gray-900">{overallStats.totalOrders}</p>
              </div>
              <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Products Sold</p>
                <p className="text-xl font-bold text-gray-900">{overallStats.totalProducts}</p>
              </div>
              <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(overallStats.avgOrderValue)}</p>
              </div>
              <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Target className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Amount Paid</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(overallStats.totalPaid)}</p>
              </div>
              <div className="h-8 w-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Amount Pending</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(overallStats.totalPending)}</p>
              </div>
              <div className="h-8 w-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-xl border-b border-emerald-100/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Al Rams Sales Analytics
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sales">Sales Details</TabsTrigger>
              <TabsTrigger value="salespeople">Salesperson Performance</TabsTrigger>
              <TabsTrigger value="payments">Payment Details</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="mt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Salesperson</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSalesData.map((item) => (
                      <TableRow key={item.id} className="hover:bg-emerald-50/50 transition-colors">
                        <TableCell>
                          <span className="font-medium text-gray-900">{item.name}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-600">{item.sales_orders?.customer}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{item.quantity}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{formatCurrency(item.unit_price)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">{formatCurrency(item.total_price)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-600">{item.sales_orders?.users?.name || 'Unknown'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {new Date(item.sales_orders?.created_at).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(item.sales_orders?.status)} px-2 py-1 rounded-full font-medium`}>
                            {item.sales_orders?.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="salespeople" className="mt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableRow>
                      <TableHead>Salesperson</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Products Sold</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Avg Order Value</TableHead>
                      <TableHead>Commission (5%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSalespersonStats.map((person) => (
                      <TableRow key={person.userId} className="hover:bg-blue-50/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {person.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">{person.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-600">{person.email}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{person.orderCount}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{person.totalSales}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">{formatCurrency(person.totalRevenue)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{formatCurrency(person.avgOrderValue)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-blue-600">{formatCurrency(person.totalCommission)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="payments" className="mt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPaymentDetails.length > 0 ? (
                      filteredPaymentDetails.map((payment) => (
                        <TableRow key={payment.id} className="hover:bg-green-50/50 transition-colors">
                          <TableCell>
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {payment.id.slice(0, 8)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{payment.order_id?.slice(0, 8)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-green-600">{formatCurrency(payment.amount)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-600">{payment.payment_method}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-500">
                              {new Date(payment.payment_date).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{payment.reference_number}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(payment.status)} px-2 py-1 rounded-full font-medium`}>
                              {payment.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="text-gray-500">No payment details found</div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}