'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  User, 
  Package, 
  DollarSign, 
  AlertCircle,
  CheckCircle 
} from 'lucide-react';
import { SalesOrder } from '@/types';
import { toast } from 'sonner';

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesOrder: SalesOrder | null;
  onSuccess: () => void;
}

export function CreateInvoiceDialog({ 
  open, 
  onOpenChange, 
  salesOrder, 
  onSuccess 
}: CreateInvoiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    amount: 0,
    notes: '',
    due_date: '',
    invoice_number: ''
  });

  useEffect(() => {
    if (salesOrder && open) {
      // Calculate remaining amount to invoice
      const totalAmount = salesOrder.final_price || salesOrder.total_price;
      const alreadyInvoiced = salesOrder.invoices?.reduce((sum: number, inv: { total: number }) => sum + inv.total, 0) || 0;
      const remainingAmount = totalAmount - alreadyInvoiced;

      setInvoiceData({
        amount: remainingAmount,
        notes: `Invoice for Sales Order ${salesOrder.id.slice(0, 8)}`,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        invoice_number: `INV-${Date.now()}`
      });
    }
  }, [salesOrder, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salesOrder) return;

    setLoading(true);
    try {
      const response = await fetch('/api/finance/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sales_order_id: salesOrder.id,
          customer_id: salesOrder.customer_id,
          customer_name: salesOrder.customer?.name || 'Unknown Customer',
          total: invoiceData.amount,
          invoice_number: invoiceData.invoice_number,
          due_date: invoiceData.due_date,
          notes: invoiceData.notes,
          status: 'unpaid',
          paid_amount: 0
        }),
      });

      if (response.ok) {
        toast.success('Invoice created successfully');
        onSuccess();
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (!salesOrder) return null;

  const totalAmount = salesOrder.final_price || salesOrder.total_price;
  const alreadyInvoiced = salesOrder.invoices?.reduce((sum: number, inv: { total: number }) => sum + inv.total, 0) || 0;
  const remainingAmount = totalAmount - alreadyInvoiced;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Invoice for Sales Order
          </DialogTitle>
        </DialogHeader>

        {/* Sales Order Summary */}
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Order Details</span>
                </div>
                <p className="text-sm text-gray-600">Order ID: {salesOrder.id.slice(0, 8)}</p>
                <p className="text-sm text-gray-600">Date: {new Date(salesOrder.created_at).toLocaleDateString()}</p>
                <p className="text-sm text-gray-600">Status: <Badge variant="outline">{salesOrder.status}</Badge></p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Customer</span>
                </div>
                <p className="text-sm text-gray-600">{salesOrder.customer?.name || 'Unknown Customer'}</p>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-purple-500" />
                  <span className="font-medium text-sm">Total Order</span>
                </div>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-sm">Already Invoiced</span>
                </div>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(alreadyInvoiced)}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-sm">Remaining</span>
                </div>
                <p className="text-lg font-bold text-orange-600">
                  {formatCurrency(remainingAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoice_number">Invoice Number</Label>
              <Input
                id="invoice_number"
                value={invoiceData.invoice_number}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, invoice_number: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={invoiceData.due_date}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, due_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="amount">Invoice Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              max={remainingAmount}
              value={invoiceData.amount}
              onChange={(e) => setInvoiceData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum available: {formatCurrency(remainingAmount)}
            </p>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={invoiceData.notes}
              onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes for this invoice..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
