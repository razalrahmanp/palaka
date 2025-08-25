import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calculator,
  DollarSign,
  Receipt,
  Users,
  AlertTriangle,
  X
} from "lucide-react";

// Import existing components
import { BajajFinanceCalculator } from './BajajFinanceCalculator';

// Import types from the shared types file
import { ProductWithInventory } from '@/types';

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

interface BillingCustomer {
  customer_id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
}

interface BillingItem {
  id: string;
  quantity: number;
  originalPrice: number;
  finalPrice: number;
  totalPrice: number;
  discountAmount: number;
  discountPercentage: number;
  tax: number;
  isCustom: boolean;
  product?: ProductWithInventory;
  customProduct?: {
    name: string;
    description?: string;
    category: string;
    price: number;
    cost: number;
    hsn_code?: string;
    tax_rate: number;
    unit?: string;
  };
}

interface BillingData {
  subtotal: number;
  totalTax: number;
  finalTotal: number;
  items: BillingItem[];
  bajajFinance?: BajajFinanceData;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  billingData: BillingData;
  selectedCustomer?: BillingCustomer | null;
  onBajajFinanceSetup: (data: BajajFinanceData) => void;
  onDirectPayment: () => void;
}

export function BillingActionDialog({
  isOpen,
  onClose,
  billingData,
  selectedCustomer,
  onBajajFinanceSetup,
  onDirectPayment
}: Props) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showBajajCalculator, setShowBajajCalculator] = useState(false);

  // Calculate Bajaj Finance eligibility
  const isBajajEligible = billingData.finalTotal >= 12000;
  const remainingForBajaj = Math.max(0, 12000 - billingData.finalTotal);

  const handleClose = useCallback(() => {
    setActiveTab("overview");
    setShowBajajCalculator(false);
    onClose();
  }, [onClose]);

  // Handle Escape key to close dialog
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleClose]);

  const handleBajajFinanceClick = () => {
    if (isBajajEligible) {
      setShowBajajCalculator(true);
      setActiveTab("bajaj");
    }
  };

  const handleDirectPaymentClick = () => {
    onDirectPayment();
    handleClose();
  };

  const handleSplitOrderClick = () => {
    if (billingData.bajajFinance) {
      // For now, just show a message or redirect to overview
      setActiveTab("overview");
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-y-0 right-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end"
      onClick={(e) => {
        // Close dialog when clicking on backdrop
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <Card className="w-full max-w-lg h-full border-l border-gray-200 shadow-2xl bg-white overflow-hidden rounded-none border-t-0 border-r-0 border-b-0">
        <CardHeader className="pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment Options
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 lg:p-6 overflow-y-auto flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 rounded-lg p-1 flex-shrink-0">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm py-2 px-3"
              >
                <Receipt className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="bajaj" 
                disabled={!isBajajEligible}
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm disabled:opacity-50 text-sm py-2 px-3"
              >
                <Calculator className="h-4 w-4" />
                Bajaj
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-4">
                {/* Order Summary */}
                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-gray-800">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">₹{billingData.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">₹{billingData.totalTax.toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center text-lg font-semibold">
                        <span>Total:</span>
                        <span className="text-green-600">₹{billingData.finalTotal.toLocaleString()}</span>
                      </div>
                    </div>
                    {billingData.items.length > 0 && (
                      <div className="text-sm text-gray-500 pt-2 border-t">
                        {billingData.items.length} item(s) in cart
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Payment Actions */}
                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-gray-800">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Direct Payment */}
                    <Button
                      onClick={handleDirectPaymentClick}
                      className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Process Full Payment
                    </Button>

                    {/* Bajaj Finance */}
                    {isBajajEligible ? (
                      <Button
                        onClick={handleBajajFinanceClick}
                        variant="outline"
                        className="w-full justify-start border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        <Calculator className="h-4 w-4 mr-2" />
                        Bajaj Finance EMI
                      </Button>
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Bajaj Finance Unavailable</p>
                            <p className="text-xs text-gray-600">
                              Minimum order value: ₹12,000<br />
                              Current: ₹{billingData.finalTotal.toLocaleString()}<br />
                              Need ₹{remainingForBajaj.toLocaleString()} more
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Split Order */}
                    {billingData.bajajFinance && (
                      <Button
                        onClick={handleSplitOrderClick}
                        variant="outline"
                        className="w-full justify-start border-purple-200 text-purple-600 hover:bg-purple-50"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Split Payment Order
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Customer Info (if selected) */}
                {selectedCustomer && (
                  <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-gray-800">Customer Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                        {selectedCustomer.email && (
                          <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                        )}
                        {selectedCustomer.phone && (
                          <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Bajaj Finance Tab */}
            <TabsContent value="bajaj" className="space-y-4 flex-1 overflow-y-auto">
              {showBajajCalculator ? (
                <div className="space-y-4">
                  <BajajFinanceCalculator
                    isOpen={true}
                    orderAmount={billingData.finalTotal}
                    customerId={selectedCustomer?.customer_id || 'guest'}
                    onSelect={onBajajFinanceSetup}
                    onClose={() => {
                      setShowBajajCalculator(false);
                      setActiveTab("overview");
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calculator className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Setup Bajaj Finance EMI for your order</p>
                  <Button 
                    onClick={() => setShowBajajCalculator(true)} 
                    disabled={!isBajajEligible}
                    className="px-6 py-2"
                  >
                    Calculate EMI Options
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
