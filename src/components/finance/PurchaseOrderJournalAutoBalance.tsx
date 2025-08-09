'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, DollarSign, FileText, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PurchaseOrderJournalData {
  total_purchase_orders: number;
  missing_journal_entries: number;
  purchase_orders: Array<{
    id: string;
    total: number;
    created_at: string;
    product_name?: string;
    description?: string;
    status: string;
  }>;
}

interface AutoBalanceResult {
  processed: number;
  successful: number;
  failed: number;
  results: Array<{
    purchase_order_id: string;
    journal_entry_id?: string;
    journal_number?: string;
    status: 'success' | 'failed';
    error?: string;
    total: number;
  }>;
}

export function PurchaseOrderJournalAutoBalance() {
  const [data, setData] = useState<PurchaseOrderJournalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<AutoBalanceResult | null>(null);

  const fetchMissingJournals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/accounting/purchase-order-journals');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        toast.error('Failed to fetch purchase order journal status');
      }
    } catch (error) {
      console.error('Error fetching missing journals:', error);
      toast.error('Error checking purchase order journals');
    } finally {
      setLoading(false);
    }
  };

  const createMissingJournals = async (specificIds?: string[]) => {
    try {
      setProcessing(true);
      const response = await fetch('/api/accounting/purchase-order-journals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_missing_journals',
          ...(specificIds && { purchase_order_ids: specificIds })
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setLastResult(result.data);
        toast.success(result.message);
        
        // Refresh the data
        await fetchMissingJournals();
      } else {
        toast.error(result.error || 'Failed to create journal entries');
      }
    } catch (error) {
      console.error('Error creating journal entries:', error);
      toast.error('Error creating journal entries');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchMissingJournals();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR' 
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Checking Purchase Order Journal Entries...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
              <p className="text-gray-600">Loading journal entry status...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load purchase order journal data. Please try again.
            </AlertDescription>
          </Alert>
          <Button onClick={fetchMissingJournals} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const missingCount = data.missing_journal_entries;
  const hasIssues = missingCount > 0;

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
      <CardHeader className={`${hasIssues ? 'bg-gradient-to-r from-orange-50 to-red-50' : 'bg-gradient-to-r from-green-50 to-blue-50'} border-b border-gray-100/50`}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={`flex items-center gap-2 text-xl font-bold bg-gradient-to-r ${
              hasIssues ? 'from-orange-600 to-red-600' : 'from-green-600 to-blue-600'
            } bg-clip-text text-transparent`}>
              {hasIssues ? (
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              Purchase Order Journal Entries
            </CardTitle>
            <p className="text-gray-600 mt-1">
              {hasIssues 
                ? `${missingCount} purchase orders need journal entries`
                : 'All purchase orders have journal entries'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchMissingJournals}
              disabled={processing}
              className="bg-white/60 backdrop-blur-sm border border-white/30"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Total POs</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {data.total_purchase_orders}
            </p>
          </div>
          
          <div className={`${hasIssues ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'} rounded-lg p-4 border`}>
            <div className="flex items-center gap-2">
              {hasIssues ? (
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              <span className={`font-medium ${hasIssues ? 'text-orange-900' : 'text-green-900'}`}>
                Missing Journals
              </span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${hasIssues ? 'text-orange-900' : 'text-green-900'}`}>
              {missingCount}
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-900">Total Value</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 mt-1">
              {formatCurrency(data.purchase_orders.reduce((sum, po) => sum + po.total, 0))}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {hasIssues && (
          <div className="mb-6">
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Some purchase orders are missing journal entries. This can affect your accounting accuracy.
                Click &quot;Auto-Balance All&quot; to automatically create the missing journal entries.
              </AlertDescription>
            </Alert>
            
            <Button
              onClick={() => createMissingJournals()}
              disabled={processing}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Auto-Balance All ({missingCount} POs)
            </Button>
          </div>
        )}

        {/* Last Result */}
        {lastResult && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-900 mb-2">Last Auto-Balance Result</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-green-700">Processed:</span>
                <span className="font-semibold ml-1">{lastResult.processed}</span>
              </div>
              <div>
                <span className="text-green-700">Successful:</span>
                <span className="font-semibold ml-1 text-green-800">{lastResult.successful}</span>
              </div>
              <div>
                <span className="text-green-700">Failed:</span>
                <span className="font-semibold ml-1 text-red-600">{lastResult.failed}</span>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Orders List */}
        {hasIssues && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Purchase Orders Missing Journal Entries
            </h3>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>PO ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.purchase_orders.slice(0, 10).map((po) => (
                    <TableRow key={po.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-xs">
                        {po.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {po.product_name || po.description || 'Custom Product'}
                      </TableCell>
                      <TableCell>{formatDate(po.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{po.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(po.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => createMissingJournals([po.id])}
                          disabled={processing}
                        >
                          {processing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Fix'
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {data.purchase_orders.length > 10 && (
                <div className="p-3 bg-gray-50 text-center text-sm text-gray-600">
                  ... and {data.purchase_orders.length - 10} more purchase orders
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
