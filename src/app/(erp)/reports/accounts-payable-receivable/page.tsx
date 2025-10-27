'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  ArrowLeft,
  Users,
  Building2,
  TrendingUp,
  TrendingDown,
  Download,
  Printer,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Banknote,
  RotateCcw,
  BarChart3,
  Calculator,
  CreditCard,
  Calendar,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { FloatingActionMenu } from '@/components/finance/FloatingActionMenu';

interface AccountSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  category?: 'supplier' | 'employee' | 'loan' | 'return';
}

interface LedgerData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  total_amount?: number;
  paid_amount?: number;
  status?: string;
}

interface ReturnData {
  id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  return_value?: number;
  status: string;
}

interface RefundData {
  id: string;
  return_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  refund_amount?: number;
  status: string;
}

export default function AccountsPayableReceivablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('receivable');
  const [receivables, setReceivables] = useState<AccountSummary[]>([]);
  const [payables, setPayables] = useState<AccountSummary[]>([]);
  const [expandedGroups, setExpandedGroups] = useState({
    supplier: true,
    employee: true,
    loan: true,
    return: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch Accounts Receivable (Customers)
      const receivablesResponse = await fetch('/api/finance/ledgers-summary?type=customer&limit=1000');
      if (receivablesResponse.ok) {
        const data = await receivablesResponse.json();
        const customers = (data.data || []).map((c: LedgerData) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          totalAmount: c.total_amount || 0,
          paidAmount: c.paid_amount || 0,
          balance: (c.total_amount || 0) - (c.paid_amount || 0),
          status: c.status || 'pending',
        }));
        setReceivables(customers.filter((c: AccountSummary) => c.balance > 0));
      }

      // Fetch Accounts Payable (Suppliers + Employees + Loans)
      const allPayables: AccountSummary[] = [];

      // Fetch Suppliers
      const suppliersResponse = await fetch('/api/finance/ledgers-summary?type=supplier&limit=1000');
      if (suppliersResponse.ok) {
        const data = await suppliersResponse.json();
        const suppliers = (data.data || [])
          .filter((s: LedgerData) => ((s.total_amount || 0) - (s.paid_amount || 0)) > 0)
          .map((s: LedgerData) => ({
            id: s.id,
            name: `${s.name}`,
            email: s.email,
            phone: s.phone,
            totalAmount: s.total_amount || 0,
            paidAmount: s.paid_amount || 0,
            balance: (s.total_amount || 0) - (s.paid_amount || 0),
            status: s.status || 'pending',
            category: 'supplier' as const,
          }));
        allPayables.push(...suppliers);
      }

      // Fetch Employees
      const employeesResponse = await fetch('/api/finance/ledgers-summary?type=employee&limit=1000');
      if (employeesResponse.ok) {
        const data = await employeesResponse.json();
        const employees = (data.data || [])
          .filter((e: LedgerData) => ((e.total_amount || 0) - (e.paid_amount || 0)) > 0)
          .map((e: LedgerData) => ({
            id: e.id,
            name: `${e.name}`,
            email: e.email,
            phone: e.phone,
            totalAmount: e.total_amount || 0,
            paidAmount: e.paid_amount || 0,
            balance: (e.total_amount || 0) - (e.paid_amount || 0),
            status: e.status || 'pending',
            category: 'employee' as const,
          }));
        allPayables.push(...employees);
      }

      // Fetch Loans
      const loansResponse = await fetch('/api/finance/ledgers-summary?type=loans&limit=1000');
      if (loansResponse.ok) {
        const data = await loansResponse.json();
        const loans = (data.data || [])
          .filter((l: LedgerData) => ((l.total_amount || 0) - (l.paid_amount || 0)) > 0)
          .map((l: LedgerData) => ({
            id: l.id,
            name: `${l.name}`,
            email: l.email || '',
            phone: l.phone || '',
            totalAmount: l.total_amount || 0,
            paidAmount: l.paid_amount || 0,
            balance: (l.total_amount || 0) - (l.paid_amount || 0),
            status: l.status || 'pending',
            category: 'loan' as const,
          }));
        allPayables.push(...loans);
      }

      // Fetch Pending Customer Returns/Refunds (these are liabilities - money owed to customers)
      const allPendingRefunds: AccountSummary[] = [];

      // First, fetch ALL invoice_refunds to build a refund tracking map
      const refundMap = new Map<string, number>(); // return_id → total refunded amount
      try {
        const allRefundsResponse = await fetch('/api/finance/refunds?limit=1000');
        console.log('🌐 Fetching ALL refunds:', allRefundsResponse.status, allRefundsResponse.ok);
        
        if (allRefundsResponse.ok) {
          const allRefundsData = await allRefundsResponse.json();
          const allRefunds = allRefundsData.refunds || allRefundsData.data || [];
          
          console.log('📦 Raw Refunds Data:', {
            hasRefundsKey: !!allRefundsData.refunds,
            hasDataKey: !!allRefundsData.data,
            refundsLength: allRefundsData.refunds?.length,
            dataLength: allRefundsData.data?.length,
            totalFromAPI: allRefundsData.pagination?.total,
            firstItem: allRefunds[0],
            allItems: allRefunds
          });
          
          // Sum up ALL refunds per return_id (regardless of status)
          // We count all refunds because they represent money already committed/processed
          allRefunds
            .filter((ref: RefundData) => {
              const hasReturnId = !!ref.return_id;
              // ✅ REMOVED STATUS FILTER - Count all refunds regardless of status
              console.log('🔍 Filtering refund:', {
                id: ref.id,
                return_id: ref.return_id,
                status: ref.status,
                refund_amount: ref.refund_amount,
                hasReturnId,
                willInclude: hasReturnId
              });
              return hasReturnId;
            })
            .forEach((ref: RefundData) => {
              const currentAmount = refundMap.get(ref.return_id!) || 0;
              refundMap.set(ref.return_id!, currentAmount + (ref.refund_amount || 0));
              console.log('💵 Adding to refund map:', {
                return_id: ref.return_id,
                refund_amount: ref.refund_amount,
                previousTotal: currentAmount,
                newTotal: currentAmount + (ref.refund_amount || 0)
              });
            });
          
          console.log('💰 Refund Map Built:', {
            totalRefunds: allRefunds.length,
            refundsWithReturnId: allRefunds.filter((r: RefundData) => !!r.return_id).length,
            refundsByStatus: allRefunds.reduce((acc: Record<string, number>, r: RefundData) => {
              acc[r.status || 'unknown'] = (acc[r.status || 'unknown'] || 0) + 1;
              return acc;
            }, {}),
            returnIdsWithRefunds: Array.from(refundMap.keys()).length,
            refundMapEntries: Object.fromEntries(refundMap),
            mapSize: refundMap.size,
            detailedEntries: Array.from(refundMap.entries()).map(([returnId, amount]) => ({
              return_id: returnId,
              total_refunded: amount
            }))
          });
          
          console.log('📋 REFUND MAP SUMMARY:');
          console.log('Total refunds in database:', allRefunds.length);
          console.log('Refunds with return_id:', allRefunds.filter((r: RefundData) => !!r.return_id).length);
          console.log('Refunds without return_id:', allRefunds.filter((r: RefundData) => !r.return_id).length);
          console.log('Unique returns with refunds:', refundMap.size);
          console.log('Refund map contents:', Object.fromEntries(refundMap));
        } else {
          console.error('❌ Failed to fetch refunds:', allRefundsResponse.status, allRefundsResponse.statusText);
        }
      } catch (error) {
        console.error('❌ Error fetching refund map:', error);
      }

      // 1. Fetch Sales Returns (pending/approved but not yet fully refunded)
      try {
        const returnsResponse = await fetch('/api/sales/returns?limit=1000');
        if (returnsResponse.ok) {
          const returnsData = await returnsResponse.json();
          
          console.log('📊 Returns Data Fetched:', {
            totalReturns: returnsData.returns?.length || 0,
            firstReturn: returnsData.returns?.[0],
            refundMapSize: refundMap.size,
            refundMapKeys: Array.from(refundMap.keys())
          });
          
          const pendingReturns = (returnsData.returns || [])
            .filter((r: ReturnData) => {
              if (!r.return_value || r.return_value <= 0) return false;
              // ✅ REMOVED STATUS FILTER - Show ALL returns regardless of status
              
              // Calculate refunded amount and balance
              const refundedAmount = refundMap.get(r.id) || 0;
              const balance = (r.return_value || 0) - refundedAmount;
              
              console.log('🎯 Processing Return:', {
                return_id: r.id,
                customer: r.customer_name,
                return_value: r.return_value,
                status: r.status,
                refundMapHasKey: refundMap.has(r.id),
                refundedAmount,
                balance,
                willInclude: balance > 0
              });
              
              // Only include if there's still a balance due
              return balance > 0;
            })
            .map((r: ReturnData) => {
              const refundedAmount = refundMap.get(r.id) || 0;
              const balance = (r.return_value || 0) - refundedAmount;
              
              console.log('✅ Mapping Return to Display:', {
                id: r.id,
                name: r.customer_name,
                totalAmount: r.return_value,
                paidAmount: refundedAmount,
                balance
              });
              
              return {
                id: r.id,
                name: `${r.customer_name || 'Unknown Customer'} (Return)`,
                email: r.customer_email || '',
                phone: r.customer_phone || '',
                totalAmount: r.return_value || 0,
                paidAmount: refundedAmount, // ✅ Real refunded amount from invoice_refunds
                balance: balance,
                status: r.status?.charAt(0).toUpperCase() + r.status?.slice(1) || 'Unknown', // Capitalize status
                category: 'return' as const,
              };
            });
          
          console.log('🔄 Sales Returns Processing Complete:', {
            totalReturns: returnsData.returns?.length || 0,
            pendingReturns: pendingReturns.length,
            pendingReturnsList: pendingReturns
          });
          
          allPendingRefunds.push(...pendingReturns);
        }
      } catch (error) {
        console.error('Error fetching sales returns:', error);
      }

      // 2. Fetch Invoice Refunds (pending/approved but not yet processed)
      // ⚠️ IMPORTANT: Only show refunds that are NOT linked to returns
      // Refunds with return_id are already counted in the returns section above
      try {
        const refundsResponse = await fetch('/api/finance/refunds?status=pending,approved&limit=1000');
        if (refundsResponse.ok) {
          const refundsData = await refundsResponse.json();
          console.log('🔍 Invoice Refunds API Response:', {
            totalRefunds: refundsData.refunds?.length || 0,
            pagination: refundsData.pagination,
            sample: refundsData.refunds?.[0]
          });
          
          const allRefundData = refundsData.refunds || refundsData.data || [];
          
          // ✅ FILTER: Only show refunds WITHOUT return_id (standalone refunds)
          const pendingRefunds = allRefundData
            .filter((ref: RefundData) => {
              const hasAmount = ref.refund_amount && ref.refund_amount > 0;
              const hasStatus = ref.status === 'pending' || ref.status === 'approved';
              const notLinkedToReturn = !ref.return_id; // ← KEY: Exclude refunds linked to returns
              
              console.log('🔍 Filtering standalone refund:', {
                id: ref.id,
                customer: ref.customer_name,
                amount: ref.refund_amount,
                status: ref.status,
                return_id: ref.return_id,
                hasAmount,
                hasStatus,
                notLinkedToReturn,
                willInclude: hasAmount && hasStatus && notLinkedToReturn
              });
              
              return hasAmount && hasStatus && notLinkedToReturn;
            })
            .map((ref: RefundData) => ({
              id: ref.id,
              name: `${ref.customer_name || 'Unknown Customer'} (Invoice Refund)`,
              email: ref.customer_email || '',
              phone: ref.customer_phone || '',
              totalAmount: ref.refund_amount || 0,
              paidAmount: 0, // Refunds not yet processed
              balance: ref.refund_amount || 0,
              status: ref.status === 'approved' ? 'Approved' : 'Pending',
              category: 'return' as const,
            }));
          
          console.log('✅ Standalone Invoice Refunds (NOT linked to returns):', {
            count: pendingRefunds.length,
            items: pendingRefunds
          });
          
          allPendingRefunds.push(...pendingRefunds);
        } else {
          console.log('❌ Invoice Refunds API failed:', refundsResponse.status);
        }
      } catch (error) {
        console.error('❌ Error fetching invoice refunds:', error);
        // If the endpoint doesn't exist, silently continue
      }

      // Add all pending refunds to payables
      allPayables.push(...allPendingRefunds);

      setPayables(allPayables);
    } catch (error) {
      console.error('Error fetching accounts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const totalReceivable = receivables.reduce((sum, r) => sum + r.balance, 0);
  const totalPayable = payables.reduce((sum, p) => sum + p.balance, 0);
  const netPosition = totalReceivable - totalPayable;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading accounts data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/reports')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Accounts Payable & Receivable</h1>
                <p className="text-sm text-gray-600 mt-1">
                  As of {format(new Date(), 'MMMM dd, yyyy')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Accounts Receivable</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{formatCurrency(totalReceivable)}</p>
                  <p className="text-xs text-green-600 mt-1">{receivables.length} Customers</p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Accounts Payable</p>
                  <p className="text-2xl font-bold text-red-900 mt-1">{formatCurrency(totalPayable)}</p>
                  <p className="text-xs text-red-600 mt-1">{payables.length} Suppliers</p>
                </div>
                <TrendingDown className="h-10 w-10 text-red-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${netPosition >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${netPosition >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    Net Position
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${netPosition >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                    {formatCurrency(netPosition)}
                  </p>
                  <p className={`text-xs mt-1 ${netPosition >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {netPosition >= 0 ? 'Positive Cash Flow' : 'Negative Cash Flow'}
                  </p>
                </div>
                <FileText className={`h-10 w-10 opacity-50 ${netPosition >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Receivable and Payable */}
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="receivable" className="gap-2">
                  <Users className="h-4 w-4" />
                  Accounts Receivable ({receivables.length})
                </TabsTrigger>
                <TabsTrigger value="payable" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Accounts Payable ({payables.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="receivable" className="mt-4">
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Customer Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="text-right">Total Invoiced</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance Due</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receivables.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No outstanding receivables
                          </TableCell>
                        </TableRow>
                      ) : (
                        receivables
                          .sort((a, b) => b.balance - a.balance)
                          .map((account) => (
                            <TableRow key={account.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{account.name}</TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {account.email && <div>{account.email}</div>}
                                {account.phone && <div>{account.phone}</div>}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(account.totalAmount)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-green-600">
                                {formatCurrency(account.paidAmount)}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold">
                                {formatCurrency(account.balance)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    account.paidAmount === 0
                                      ? 'bg-red-50 text-red-700 border-red-300'
                                      : account.balance === 0
                                      ? 'bg-green-50 text-green-700 border-green-300'
                                      : 'bg-orange-50 text-orange-700 border-orange-300'
                                  }
                                >
                                  {account.paidAmount === 0
                                    ? 'Unpaid'
                                    : account.balance === 0
                                    ? 'Paid'
                                    : 'Partial'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                      {receivables.length > 0 && (
                        <TableRow className="bg-green-50 font-bold border-t-2">
                          <TableCell colSpan={2}>TOTAL RECEIVABLE</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(receivables.reduce((s, a) => s + a.totalAmount, 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            {formatCurrency(receivables.reduce((s, a) => s + a.paidAmount, 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-lg">
                            {formatCurrency(totalReceivable)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="payable" className="mt-4">
                {payables.length === 0 ? (
                  <div className="rounded-lg border p-8 text-center text-gray-500">
                    No outstanding payables
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Suppliers Group */}
                    {payables.filter(p => p.category === 'supplier').length > 0 && (
                      <Card className="border-purple-200">
                        <CardHeader
                          className="cursor-pointer hover:bg-purple-50 transition-colors"
                          onClick={() => setExpandedGroups(prev => ({ ...prev, supplier: !prev.supplier }))}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Building2 className="h-6 w-6 text-purple-600" />
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">Suppliers</h3>
                                <p className="text-sm text-gray-600">
                                  {payables.filter(p => p.category === 'supplier').length} vendors •{' '}
                                  {formatCurrency(payables.filter(p => p.category === 'supplier').reduce((s, a) => s + a.balance, 0))} outstanding
                                </p>
                              </div>
                            </div>
                            {expandedGroups.supplier ? (
                              <ChevronUp className="h-5 w-5 text-gray-500" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                        </CardHeader>
                        {expandedGroups.supplier && (
                          <CardContent className="pt-0">
                            <div className="rounded-lg border">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-gray-50">
                                    <TableHead>Supplier Name</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead className="text-right">Total Bills</TableHead>
                                    <TableHead className="text-right">Paid</TableHead>
                                    <TableHead className="text-right">Balance Due</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {payables
                                    .filter(p => p.category === 'supplier')
                                    .sort((a, b) => b.balance - a.balance)
                                    .map((account) => (
                                      <TableRow key={account.id} className="hover:bg-gray-50">
                                        <TableCell className="font-medium">{account.name}</TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                          {account.email && <div>{account.email}</div>}
                                          {account.phone && <div>{account.phone}</div>}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                          {formatCurrency(account.totalAmount)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-green-600">
                                          {formatCurrency(account.paidAmount)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold">
                                          {formatCurrency(account.balance)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Badge
                                            variant="outline"
                                            className={
                                              account.paidAmount === 0
                                                ? 'bg-red-50 text-red-700 border-red-300'
                                                : account.balance === 0
                                                ? 'bg-green-50 text-green-700 border-green-300'
                                                : 'bg-orange-50 text-orange-700 border-orange-300'
                                            }
                                          >
                                            {account.paidAmount === 0
                                              ? 'Unpaid'
                                              : account.balance === 0
                                              ? 'Paid'
                                              : 'Partial'}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  <TableRow className="bg-purple-50 font-bold border-t-2">
                                    <TableCell colSpan={2}>SUBTOTAL - SUPPLIERS</TableCell>
                                    <TableCell className="text-right font-mono">
                                      {formatCurrency(payables.filter(p => p.category === 'supplier').reduce((s, a) => s + a.totalAmount, 0))}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-green-600">
                                      {formatCurrency(payables.filter(p => p.category === 'supplier').reduce((s, a) => s + a.paidAmount, 0))}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-lg">
                                      {formatCurrency(payables.filter(p => p.category === 'supplier').reduce((s, a) => s + a.balance, 0))}
                                    </TableCell>
                                    <TableCell></TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )}

                    {/* Employees Group */}
                    {payables.filter(p => p.category === 'employee').length > 0 && (
                      <Card className="border-green-200">
                        <CardHeader
                          className="cursor-pointer hover:bg-green-50 transition-colors"
                          onClick={() => setExpandedGroups(prev => ({ ...prev, employee: !prev.employee }))}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <UserCheck className="h-6 w-6 text-green-600" />
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">Employees</h3>
                                <p className="text-sm text-gray-600">
                                  {payables.filter(p => p.category === 'employee').length} employees •{' '}
                                  {formatCurrency(payables.filter(p => p.category === 'employee').reduce((s, a) => s + a.balance, 0))} outstanding
                                </p>
                              </div>
                            </div>
                            {expandedGroups.employee ? (
                              <ChevronUp className="h-5 w-5 text-gray-500" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                        </CardHeader>
                        {expandedGroups.employee && (
                          <CardContent className="pt-0">
                            <div className="rounded-lg border">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-gray-50">
                                    <TableHead>Employee Name</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead className="text-right">Total Salary</TableHead>
                                    <TableHead className="text-right">Paid</TableHead>
                                    <TableHead className="text-right">Balance Due</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {payables
                                    .filter(p => p.category === 'employee')
                                    .sort((a, b) => b.balance - a.balance)
                                    .map((account) => (
                                      <TableRow key={account.id} className="hover:bg-gray-50">
                                        <TableCell className="font-medium">{account.name}</TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                          {account.email && <div>{account.email}</div>}
                                          {account.phone && <div>{account.phone}</div>}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                          {formatCurrency(account.totalAmount)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-green-600">
                                          {formatCurrency(account.paidAmount)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold">
                                          {formatCurrency(account.balance)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Badge
                                            variant="outline"
                                            className={
                                              account.paidAmount === 0
                                                ? 'bg-red-50 text-red-700 border-red-300'
                                                : account.balance === 0
                                                ? 'bg-green-50 text-green-700 border-green-300'
                                                : 'bg-orange-50 text-orange-700 border-orange-300'
                                            }
                                          >
                                            {account.paidAmount === 0
                                              ? 'Unpaid'
                                              : account.balance === 0
                                              ? 'Paid'
                                              : 'Partial'}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  <TableRow className="bg-green-50 font-bold border-t-2">
                                    <TableCell colSpan={2}>SUBTOTAL - EMPLOYEES</TableCell>
                                    <TableCell className="text-right font-mono">
                                      {formatCurrency(payables.filter(p => p.category === 'employee').reduce((s, a) => s + a.totalAmount, 0))}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-green-600">
                                      {formatCurrency(payables.filter(p => p.category === 'employee').reduce((s, a) => s + a.paidAmount, 0))}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-lg">
                                      {formatCurrency(payables.filter(p => p.category === 'employee').reduce((s, a) => s + a.balance, 0))}
                                    </TableCell>
                                    <TableCell></TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )}

                    {/* Loans Group */}
                    {payables.filter(p => p.category === 'loan').length > 0 && (
                      <Card className="border-red-200">
                        <CardHeader
                          className="cursor-pointer hover:bg-red-50 transition-colors"
                          onClick={() => setExpandedGroups(prev => ({ ...prev, loan: !prev.loan }))}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Banknote className="h-6 w-6 text-red-600" />
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">Loans & Financing</h3>
                                <p className="text-sm text-gray-600">
                                  {payables.filter(p => p.category === 'loan').length} loans •{' '}
                                  {formatCurrency(payables.filter(p => p.category === 'loan').reduce((s, a) => s + a.balance, 0))} outstanding
                                </p>
                              </div>
                            </div>
                            {expandedGroups.loan ? (
                              <ChevronUp className="h-5 w-5 text-gray-500" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                        </CardHeader>
                        {expandedGroups.loan && (
                          <CardContent className="pt-0">
                            <div className="rounded-lg border">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-gray-50">
                                    <TableHead>Loan Account</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead className="text-right">Total Loan</TableHead>
                                    <TableHead className="text-right">Paid</TableHead>
                                    <TableHead className="text-right">Balance Due</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {payables
                                    .filter(p => p.category === 'loan')
                                    .sort((a, b) => b.balance - a.balance)
                                    .map((account) => (
                                      <TableRow key={account.id} className="hover:bg-gray-50">
                                        <TableCell className="font-medium">{account.name}</TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                          {account.email && <div>{account.email}</div>}
                                          {account.phone && <div>{account.phone}</div>}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                          {formatCurrency(account.totalAmount)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-green-600">
                                          {formatCurrency(account.paidAmount)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold">
                                          {formatCurrency(account.balance)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Badge
                                            variant="outline"
                                            className={
                                              account.paidAmount === 0
                                                ? 'bg-red-50 text-red-700 border-red-300'
                                                : account.balance === 0
                                                ? 'bg-green-50 text-green-700 border-green-300'
                                                : 'bg-orange-50 text-orange-700 border-orange-300'
                                            }
                                          >
                                            {account.paidAmount === 0
                                              ? 'Unpaid'
                                              : account.balance === 0
                                              ? 'Paid'
                                              : 'Partial'}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  <TableRow className="bg-red-50 font-bold border-t-2">
                                    <TableCell colSpan={2}>SUBTOTAL - LOANS</TableCell>
                                    <TableCell className="text-right font-mono">
                                      {formatCurrency(payables.filter(p => p.category === 'loan').reduce((s, a) => s + a.totalAmount, 0))}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-green-600">
                                      {formatCurrency(payables.filter(p => p.category === 'loan').reduce((s, a) => s + a.paidAmount, 0))}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-lg">
                                      {formatCurrency(payables.filter(p => p.category === 'loan').reduce((s, a) => s + a.balance, 0))}
                                    </TableCell>
                                    <TableCell></TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )}

                    {/* Customer Returns/Refunds Group */}
                    {payables.filter(p => p.category === 'return').length > 0 && (
                      <Card className="border-amber-200">
                        <CardHeader
                          className="cursor-pointer hover:bg-amber-50 transition-colors"
                          onClick={() => setExpandedGroups(prev => ({ ...prev, return: !prev.return }))}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <RotateCcw className="h-6 w-6 text-amber-600" />
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">Customer Returns & Refunds</h3>
                                <p className="text-sm text-gray-600">
                                  {payables.filter(p => p.category === 'return').length} pending refunds •{' '}
                                  {formatCurrency(payables.filter(p => p.category === 'return').reduce((s, a) => s + a.balance, 0))} outstanding
                                </p>
                              </div>
                            </div>
                            {expandedGroups.return ? (
                              <ChevronUp className="h-5 w-5 text-gray-500" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                        </CardHeader>
                        {expandedGroups.return && (
                          <CardContent className="pt-0">
                            <div className="rounded-lg border">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-gray-50">
                                    <TableHead>Customer Name</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead className="text-right">Return Value</TableHead>
                                    <TableHead className="text-right">Refunded</TableHead>
                                    <TableHead className="text-right">Balance Due</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {payables
                                    .filter(p => p.category === 'return')
                                    .sort((a, b) => b.balance - a.balance)
                                    .map((account) => (
                                      <TableRow key={account.id} className="hover:bg-gray-50">
                                        <TableCell className="font-medium">{account.name}</TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                          {account.email && <div>{account.email}</div>}
                                          {account.phone && <div>{account.phone}</div>}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                          {formatCurrency(account.totalAmount)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-green-600">
                                          {formatCurrency(account.paidAmount)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold">
                                          {formatCurrency(account.balance)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Badge
                                            variant="outline"
                                            className="bg-amber-50 text-amber-700 border-amber-300"
                                          >
                                            {account.status}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  <TableRow className="bg-amber-50 font-bold border-t-2">
                                    <TableCell colSpan={2}>SUBTOTAL - RETURNS</TableCell>
                                    <TableCell className="text-right font-mono">
                                      {formatCurrency(payables.filter(p => p.category === 'return').reduce((s, a) => s + a.totalAmount, 0))}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-green-600">
                                      {formatCurrency(payables.filter(p => p.category === 'return').reduce((s, a) => s + a.paidAmount, 0))}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-lg">
                                      {formatCurrency(payables.filter(p => p.category === 'return').reduce((s, a) => s + a.balance, 0))}
                                    </TableCell>
                                    <TableCell></TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )}

                    {/* Grand Total Card */}
                    <Card className="border-2 border-gray-300 bg-gray-50">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">GRAND TOTAL - ALL PAYABLES</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {payables.length} total accounts
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Total Outstanding</p>
                            <p className="text-3xl font-bold text-red-600">
                              {formatCurrency(totalPayable)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>


    </div>
  );
}
