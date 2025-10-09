'use client';

import { useState } from 'react';
import { ArrowRight, Package, Receipt, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import VendorBillSelector from './VendorBillSelector';
import ProductReturnSelector from './ProductReturnSelector';


interface VendorBill {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  remaining_amount: number;
  status: string;
  vendor: {
    id: string;
    name: string;
    email?: string;
  };
  vendor_bill_line_items: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    total_returned_quantity?: number;
  }[];
}

interface ReturnLineItem {
  vendor_bill_line_item_id: string;
  product_name: string;
  returned_quantity: number;
  unit_price: number;
  return_amount: number;
  reason?: string;
}



type Step = 'bill_selection' | 'product_selection';

interface PurchaseReturnWizardProps {
  preSelectedBill?: VendorBill;
  onClose?: () => void;
  fullScreen?: boolean;
}

export default function PurchaseReturnWizard({ preSelectedBill, onClose, fullScreen = false }: PurchaseReturnWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>(preSelectedBill ? 'product_selection' : 'bill_selection');
  const [selectedBill, setSelectedBill] = useState<VendorBill | null>(preSelectedBill || null);
  const [returnItems, setReturnItems] = useState<ReturnLineItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleBillSelect = (bill: VendorBill) => {
    setSelectedBill(bill);
    setCurrentStep('product_selection');
    setError(null);
  };

  const handleReturnItemsChange = (items: ReturnLineItem[]) => {
    setReturnItems(items);
  };

  const getTotalReturnAmount = () => {
    return returnItems.reduce((sum, item) => sum + item.return_amount, 0);
  };

  const canProceedToPayment = () => {
    return returnItems.length > 0 && getTotalReturnAmount() > 0;
  };

  const handleSubmitReturn = async () => {
    if (!selectedBill || !canProceedToPayment()) return;

    setProcessing(true);
    setError(null);

    try {
      const returnData = {
        reason: 'quality_issue', // Default reason
        reason_description: 'Product return processed via wizard',
        line_items: returnItems.map(item => ({
          vendor_bill_line_item_id: item.vendor_bill_line_item_id,
          returned_quantity: item.returned_quantity,
          return_reason: item.reason || 'other', // Use 'other' as default since it's allowed by DB constraint
          condition_at_return: 'opened_unused' as const,
          is_restockable: true
        }))
      };

      console.log('Sending return data:', returnData);

      const response = await fetch(`/api/vendors/${selectedBill.vendor.id}/bills/${selectedBill.id}/returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(returnData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process return');
      }

      await response.json();
      setSuccess(true);
      
      // Close modal after successful submission
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 1500); // Show success message briefly before closing
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the return');
    } finally {
      setProcessing(false);
    }
  };

  const resetWizard = () => {
    if (preSelectedBill) {
      // If opened from modal with preselected bill, reset to product selection
      setCurrentStep('product_selection');
      setSelectedBill(preSelectedBill);
    } else {
      // If standalone wizard, reset to bill selection
      setCurrentStep('bill_selection');
      setSelectedBill(null);
    }
    setReturnItems([]);
    setProcessing(false);
    setError(null);
    setSuccess(false);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStepIcon = (step: Step) => {
    switch (step) {
      case 'bill_selection':
        return <Receipt className="h-4 w-4" />;
      case 'product_selection':
        return <Package className="h-4 w-4" />;
    }
  };

  const getStepTitle = (step: Step) => {
    switch (step) {
      case 'bill_selection':
        return 'Select Bill';
      case 'product_selection':
        return 'Select Products';
    }
  };

  return (
    <div className={`${fullScreen ? 'w-full' : 'max-w-6xl mx-auto'} ${fullScreen ? 'px-6 py-4' : 'p-6'} space-y-6`}>
      {/* Header */}
      <div className="space-y-4">
        {!fullScreen && <h1 className="text-3xl font-bold">Purchase Return</h1>}
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {(['bill_selection', 'product_selection'] as Step[]).filter(step => 
            !preSelectedBill || step !== 'bill_selection'  // Hide bill_selection step if preSelectedBill
          ).map((step, index) => {
            const isActive = currentStep === step;
            const isCompleted = (['bill_selection', 'product_selection'] as Step[]).indexOf(currentStep) > index;
            const isClickable = (!preSelectedBill && step === 'bill_selection') || 
                               (step === 'product_selection' && selectedBill);

            return (
              <div key={step} className="flex items-center">
                <Button
                  variant={isActive ? 'default' : isCompleted ? 'secondary' : 'outline'}
                  size="sm"
                  className={`gap-2 ${isClickable && !processing ? 'cursor-pointer' : 'cursor-default'}`}
                  onClick={() => isClickable && !processing && setCurrentStep(step)}
                  disabled={!isClickable || processing}
                >
                  {getStepIcon(step)}
                  {getStepTitle(step)}
                </Button>
                {index < (preSelectedBill ? 2 : 3) && (
                  <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {currentStep === 'bill_selection' && !preSelectedBill && (
            <VendorBillSelector 
              onBillSelect={handleBillSelect}
              selectedBillId={selectedBill?.id}
            />
          )}

          {currentStep === 'product_selection' && selectedBill && (
            <ProductReturnSelector
              billLineItems={selectedBill.vendor_bill_line_items}
              onReturnItemsChange={handleReturnItemsChange}
              disabled={processing}
            />
          )}

          {success && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Return Processed Successfully
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p>Your purchase return has been processed successfully. You can now collect the reversal payment from the vendor bills list.</p>
                  
                  <div className="flex gap-2">
                    {onClose ? (
                      <>
                        <Button onClick={onClose} variant="default">
                          Close & Refresh
                        </Button>
                        <Button onClick={resetWizard} variant="outline">
                          Process Another Return
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={resetWizard}>
                          Process Another Return
                        </Button>
                        <Button variant="outline" onClick={() => window.location.href = '/purchase-returns'}>
                          View All Returns
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          {/* Bill Summary */}
          {selectedBill && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selected Bill</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="font-semibold">{selectedBill.bill_number}</div>
                  <div className="text-sm text-muted-foreground">{selectedBill.vendor.name}</div>
                </div>
                <div className="text-sm">
                  <div>Date: {formatDate(selectedBill.bill_date)}</div>
                  <div>Total: {formatAmount(selectedBill.total_amount)}</div>
                </div>
                <Badge variant="secondary">{selectedBill.status}</Badge>
              </CardContent>
            </Card>
          )}

          {/* Return Summary */}
          {returnItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Return Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {returnItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-muted-foreground">
                          Qty: {item.returned_quantity} × {formatAmount(item.unit_price)}
                        </div>
                      </div>
                      <div className="font-semibold">
                        {formatAmount(item.return_amount)}
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total Return</span>
                  <span>{formatAmount(getTotalReturnAmount())}</span>
                </div>
              </CardContent>
            </Card>
          )}


        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <div>
          {currentStep !== 'bill_selection' && !success && (
            <Button 
              variant="outline" 
              onClick={() => {
                const steps: Step[] = ['bill_selection', 'product_selection'];
                const currentIndex = steps.indexOf(currentStep);
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1]);
                }
              }}
              disabled={processing}
            >
              Back
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          {currentStep === 'product_selection' && returnItems.length > 0 && (
            <Button 
              onClick={handleSubmitReturn}
              disabled={!canProceedToPayment() || processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Process Return
                  <CheckCircle className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}