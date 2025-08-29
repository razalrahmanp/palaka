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
  CheckCircle
} from "lucide-react";

interface EMIPlan {
  code: '6/0' | '10/2';
  name: string;
  description: string;
  months: number;
  interestRate: number;
  downPaymentMonths: number; // 0 for 6/0, 2 for 10/2
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
  additionalCharges: number; // ₹530 if no Bajaj card
  hasBajajCard: boolean;
  grandTotal: number; // Total including all charges
  approvedAmount: number; // Amount approved by Bajaj for the client
  finalBillAmount: number; // Bill amount after discount/MRP logic + 8%
  bajajServiceCharge: number; // 8% added to bill amount
  // Split bill support
  isSplitBill?: boolean;
  splitBillBajajAmount?: number; // Amount to be financed through Bajaj
  splitBillOtherAmount?: number; // Amount to be paid through other methods
  splitBillOtherPaymentMethods?: string[]; // Other payment methods for remaining amount
}

interface BajajFinanceCalculatorProps {
  isOpen: boolean;
  orderAmount: number;
  customerId: string;
  onClose: () => void;
  onSelect: (financeData: BajajFinanceData) => void;
}

const EMI_PLANS: EMIPlan[] = [
  {
    code: '6/0',
    name: '6 Months / 0 Down Payment',
    description: '6 months EMI with zero down payment',
    months: 6,
    interestRate: 0, // No interest - only processing fee
    downPaymentMonths: 0,
    processingFee: 768,
    minAmount: 10000,
    maxAmount: 500000
  },
  {
    code: '10/2',
    name: '10 Months / 2 Months Advance',
    description: '10 months EMI with 2 months advance as down payment',
    months: 10,
    interestRate: 0, // No interest - only processing fee
    downPaymentMonths: 2,
    processingFee: 768,
    minAmount: 10000,
    maxAmount: 500000
  }
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
  const [hasBajajCard, setHasBajajCard] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [splitBillData, setSplitBillData] = useState<BajajFinanceData | null>(null);

  // Calculate EMI details with real Bajaj Finance logic
  const calculateEMI = useCallback(() => {
    if (!selectedPlan || !approvedAmount) return;

    // Calculate bill amount with 8% service charge for Bajaj Finance
    const bajajServiceCharge = Math.round(orderAmount * 0.08);
    const finalBillAmount = orderAmount + bajajServiceCharge;

    // Calculate down payment based on plan type
    let calculatedDownPayment = 0;
    let financeAmount = finalBillAmount;

    if (selectedPlan.code === '10/2') {
      // For 10/2 plan: 2 months EMI advance as down payment
      // Since there's no interest, EMI = financeAmount / months
      const monthlyEmi = finalBillAmount / selectedPlan.months;
      calculatedDownPayment = Math.round(monthlyEmi * selectedPlan.downPaymentMonths);
      financeAmount = finalBillAmount - calculatedDownPayment;
    }
    // For 6/0 plan: zero down payment
    else if (selectedPlan.code === '6/0') {
      calculatedDownPayment = 0;
      financeAmount = finalBillAmount;
    }

    // Update down payment state
    setDownPayment(calculatedDownPayment);

    // Check if finance amount is within approved limits
    if (financeAmount > approvedAmount) {
      // Calculate split bill option
      const bajajFinanceAmount = approvedAmount; // Max Bajaj can finance
      const remainingAmount = financeAmount - approvedAmount; // Amount to pay by other methods
      
      // Calculate EMI for the approved amount only
      const emi = bajajFinanceAmount / selectedPlan.months;
      const totalAmount = emi * selectedPlan.months;
      const totalInterest = 0; // No interest for Bajaj Finance
      
      // Calculate additional charges
      const additionalCharges = hasBajajCard ? 0 : 530;
      const processingFee = selectedPlan.processingFee;
      const grandTotal = totalAmount + processingFee + additionalCharges + remainingAmount;
      
      // Create split bill data
      const splitBillFinanceData: BajajFinanceData = {
        orderAmount,
        financeAmount: bajajFinanceAmount, // Only the approved amount
        downPayment: calculatedDownPayment,
        plan: selectedPlan,
        monthlyEMI: Math.round(emi),
        totalAmount: Math.round(totalAmount),
        totalInterest: Math.round(totalInterest),
        processingFee,
        additionalCharges,
        hasBajajCard,
        grandTotal: Math.round(grandTotal),
        approvedAmount,
        finalBillAmount,
        bajajServiceCharge,
        // Split bill specific fields
        isSplitBill: true,
        splitBillBajajAmount: bajajFinanceAmount,
        splitBillOtherAmount: remainingAmount,
        splitBillOtherPaymentMethods: ['cash', 'card', 'bank_transfer']
      };
      
      setSplitBillData(splitBillFinanceData);
      setFinanceData(null); // Clear regular finance data
      return;
    }

    // EMI calculation with no interest - simple division
    const emi = financeAmount / selectedPlan.months;
    const totalAmount = emi * selectedPlan.months;
    const totalInterest = 0; // No interest for Bajaj Finance

    // Calculate additional charges
    const additionalCharges = hasBajajCard ? 0 : 530;
    const processingFee = selectedPlan.processingFee;
    const grandTotal = totalAmount + processingFee + additionalCharges;

    setFinanceData({
      orderAmount,
      financeAmount,
      downPayment: calculatedDownPayment,
      plan: selectedPlan,
      monthlyEMI: Math.round(emi),
      totalAmount: Math.round(totalAmount),
      totalInterest: Math.round(totalInterest),
      processingFee,
      additionalCharges,
      hasBajajCard,
      grandTotal: Math.round(grandTotal),
      approvedAmount,
      finalBillAmount,
      bajajServiceCharge,
      isSplitBill: false
    });
    
    // Clear split bill data when regular finance is possible
    setSplitBillData(null);
  }, [selectedPlan, orderAmount, hasBajajCard, approvedAmount]);

  // Calculate EMI when plan or card status changes
  useEffect(() => {
    if (selectedPlan && orderAmount > 0) {
      calculateEMI();
    }
  }, [selectedPlan, orderAmount, hasBajajCard, calculateEMI]);

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
    // Down payment will be calculated automatically based on plan type
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
    setHasBajajCard(false);
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
              {/* Bajaj Card Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bajaj Finance Card Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Do you have a Bajaj Finance Card? (₹530 additional charge if you don&apos;t have one)
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={hasBajajCard ? "default" : "outline"}
                        onClick={() => setHasBajajCard(true)}
                        className="flex flex-col h-16"
                      >
                        <span className="text-sm font-medium">Yes, I have</span>
                        <span className="text-xs text-gray-500">Bajaj Finance Card</span>
                      </Button>
                      
                      <Button
                        variant={!hasBajajCard ? "default" : "outline"}
                        onClick={() => setHasBajajCard(false)}
                        className="flex flex-col h-16"
                      >
                        <span className="text-sm font-medium">No, I don&apos;t have</span>
                        <span className="text-xs text-gray-500">+₹530 charges</span>
                      </Button>
                    </div>
                    
                    {!hasBajajCard && (
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        <AlertTriangle className="h-4 w-4 inline mr-2" />
                        Additional charge of ₹530 will be applied for new customers
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Approved Amount */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bajaj Finance Approved Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Label htmlFor="approvedAmount">Enter amount approved by Bajaj Finance for this customer</Label>
                    <Input
                      id="approvedAmount"
                      type="number"
                      placeholder="Enter approved amount"
                      value={approvedAmount || ''}
                      onChange={(e) => setApprovedAmount(Number(e.target.value))}
                      className="text-lg"
                    />
                    <p className="text-sm text-gray-600">
                      This is the maximum amount Bajaj Finance has approved for financing for this customer.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* EMI Plans */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Available EMI Plans</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {EMI_PLANS.map((plan) => {
                      const isSelectable = orderAmount >= plan.minAmount;
                      
                      return (
                        <Card
                          key={plan.code}
                          className={`cursor-pointer transition-all ${
                            selectedPlan?.code === plan.code
                              ? 'ring-2 ring-blue-500 bg-blue-50'
                              : isSelectable
                              ? 'hover:bg-gray-50'
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                          onClick={() => isSelectable && selectPlan(plan)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{plan.code}</div>
                                <div className="text-sm font-medium">{plan.name}</div>
                                <div className="text-xs text-gray-600">{plan.description}</div>
                              </div>
                              
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Interest Rate:</span>
                                  <span className="font-medium text-green-600">0% (No Interest)</span>
                                </div>
                                
                                <div className="flex justify-between">
                                  <span>Processing Fee:</span>
                                  <span className="font-medium">₹{plan.processingFee}</span>
                                </div>
                                
                                <div className="flex justify-between">
                                  <span>Down Payment:</span>
                                  <span className="font-medium">
                                    {plan.downPaymentMonths === 0 ? 'Zero' : `${plan.downPaymentMonths} months advance`}
                                  </span>
                                </div>
                                
                                <div className="text-xs text-gray-500 text-center border-t pt-2">
                                  Amount: ₹{plan.minAmount.toLocaleString()} - ₹{plan.maxAmount.toLocaleString()}
                                </div>
                              </div>

                              {!isSelectable && (
                                <Badge variant="destructive" className="w-full justify-center">
                                  Minimum ₹{plan.minAmount.toLocaleString()}
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

              {/* Down Payment Info */}
              {selectedPlan && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Down Payment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>Down Payment for {selectedPlan.name}:</strong>
                      </p>
                      {selectedPlan.code === '6/0' && (
                        <p className="text-sm text-blue-700">
                          Zero down payment required for this plan.
                        </p>
                      )}
                      {selectedPlan.code === '10/2' && (
                        <p className="text-sm text-blue-700">
                          Down payment will be automatically calculated as 2 months EMI advance.
                        </p>
                      )}
                    </div>

                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Original Order Amount:</span>
                          <span>₹{orderAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Bajaj Service Charge (8%):</span>
                          <span>+₹{Math.round(orderAmount * 0.08).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-1">
                          <span>Final Bill Amount:</span>
                          <span>₹{(orderAmount + Math.round(orderAmount * 0.08)).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Down Payment (Auto-calculated):</span>
                          <span>₹{downPayment.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-1">
                          <span>Finance Amount:</span>
                          <span>₹{(orderAmount + Math.round(orderAmount * 0.08) - downPayment).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Approval Validation */}
              {selectedPlan && approvedAmount > 0 && (
                <Card className={`border-2 ${
                  (orderAmount + Math.round(orderAmount * 0.08) - downPayment) > approvedAmount 
                    ? 'border-red-200 bg-red-50' 
                    : 'border-green-200 bg-green-50'
                }`}>
                  <CardContent className="pt-4">
                    {(orderAmount + Math.round(orderAmount * 0.08) - downPayment) > approvedAmount ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertTriangle className="h-5 w-5" />
                          <div>
                            <p className="font-medium">Finance amount exceeds approved limit!</p>
                            <p className="text-sm">
                              Required: ₹{(orderAmount + Math.round(orderAmount * 0.08) - downPayment).toLocaleString()} | 
                              Approved: ₹{approvedAmount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        {/* Split Bill Option */}
                        {splitBillData && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-blue-700 mb-3">
                              <CreditCard className="h-5 w-5" />
                              <h4 className="font-medium">Split Bill Available</h4>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-blue-600 font-medium">Bajaj Finance</p>
                                  <p>₹{splitBillData.splitBillBajajAmount?.toLocaleString()}</p>
                                  <p className="text-xs text-gray-600">
                                    {splitBillData.monthlyEMI} x {splitBillData.plan.months} months
                                  </p>
                                </div>
                                <div>
                                  <p className="text-blue-600 font-medium">Other Payment</p>
                                  <p>₹{splitBillData.splitBillOtherAmount?.toLocaleString()}</p>
                                  <p className="text-xs text-gray-600">Cash/Card/Transfer</p>
                                </div>
                              </div>
                              <Button 
                                onClick={() => onSelect(splitBillData)}
                                className="w-full mt-3"
                                variant="outline"
                              >
                                Select Split Bill Option
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="h-5 w-5" />
                        <div>
                          <p className="font-medium">Finance amount within approved limit</p>
                          <p className="text-sm">
                            Required: ₹{(orderAmount + Math.round(orderAmount * 0.08) - downPayment).toLocaleString()} | 
                            Approved: ₹{approvedAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
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
                        <span>Original Order Amount:</span>
                        <span>₹{financeData.orderAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bajaj Service Charge (8%):</span>
                        <span className="text-orange-600">+₹{financeData.bajajServiceCharge.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Final Bill Amount:</span>
                        <span>₹{financeData.finalBillAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Down Payment:</span>
                        <span>₹{financeData.downPayment.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Finance Amount:</span>
                        <span>₹{financeData.financeAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Approved Amount:</span>
                        <span className="text-green-600">₹{financeData.approvedAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Interest:</span>
                        <span className="text-green-600">₹0 (No Interest)</span>
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
