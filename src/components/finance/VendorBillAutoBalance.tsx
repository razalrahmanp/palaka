'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, DollarSign, FileText, Loader2, RefreshCw, Receipt } from 'lucide-react';
import { toast } from 'sonner';

interface VendorBillData {
  total_purchase_orders: number;
  missing_vendor_bills: number;
  approved_pos_without_bills: Array<{
    id: string;
    total: number;
    created_at: string;
    status: string;
    supplier_name?: string;
    product_name?: string;
    description?: string;
  }>;
}

interface VendorBillCreationResult {
  processed: number;
  successful: number;
  failed: number;
  results: Array<{
    purchase_order_id: string;
    vendor_bill_id?: string;
    bill_number?: string;
    status: 'success' | 'failed';
    error?: string;
    total: number;
  }>;
}

export function VendorBillAutoBalance() {
  const [data, setData] = useState<VendorBillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<VendorBillCreationResult | null>(null);

  const fetchMissingVendorBills = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/accounting/vendor-bills-auto-balance');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        toast.error('Failed to fetch vendor bill status');
      }
    } catch (error) {
      console.error('Error fetching missing vendor bills:', error);
      toast.error('Error checking vendor bills');
    } finally {
      setLoading(false);
    }
  };

  const createMissingVendorBills = async (specificIds?: string[]) => {
    try {
      setProcessing(true);
      const response = await fetch('/api/accounting/vendor-bills-auto-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_missing_vendor_bills',
          ...(specificIds && { purchase_order_ids: specificIds })
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setLastResult(result.data);
        toast.success(result.message);
        
        // Refresh the data
        await fetchMissingVendorBills();
      } else {
        toast.error(result.error || 'Failed to create vendor bills');
      }
    } catch (error) {
      console.error('Error creating vendor bills:', error);
      toast.error('Error creating vendor bills');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchMissingVendorBills();
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
            Checking Vendor Bills Status...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
              <p className="text-gray-600">Loading vendor bill status...</p>
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
              Failed to load vendor bill data. Please try again.
            </AlertDescription>
          </Alert>
          <Button onClick={fetchMissingVendorBills} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const missingCount = data.missing_vendor_bills;
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
              Purchase Order → Vendor Bills
            </CardTitle>
            <p className="text-gray-600 mt-1">
              {hasIssues 
                ? `${missingCount} approved POs need vendor bills`
                : 'All approved POs have vendor bills'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchMissingVendorBills}
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
              <span className="font-medium text-blue-900">Total Approved POs</span>
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
                Missing Vendor Bills
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
              {formatCurrency(data.approved_pos_without_bills.reduce((sum, po) => sum + po.total, 0))}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {hasIssues && (
          <div className="mb-6">
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Some approved purchase orders don&apos;t have vendor bills. This affects accounts payable tracking.
                Click &quot;Create Missing Vendor Bills&quot; to automatically create them.
              </AlertDescription>
            </Alert>
            
            <Button
              onClick={() => createMissingVendorBills()}
              disabled={processing}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Receipt className="h-4 w-4 mr-2" />
              )}
              Create Missing Vendor Bills ({missingCount} POs)
            </Button>
          </div>
        )}

        {/* Last Result */}
        {lastResult && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-900 mb-2">Last Vendor Bill Creation Result</h3>
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
              Approved Purchase Orders Missing Vendor Bills
            </h3>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>PO ID</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.approved_pos_without_bills.slice(0, 10).map((po) => (
                    <TableRow key={po.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-xs">
                        {po.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {po.supplier_name || 'Unknown Supplier'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {po.product_name || po.description || 'Custom Product'}
                      </TableCell>
                      <TableCell>{formatDate(po.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(po.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => createMissingVendorBills([po.id])}
                          disabled={processing}
                        >
                          {processing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Create Bill'
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {data.approved_pos_without_bills.length > 10 && (
                <div className="p-3 bg-gray-50 text-center text-sm text-gray-600">
                  ... and {data.approved_pos_without_bills.length - 10} more purchase orders
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
