'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Split,
  CreditCard,
  Banknote,
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  product_id?: string;
  custom_product_id?: string;
  configuration?: object;
  supplier_id?: string;
  supplier_name?: string;
  image_url?: string;
  notes?: string;
}

interface BajajFinanceData {
  orderAmount: number;
  financeAmount: number;
  downPayment: number;
  plan: {
    months: number;
    interestRate: number;
    processingFee: number;
    minAmount: number;
    maxAmount: number;
  };
  monthlyEMI: number;
  totalAmount: number;
  totalInterest: number;
  processingFee: number;
}

export interface SplitOrder {
  bajajOrder: {
    amount: number;
    emiDetails: BajajFinanceData;
    items: CartItem[];
  };
  directPaymentOrder: {
    amount: number;
    items: CartItem[];
  };
}

interface SplitOrderManagerProps {
  isOpen: boolean;
  orderAmount: number;
  bajajFinanceData: BajajFinanceData;
  cartItems: CartItem[];
  onClose: () => void;
  onConfirmSplit: (splitOrder: SplitOrder) => void | Promise<void>;
}

export function SplitOrderManager({
  isOpen,
  orderAmount,
  bajajFinanceData,
  cartItems,
  onClose,
  onConfirmSplit
}: SplitOrderManagerProps) {
  const [splitOrder, setSplitOrder] = useState<SplitOrder | null>(null);

  // Calculate split when component loads
  const calculateSplit = useCallback(() => {
    if (!isOpen || !bajajFinanceData || cartItems.length === 0) return;

    try {
      // Calculate the amounts
      const maxBajajAmount = bajajFinanceData.plan.maxAmount + bajajFinanceData.downPayment;
      const bajajOrderAmount = Math.min(orderAmount, maxBajajAmount);
      const directPaymentAmount = Math.max(0, orderAmount - bajajOrderAmount);

      // Sort items by priority (expensive items first for Bajaj financing)
      const sortedItems = [...cartItems].sort((a, b) => {
        const aTotal = a.quantity * a.unit_price;
        const bTotal = b.quantity * b.unit_price;
        return bTotal - aTotal;
      });

      // Allocate items to Bajaj and direct payment orders
      const bajajItems: CartItem[] = [];
      const directPaymentItems: CartItem[] = [];
      let currentBajajTotal = 0;

      for (const item of sortedItems) {
        const itemTotal = item.quantity * item.unit_price;
        
        if (currentBajajTotal + itemTotal <= bajajOrderAmount && bajajItems.length < 10) {
          // Add to Bajaj order if within limit and not too many items
          bajajItems.push(item);
          currentBajajTotal += itemTotal;
        } else {
          // Add to direct payment order
          directPaymentItems.push(item);
        }
      }

      // Adjust Bajaj finance data for actual amount
      const adjustedBajajFinance: BajajFinanceData = {
        ...bajajFinanceData,
        orderAmount: currentBajajTotal,
        financeAmount: Math.max(0, currentBajajTotal - bajajFinanceData.downPayment)
      };

      // Recalculate EMI for adjusted amount
      if (adjustedBajajFinance.financeAmount > 0) {
        const monthlyRate = adjustedBajajFinance.plan.interestRate / 100 / 12;
        const emi = adjustedBajajFinance.financeAmount * monthlyRate * 
                   Math.pow(1 + monthlyRate, adjustedBajajFinance.plan.months) / 
                   (Math.pow(1 + monthlyRate, adjustedBajajFinance.plan.months) - 1);
        
        adjustedBajajFinance.monthlyEMI = Math.round(emi);
        adjustedBajajFinance.totalAmount = Math.round(emi * adjustedBajajFinance.plan.months);
        adjustedBajajFinance.totalInterest = adjustedBajajFinance.totalAmount - adjustedBajajFinance.financeAmount;
      }

      const split: SplitOrder = {
        bajajOrder: {
          amount: currentBajajTotal,
          emiDetails: adjustedBajajFinance,
          items: bajajItems
        },
        directPaymentOrder: {
          amount: directPaymentAmount,
          items: directPaymentItems
        }
      };

      setSplitOrder(split);
    } catch (error) {
      console.error('Error calculating split:', error);
    }
  }, [isOpen, bajajFinanceData, cartItems, orderAmount]);

  useEffect(() => {
    calculateSplit();
  }, [calculateSplit]);

  const handleConfirmSplit = () => {
    if (splitOrder) {
      onConfirmSplit(splitOrder);
    }
  };

  if (!splitOrder) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Split className="h-5 w-5" />
              Calculating Order Split...
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="h-5 w-5" />
            Split Order - Credit Limit Exceeded
          </DialogTitle>
        </DialogHeader>

        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            The order amount (₹{orderAmount.toLocaleString()}) exceeds the Bajaj Finance maximum limit 
            (₹{bajajFinanceData.plan.maxAmount.toLocaleString()}). The order will be split into two separate orders.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bajaj Finance Order */}
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <CreditCard className="h-5 w-5" />
                Bajaj Finance Order
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Order #1
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Amount Summary */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Order Amount:</span>
                  <span className="font-medium">₹{splitOrder.bajajOrder.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Down Payment:</span>
                  <span className="font-medium">₹{splitOrder.bajajOrder.emiDetails.downPayment.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Finance Amount:</span>
                  <span className="font-medium text-blue-600">₹{splitOrder.bajajOrder.emiDetails.financeAmount.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Monthly EMI:</span>
                  <span className="text-blue-600">₹{splitOrder.bajajOrder.emiDetails.monthlyEMI.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-600">
                  {splitOrder.bajajOrder.emiDetails.plan.months} months @ {splitOrder.bajajOrder.emiDetails.plan.interestRate}% p.a.
                </div>
              </div>

              {/* Items in Bajaj Order */}
              <div>
                <h4 className="font-medium text-sm mb-2">Items ({splitOrder.bajajOrder.items.length})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {splitOrder.bajajOrder.items.map((item, index) => (
                    <div key={index} className="text-xs bg-gray-50 p-2 rounded flex justify-between">
                      <span className="truncate">{item.name}</span>
                      <span className="font-medium">₹{(item.quantity * item.unit_price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Direct Payment Order */}
          <Card className="border-green-200">
            <CardHeader className="bg-green-50">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Banknote className="h-5 w-5" />
                Direct Payment Order
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Order #2
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Amount Summary */}
              <div className="space-y-2">
                <div className="flex justify-between font-semibold">
                  <span>Total Amount:</span>
                  <span className="text-green-600">₹{splitOrder.directPaymentOrder.amount.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-600">
                  Payment required at time of order
                </div>
              </div>

              {/* Items in Direct Payment Order */}
              <div>
                <h4 className="font-medium text-sm mb-2">Items ({splitOrder.directPaymentOrder.items.length})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {splitOrder.directPaymentOrder.items.map((item, index) => (
                    <div key={index} className="text-xs bg-gray-50 p-2 rounded flex justify-between">
                      <span className="truncate">{item.name}</span>
                      <span className="font-medium">₹{(item.quantity * item.unit_price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Total Orders</div>
                  <div className="font-bold text-lg">2</div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="text-center">
                  <div className="text-sm text-gray-600">Combined Amount</div>
                  <div className="font-bold text-lg">₹{orderAmount.toLocaleString()}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-600">Immediate Payment Required</div>
                <div className="font-semibold text-green-600">
                  ₹{(splitOrder.bajajOrder.emiDetails.downPayment + splitOrder.directPaymentOrder.amount).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirmSplit} className="bg-blue-600 hover:bg-blue-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirm Split Orders
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
