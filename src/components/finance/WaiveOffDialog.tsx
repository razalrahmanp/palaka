'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, DollarSign, Minus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WaiveOffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderId?: string;
  invoiceId?: string;
  availableBalance: number;
  customerName: string;
  type: 'order' | 'invoice';
}

export function WaiveOffDialog({
  isOpen,
  onClose,
  onSuccess,
  orderId,
  invoiceId,
  availableBalance,
  customerName,
  type
}: WaiveOffDialogProps) {
  const [waiveAmount, setWaiveAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Handler to set full pending amount
  const handleWaiveFullAmount = () => {
    setWaiveAmount(availableBalance.toString());
  };

  const handleWaiveOff = async () => {
    const amount = parseFloat(waiveAmount);
    
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (amount > availableBalance) {
      setError(`Cannot waive more than available balance of ₹${availableBalance.toFixed(2)}`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/finance/waive-off', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sales_order_id: orderId,
          invoice_id: invoiceId,
          waived_amount: amount,
          reason: reason.trim() || 'No reason provided'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process waive-off');
      }

      console.log('✅ Waive-off successful:', data);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('❌ Waive-off error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process waive-off');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setWaiveAmount('');
    setReason('');
    setError('');
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Minus className="h-5 w-5 text-orange-600" />
            </div>
            Waive Off Amount
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer and Balance Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Customer:</span>
              <span className="font-medium">{customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {type === 'order' ? 'Order Balance:' : 'Invoice Balance:'}
              </span>
              <span className="font-bold text-green-600">
                {formatCurrency(availableBalance)}
              </span>
            </div>
          </div>

          {/* Waive Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="waiveAmount" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Amount to Waive Off
            </Label>
            <div className="flex gap-2">
              <Input
                id="waiveAmount"
                type="number"
                placeholder="0.00"
                value={waiveAmount}
                onChange={(e) => setWaiveAmount(e.target.value)}
                min="0"
                max={availableBalance}
                step="0.01"
                className="text-lg font-medium flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleWaiveFullAmount}
                disabled={loading || availableBalance <= 0}
                className="whitespace-nowrap"
              >
                Full Amount
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Maximum: {formatCurrency(availableBalance)}
            </p>
            {/* Show preview of remaining balance */}
            {waiveAmount && parseFloat(waiveAmount) > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-700 font-medium">After waive-off:</span>
                  <span className="font-bold text-blue-800">
                    {formatCurrency(availableBalance - parseFloat(waiveAmount))}
                  </span>
                </div>
                {(availableBalance - parseFloat(waiveAmount)) <= 0 && (
                  <div className="mt-2 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                    ✅ This will mark the {type} as fully paid
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Waive-off</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for waiving off this amount (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Warning */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action will permanently reduce the {type === 'order' ? 'order' : 'invoice'} amount 
              and cannot be undone. The amount will be deducted from the total due.
            </AlertDescription>
          </Alert>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleWaiveOff}
            disabled={loading || !waiveAmount || parseFloat(waiveAmount) <= 0}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? 'Processing...' : 'Confirm Waive-off'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
