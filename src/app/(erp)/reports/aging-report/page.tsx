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
  Download,
  Printer,
  RefreshCw,
  AlertTriangle,
  Clock,
  TrendingUp,
  BarChart3,
  Calculator,
  CreditCard,
  Users,
  Calendar,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FloatingActionMenu } from '@/components/finance/FloatingActionMenu';

interface AgingBucket {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days90Plus: number;
  total: number;
  orderTotal: number;
  paidAmount: number;
}

interface AgingAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days90Plus: number;
  total: number;
  orderTotal?: number;
  billTotal?: number;
  paidAmount: number;
  oldestInvoice: string;
}

interface ApiAgingAccount {
  id?: string;
  customerId?: string;
  vendorId?: string;
  name?: string;
  customer?: string;
  vendor?: string;
  contact: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  totalDue: number;
  orderTotal?: number;
  billTotal?: number;
  paidAmount: number;
  oldestInvoiceDate?: string;
  oldestBillDate?: string;
}

export default function AgingReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'receivables' | 'payables'>('receivables');
  const [receivables, setReceivables] = useState<AgingAccount[]>([]);
  const [payables, setPayables] = useState<AgingAccount[]>([]);

  useEffect(() => {
    fetchAgingData();
  }, []);

  const fetchAgingData = async () => {
    try {
      setLoading(true);
      const [receivablesRes, payablesRes] = await Promise.all([
        fetch('/api/finance/aging-report?type=receivables'),
        fetch('/api/finance/aging-report?type=payables'),
      ]);

      if (receivablesRes.ok) {
        const data = await receivablesRes.json();
        // Map API response to frontend interface
        const mappedReceivables = (data.accounts || []).map((account: ApiAgingAccount) => ({
          id: account.customerId || account.id,
          name: account.customer || account.name,
          email: account.contact?.includes('@') ? account.contact : '',
          phone: account.contact && !account.contact.includes('@') ? account.contact : '',
          current: account.current || 0,
          days30: account.days1to30 || 0,
          days60: account.days31to60 || 0,
          days90: account.days61to90 || 0,
          days90Plus: account.days90plus || 0,
          total: account.totalDue || 0,
          orderTotal: account.orderTotal || 0,
          paidAmount: account.paidAmount || 0,
          oldestInvoice: account.oldestInvoiceDate || account.oldestBillDate || '',
        }));
        setReceivables(mappedReceivables);
      }
      if (payablesRes.ok) {
        const data = await payablesRes.json();
        // Map API response to frontend interface
        const mappedPayables = (data.accounts || []).map((account: ApiAgingAccount) => ({
          id: account.vendorId || account.id,
          name: account.vendor || account.name,
          email: account.contact?.includes('@') ? account.contact : '',
          phone: account.contact && !account.contact.includes('@') ? account.contact : '',
          current: account.current || 0,
          days30: account.days1to30 || 0,
          days60: account.days31to60 || 0,
          days90: account.days61to90 || 0,
          days90Plus: account.days90plus || 0,
          total: account.totalDue || 0,
          billTotal: account.billTotal || 0,
          paidAmount: account.paidAmount || 0,
          oldestInvoice: account.oldestBillDate || account.oldestInvoiceDate || '',
        }));
        setPayables(mappedPayables);
      }
    } catch (error) {
      console.error('Error fetching aging data:', error);
      setReceivables([]);
      setPayables([]);
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

  const calculateTotals = (accounts: AgingAccount[]) => {
    return accounts.reduce(
      (totals, account) => ({
        current: totals.current + account.current,
        days30: totals.days30 + account.days30,
        days60: totals.days60 + account.days60,
        days90: totals.days90 + account.days90,
        days90Plus: totals.days90Plus + account.days90Plus,
        total: totals.total + account.total,
        orderTotal: totals.orderTotal + (account.orderTotal || account.billTotal || 0),
        paidAmount: totals.paidAmount + (account.paidAmount || 0),
      }),
      { current: 0, days30: 0, days60: 0, days90: 0, days90Plus: 0, total: 0, orderTotal: 0, paidAmount: 0 }
    );
  };

  const receivablesTotals = calculateTotals(receivables);
  const payablesTotals = calculateTotals(payables);

  const getAgingPercentage = (bucketAmount: number, total: number) => {
    return total > 0 ? ((bucketAmount / total) * 100).toFixed(1) : '0.0';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading aging report...</p>
      </div>
    );
  }

  const renderAgingTable = (accounts: AgingAccount[], totals: AgingBucket, type: string) => (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-48">{type === 'receivables' ? 'Customer' : 'Supplier'}</TableHead>
            <TableHead className="w-32">Contact</TableHead>
            <TableHead className="text-right w-28">{type === 'receivables' ? 'Order Value' : 'Bill Value'}</TableHead>
            <TableHead className="text-right w-28">Paid</TableHead>
            <TableHead className="text-right w-28">Pending</TableHead>
            <TableHead className="text-right w-28">Current</TableHead>
            <TableHead className="text-right w-28">1-30 Days</TableHead>
            <TableHead className="text-right w-28">31-60 Days</TableHead>
            <TableHead className="text-right w-28">61-90 Days</TableHead>
            <TableHead className="text-right w-28">90+ Days</TableHead>
            <TableHead className="text-right w-28">Total Due</TableHead>
            <TableHead className="w-24">Oldest</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="text-center py-12 text-gray-500">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium">No {type} aging data available</p>
                <p className="text-sm mt-1">There are no outstanding {type} to analyze</p>
              </TableCell>
            </TableRow>
          ) : (
            <>
              {accounts
                .sort((a, b) => b.total - a.total)
                .map((account) => (
                  <TableRow key={account.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{account.name}</p>
                        {account.email && (
                          <p className="text-xs text-gray-500">{account.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{account.phone || '-'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(account.orderTotal || account.billTotal || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-green-600">
                      {formatCurrency(account.paidAmount || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-blue-600">
                      {formatCurrency(account.total || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {account.current > 0 ? formatCurrency(account.current) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {account.days30 > 0 ? (
                        <span className="text-yellow-600">{formatCurrency(account.days30)}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {account.days60 > 0 ? (
                        <span className="text-orange-600">{formatCurrency(account.days60)}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {account.days90 > 0 ? (
                        <span className="text-red-600">{formatCurrency(account.days90)}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {account.days90Plus > 0 ? (
                        <span className="text-red-700 font-semibold">{formatCurrency(account.days90Plus)}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatCurrency(account.total)}
                    </TableCell>
                    <TableCell>
                      {account.oldestInvoice && (
                        <Badge variant="outline" className="text-xs">
                          {account.oldestInvoice}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              <TableRow className="bg-blue-50 font-bold border-t-2">
                <TableCell colSpan={2} className="text-right font-bold">
                  TOTALS
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-sm">
                  {formatCurrency(totals.orderTotal || 0)}
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-sm text-green-600">
                  {formatCurrency(totals.paidAmount || 0)}
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-sm text-blue-600">
                  {formatCurrency(totals.total)}
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-sm">
                  {formatCurrency(totals.current)}
                  <div className="text-xs text-gray-600 font-normal">
                    {getAgingPercentage(totals.current, totals.total)}%
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-sm text-yellow-600">
                  {formatCurrency(totals.days30)}
                  <div className="text-xs text-gray-600 font-normal">
                    {getAgingPercentage(totals.days30, totals.total)}%
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-sm text-orange-600">
                  {formatCurrency(totals.days60)}
                  <div className="text-xs text-gray-600 font-normal">
                    {getAgingPercentage(totals.days60, totals.total)}%
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-sm text-red-600">
                  {formatCurrency(totals.days90)}
                  <div className="text-xs text-gray-600 font-normal">
                    {getAgingPercentage(totals.days90, totals.total)}%
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-sm text-red-700">
                  {formatCurrency(totals.days90Plus)}
                  <div className="text-xs text-gray-600 font-normal">
                    {getAgingPercentage(totals.days90Plus, totals.total)}%
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-lg text-blue-600">
                  {formatCurrency(totals.total)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );

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
                <h1 className="text-2xl font-bold text-gray-900">Aging Report</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Account aging analysis by payment due date
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchAgingData} className="gap-2">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-green-600">Accounts Receivable Aging</p>
                  <p className="text-3xl font-bold text-green-900 mt-1">
                    {formatCurrency(receivablesTotals.total)}
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-600 opacity-50" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Current:</span>
                  <span className="font-semibold">{formatCurrency(receivablesTotals.current)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-700">1-30 Days:</span>
                  <span className="font-semibold text-yellow-700">{formatCurrency(receivablesTotals.days30)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-orange-700">31-60 Days:</span>
                  <span className="font-semibold text-orange-700">{formatCurrency(receivablesTotals.days60)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-700">61-90 Days:</span>
                  <span className="font-semibold text-red-700">{formatCurrency(receivablesTotals.days90)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-red-800 font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    90+ Days:
                  </span>
                  <span className="font-bold text-red-800">{formatCurrency(receivablesTotals.days90Plus)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-red-600">Accounts Payable Aging</p>
                  <p className="text-3xl font-bold text-red-900 mt-1">
                    {formatCurrency(payablesTotals.total)}
                  </p>
                </div>
                <Clock className="h-10 w-10 text-red-600 opacity-50" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-red-700">Current:</span>
                  <span className="font-semibold">{formatCurrency(payablesTotals.current)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-700">1-30 Days:</span>
                  <span className="font-semibold text-yellow-700">{formatCurrency(payablesTotals.days30)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-orange-700">31-60 Days:</span>
                  <span className="font-semibold text-orange-700">{formatCurrency(payablesTotals.days60)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-700">61-90 Days:</span>
                  <span className="font-semibold text-red-700">{formatCurrency(payablesTotals.days90)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-red-800 font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    90+ Days:
                  </span>
                  <span className="font-bold text-red-800">{formatCurrency(payablesTotals.days90Plus)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Aging Tables */}
        <Card>
          <CardHeader>
            <CardTitle>Aging Analysis Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'receivables' | 'payables')}>
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="receivables">
                  Accounts Receivable
                  {receivables.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {receivables.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="payables">
                  Accounts Payable
                  {payables.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {payables.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="receivables" className="mt-4">
                {renderAgingTable(receivables, receivablesTotals, 'receivables')}
              </TabsContent>
              <TabsContent value="payables" className="mt-4">
                {renderAgingTable(payables, payablesTotals, 'payables')}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Note about API */}
        {receivables.length === 0 && payables.length === 0 && !loading && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> The Aging Report API endpoint needs to be implemented. 
                Create <code className="bg-yellow-100 px-1 py-0.5 rounded">/api/finance/aging-report</code> to calculate account aging based on invoice due dates.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <FloatingActionMenu actions={[
        {
          id: 'profit-loss',
          label: 'Profit & Loss Statement',
          icon: React.createElement(TrendingUp, { className: "h-5 w-5 text-white" }),
          onClick: () => router.push('/reports/profit-loss'),
          color: 'bg-blue-600',
          hoverColor: 'hover:bg-blue-700',
        },
        {
          id: 'trial-balance',
          label: 'Trial Balance',
          icon: React.createElement(Calculator, { className: "h-5 w-5 text-white" }),
          onClick: () => router.push('/reports/trial-balance'),
          color: 'bg-blue-600',
          hoverColor: 'hover:bg-blue-700',
        },
        {
          id: 'cash-flow',
          label: 'Cash Flow Statement',
          icon: React.createElement(CreditCard, { className: "h-5 w-5 text-white" }),
          onClick: () => router.push('/reports/cash-flow'),
          color: 'bg-blue-600',
          hoverColor: 'hover:bg-blue-700',
        },
        {
          id: 'balance-sheet',
          label: 'Balance Sheet',
          icon: React.createElement(BarChart3, { className: "h-5 w-5 text-white" }),
          onClick: () => router.push('/reports/balance-sheet'),
          color: 'bg-blue-600',
          hoverColor: 'hover:bg-blue-700',
        },
        {
          id: 'accounts-payable-receivable',
          label: 'Accounts Payable & Receivable',
          icon: React.createElement(Users, { className: "h-5 w-5 text-white" }),
          onClick: () => router.push('/reports/accounts-payable-receivable'),
          color: 'bg-blue-600',
          hoverColor: 'hover:bg-blue-700',
        },
        {
          id: 'day-sheet',
          label: 'Day Sheet',
          icon: React.createElement(Calendar, { className: "h-5 w-5 text-white" }),
          onClick: () => router.push('/reports/day-sheet'),
          color: 'bg-blue-600',
          hoverColor: 'hover:bg-blue-700',
        },
        {
          id: 'aging-report',
          label: 'Aging Report',
          icon: React.createElement(Clock, { className: "h-5 w-5 text-white" }),
          onClick: () => router.push('/reports/aging-report'),
          color: 'bg-blue-600',
          hoverColor: 'hover:bg-blue-700',
        },
      ]} />
    </div>
  );
}
