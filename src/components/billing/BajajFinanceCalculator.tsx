import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Percent
} from "lucide-react";

interface EMIPlan {
  months: number;
  interestRate: number;
  processingFee: number;
  minAmount: number;
  maxAmount: number;
}

export interface BajajFinanceData {
  orderAmount: number;
  financeAmount: number;
  downPayment: number;
  plan: EMIPlan;
  monthlyEMI: number;
  totalAmount: number;
  totalInterest: number;
  processingFee: number;
}

interface BajajFinanceCalculatorProps {
  isOpen: boolean;
  orderAmount: number;
  customerId: string;
  onClose: () => void;
  onSelect: (financeData: BajajFinanceData) => void;
}

const EMI_PLANS: EMIPlan[] = [
  { months: 3, interestRate: 12, processingFee: 299, minAmount: 5000, maxAmount: 100000 },
  { months: 6, interestRate: 13, processingFee: 399, minAmount: 10000, maxAmount: 150000 },
  { months: 9, interestRate: 14, processingFee: 499, minAmount: 15000, maxAmount: 200000 },
  { months: 12, interestRate: 15, processingFee: 599, minAmount: 20000, maxAmount: 300000 },
  { months: 18, interestRate: 16, processingFee: 799, minAmount: 30000, maxAmount: 400000 },
  { months: 24, interestRate: 17, processingFee: 999, minAmount: 40000, maxAmount: 500000 }
];

export function BajajFinanceCalculator({ 
  isOpen, 
  orderAmount, 
  customerId, 
  onClose, 
  onSelect 
}: BajajFinanceCalculatorProps) {
  const [selectedPlan, setSelectedPlan] = useState<EMIPlan | null>(null);
  const [downPayment, setDownPayment] = useState(0);
  const [financeData, setFinanceData] = useState<BajajFinanceData | null>(null);
  const [eligibilityStatus, setEligibilityStatus] = useState<'checking' | 'eligible' | 'ineligible' | null>(null);

  // Calculate EMI details
  const calculateEMI = useCallback(() => {
    if (!selectedPlan) return;

    const financeAmount = Math.max(0, orderAmount - downPayment);
    
    // Check if finance amount is within plan limits
    if (financeAmount < selectedPlan.minAmount || financeAmount > selectedPlan.maxAmount) {
      setFinanceData(null);
      return;
    }

    // EMI calculation using reducing balance method
    const monthlyRate = selectedPlan.interestRate / 100 / 12;
    const emi = financeAmount * monthlyRate * Math.pow(1 + monthlyRate, selectedPlan.months) / 
                (Math.pow(1 + monthlyRate, selectedPlan.months) - 1);
    
    const totalAmount = emi * selectedPlan.months;
    const totalInterest = totalAmount - financeAmount;

    setFinanceData({
      orderAmount,
      financeAmount,
      downPayment,
      plan: selectedPlan,
      monthlyEMI: Math.round(emi),
      totalAmount: Math.round(totalAmount),
      totalInterest: Math.round(totalInterest),
      processingFee: selectedPlan.processingFee
    });
  }, [selectedPlan, orderAmount, downPayment]);

  // Calculate EMI when plan or down payment changes
  useEffect(() => {
    if (selectedPlan && orderAmount > 0) {
      calculateEMI();
    }
  }, [selectedPlan, downPayment, orderAmount, calculateEMI]);

  // Check customer eligibility
  const checkEligibility = useCallback(async () => {
    if (!customerId) {
      setEligibilityStatus('ineligible');
      return;
    }

    setEligibilityStatus('checking');

    try {
      // Simulate Bajaj Finance eligibility check
      // In real implementation, this would call Bajaj Finance API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo, assume eligible if order amount >= 10000
      if (orderAmount >= 10000) {
        setEligibilityStatus('eligible');
      } else {
        setEligibilityStatus('ineligible');
      }
    } catch (error) {
      console.error('Eligibility check failed:', error);
      setEligibilityStatus('ineligible');
    }
  }, [customerId, orderAmount]);

  // Handle plan selection
  const selectPlan = (plan: EMIPlan) => {
    setSelectedPlan(plan);
    setDownPayment(Math.max(0, orderAmount - plan.maxAmount)); // Ensure within limits
  };

  // Handle EMI selection
  const handleSelectEMI = () => {
    if (financeData) {
      onSelect(financeData);
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedPlan(null);
    setDownPayment(0);
    setFinanceData(null);
    setEligibilityStatus(null);
  };

  // Handle close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Check eligibility on open
  useEffect(() => {
    if (isOpen) {
      checkEligibility();
    }
  }, [isOpen, checkEligibility]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Bajaj Finance EMI Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Order Amount:</span>
                <span className="text-green-600">₹{orderAmount.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Eligibility Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Eligibility Status</CardTitle>
            </CardHeader>
            <CardContent>
              {eligibilityStatus === 'checking' && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Checking eligibility with Bajaj Finance...</span>
                </div>
              )}
              
              {eligibilityStatus === 'eligible' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>You are eligible for Bajaj Finance EMI</span>
                </div>
              )}
              
              {eligibilityStatus === 'ineligible' && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Not eligible for EMI. Minimum order amount: ₹10,000</span>
                </div>
              )}
            </CardContent>
          </Card>

          {eligibilityStatus === 'eligible' && (
            <>
              {/* EMI Plans */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Available EMI Plans</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {EMI_PLANS.map((plan) => {
                      const isSelectable = orderAmount >= plan.minAmount;
                      
                      return (
                        <Card
                          key={plan.months}
                          className={`cursor-pointer transition-all ${
                            selectedPlan?.months === plan.months
                              ? 'ring-2 ring-blue-500 bg-blue-50'
                              : isSelectable
                              ? 'hover:bg-gray-50'
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                          onClick={() => isSelectable && selectPlan(plan)}
                        >
                          <CardContent className="p-4">
                            <div className="text-center space-y-2">
                              <div className="text-2xl font-bold">{plan.months}</div>
                              <div className="text-sm text-gray-600">Months</div>
                              
                              <div className="space-y-1">
                                <div className="flex items-center justify-center gap-1 text-sm">
                                  <Percent className="h-3 w-3" />
                                  <span>{plan.interestRate}% p.a.</span>
                                </div>
                                
                                <div className="text-xs text-gray-500">
                                  Processing Fee: ₹{plan.processingFee}
                                </div>
                                
                                <div className="text-xs text-gray-500">
                                  Range: ₹{plan.minAmount.toLocaleString()} - ₹{plan.maxAmount.toLocaleString()}
                                </div>
                              </div>

                              {!isSelectable && (
                                <Badge variant="destructive" className="text-xs">
                                  Min ₹{plan.minAmount.toLocaleString()}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Down Payment */}
              {selectedPlan && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Down Payment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="downPayment">Down Payment Amount</Label>
                      <Input
                        id="downPayment"
                        type="number"
                        value={downPayment}
                        onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
                        min={Math.max(0, orderAmount - selectedPlan.maxAmount)}
                        max={orderAmount - selectedPlan.minAmount}
                        className="mt-1"
                      />
                      <div className="text-sm text-gray-600 mt-1">
                        Range: ₹{Math.max(0, orderAmount - selectedPlan.maxAmount).toLocaleString()} - ₹{(orderAmount - selectedPlan.minAmount).toLocaleString()}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Order Amount:</span>
                          <span>₹{orderAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Down Payment:</span>
                          <span>₹{downPayment.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-1">
                          <span>Finance Amount:</span>
                          <span>₹{(orderAmount - downPayment).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* EMI Calculation */}
              {financeData && (
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-800">EMI Calculation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-white rounded">
                        <div className="text-2xl font-bold text-green-600">
                          ₹{financeData.monthlyEMI.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Monthly EMI</div>
                      </div>
                      
                      <div className="text-center p-4 bg-white rounded">
                        <div className="text-2xl font-bold text-blue-600">
                          {financeData.plan.months}
                        </div>
                        <div className="text-sm text-gray-600">Months</div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded space-y-2">
                      <div className="flex justify-between">
                        <span>Finance Amount:</span>
                        <span>₹{financeData.financeAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Interest:</span>
                        <span className="text-red-600">₹{financeData.totalInterest.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processing Fee:</span>
                        <span>₹{financeData.processingFee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-2">
                        <span>Total Payable:</span>
                        <span>₹{(financeData.totalAmount + financeData.processingFee).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleClose} className="flex-1">
                        Cancel
                      </Button>
                      <Button onClick={handleSelectEMI} className="flex-1">
                        <Calculator className="h-4 w-4 mr-2" />
                        Select This EMI Plan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {eligibilityStatus === 'ineligible' && (
            <div className="text-center py-8">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
