"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  CreditCard, 
  Banknote, 
  Building2, 
  Smartphone, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle,
  AlertTriangle,
  Loader2,
  Calculator
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PaymentMethod {
  id: string;
  type: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'bajaj_finance';
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface PaymentConfiguration {
  method: string;
  amount: number;
  reference?: string;
  cardDetails?: {
    number: string;
    expiry: string;
    cvv: string;
    name: string;
  };
  upiId?: string;
  bankDetails?: {
    accountNumber: string;
    ifsc: string;
    beneficiaryName: string;
  };
  bajajFinance?: {
    tenure: number;
    interestRate: number;
    processingFee: number;
    emiAmount: number;
  };
}

interface PaymentProcessingProps {
  totalAmount: number;
  paymentConfigurations: PaymentConfiguration[];
  selectedMethods: string[];
  enableBajajFinance: boolean;
  bajajSplitOrders: boolean;
  isProcessing: boolean;
  onPaymentMethodAdd: (method: string) => void;
  onPaymentMethodRemove: (index: number) => void;
  onPaymentConfigUpdate: (index: number, config: Partial<PaymentConfiguration>) => void;
  onBajajFinanceToggle: (enabled: boolean) => void;
  onBajajSplitToggle: (enabled: boolean) => void;
  onProcessPayment: () => void;
  onBack: () => void;
  onComplete: () => void;
  isLoading?: boolean;
}

export function PaymentProcessing({
  totalAmount,
  paymentConfigurations,
  selectedMethods,
  enableBajajFinance,
  bajajSplitOrders,
  isProcessing,
  onPaymentMethodAdd,
  onPaymentMethodRemove,
  onPaymentConfigUpdate,
  onBajajFinanceToggle,
  onBajajSplitToggle,
  onProcessPayment,
  onBack,
  onComplete,
  isLoading = false
}: PaymentProcessingProps) {
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'cash',
      type: 'cash',
      label: 'Cash Payment',
      icon: <Banknote className="h-5 w-5" />,
      description: 'Direct cash payment'
    },
    {
      id: 'card',
      type: 'card',
      label: 'Card Payment',
      icon: <CreditCard className="h-5 w-5" />,
      description: 'Credit/Debit card payment'
    },
    {
      id: 'upi',
      type: 'upi',
      label: 'UPI Payment',
      icon: <Smartphone className="h-5 w-5" />,
      description: 'UPI digital payment'
    },
    {
      id: 'bank_transfer',
      type: 'bank_transfer',
      label: 'Bank Transfer',
      icon: <Building2 className="h-5 w-5" />,
      description: 'Direct bank transfer'
    },
    {
      id: 'bajaj_finance',
      type: 'bajaj_finance',
      label: 'Bajaj Finance EMI',
      icon: <Calculator className="h-5 w-5" />,
      description: 'EMI through Bajaj Finance'
    }
  ];

  const getTotalConfiguredAmount = () => {
    return paymentConfigurations.reduce((total, config) => total + config.amount, 0);
  };

  const getRemainingAmount = () => {
    return totalAmount - getTotalConfiguredAmount();
  };

  const isPaymentComplete = () => {
    return Math.abs(getRemainingAmount()) < 0.01;
  };

  const renderPaymentMethodSelector = () => {
    const availableMethods = paymentMethods.filter(method => 
      !selectedMethods.includes(method.id) || method.id === 'cash'
    );

    return (
      <Card className="border-2 border-dashed border-blue-300 bg-blue-50/50">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Payment Method</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableMethods.map((method) => (
              <Button
                key={method.id}
                variant="outline"
                onClick={() => onPaymentMethodAdd(method.id)}
                className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-blue-100 hover:border-blue-400"
                disabled={method.id === 'bajaj_finance' && !enableBajajFinance}
              >
                <div className="text-blue-600">{method.icon}</div>
                <div className="text-center">
                  <div className="font-medium">{method.label}</div>
                  <div className="text-xs text-gray-500">{method.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPaymentConfiguration = (config: PaymentConfiguration, index: number) => {
    const method = paymentMethods.find(m => m.id === config.method);
    if (!method) return null;

    return (
      <Card key={index} className="border-2 border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-blue-600">{method.icon}</div>
              <div>
                <CardTitle className="text-lg">{method.label}</CardTitle>
                <p className="text-sm text-gray-600">{method.description}</p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onPaymentMethodRemove(index)}
            >
              Remove
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Amount Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                value={config.amount}
                onChange={(e) => onPaymentConfigUpdate(index, { amount: parseFloat(e.target.value) || 0 })}
                placeholder="Enter amount"
                className="text-lg font-semibold"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input
                value={config.reference || ''}
                onChange={(e) => onPaymentConfigUpdate(index, { reference: e.target.value })}
                placeholder="Optional reference"
              />
            </div>
          </div>

          {/* Method-specific configurations */}
          {config.method === 'card' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Card Number</Label>
                <Input
                  value={config.cardDetails?.number || ''}
                  onChange={(e) => onPaymentConfigUpdate(index, { 
                    cardDetails: { 
                      number: e.target.value,
                      expiry: config.cardDetails?.expiry || '',
                      cvv: config.cardDetails?.cvv || '',
                      name: config.cardDetails?.name || ''
                    } 
                  })}
                  placeholder="**** **** **** ****"
                />
              </div>
              <div className="space-y-2">
                <Label>Cardholder Name</Label>
                <Input
                  value={config.cardDetails?.name || ''}
                  onChange={(e) => onPaymentConfigUpdate(index, { 
                    cardDetails: { 
                      number: config.cardDetails?.number || '',
                      expiry: config.cardDetails?.expiry || '',
                      cvv: config.cardDetails?.cvv || '',
                      name: e.target.value
                    } 
                  })}
                  placeholder="Name on card"
                />
              </div>
            </div>
          )}

          {config.method === 'upi' && (
            <div className="space-y-2 pt-4 border-t">
              <Label>UPI ID</Label>
              <Input
                value={config.upiId || ''}
                onChange={(e) => onPaymentConfigUpdate(index, { upiId: e.target.value })}
                placeholder="user@bank"
              />
            </div>
          )}

          {config.method === 'bajaj_finance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>EMI Tenure (Months)</Label>
                <Select 
                  value={config.bajajFinance?.tenure?.toString() || ''}
                  onValueChange={(value) => onPaymentConfigUpdate(index, {
                    bajajFinance: { 
                      tenure: parseInt(value),
                      interestRate: config.bajajFinance?.interestRate || 0,
                      processingFee: config.bajajFinance?.processingFee || 0,
                      emiAmount: config.bajajFinance?.emiAmount || 0
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Months</SelectItem>
                    <SelectItem value="6">6 Months</SelectItem>
                    <SelectItem value="9">9 Months</SelectItem>
                    <SelectItem value="12">12 Months</SelectItem>
                    <SelectItem value="18">18 Months</SelectItem>
                    <SelectItem value="24">24 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Interest Rate (%)</Label>
                <Input
                  type="number"
                  value={config.bajajFinance?.interestRate || ''}
                  onChange={(e) => onPaymentConfigUpdate(index, {
                    bajajFinance: { 
                      tenure: config.bajajFinance?.tenure || 0,
                      interestRate: parseFloat(e.target.value),
                      processingFee: config.bajajFinance?.processingFee || 0,
                      emiAmount: config.bajajFinance?.emiAmount || 0
                    }
                  })}
                  placeholder="Annual interest rate"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-800">
                Payment Processing
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Configure payment methods for {formatCurrency(totalAmount)}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Bajaj Finance Configuration */}
      <Card className="border-2 border-orange-200 bg-orange-50/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Calculator className="h-6 w-6 text-orange-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Bajaj Finance Integration</h3>
                <p className="text-sm text-gray-600">Enable EMI options for customers</p>
              </div>
            </div>
            <Switch
              checked={enableBajajFinance}
              onCheckedChange={onBajajFinanceToggle}
            />
          </div>
          
          {enableBajajFinance && (
            <div className="flex items-center space-x-2 mt-4">
              <Switch
                checked={bajajSplitOrders}
                onCheckedChange={onBajajSplitToggle}
              />
              <Label className="text-sm">Enable split orders for EMI processing</Label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Amount Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 border-2 border-blue-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{formatCurrency(totalAmount)}</div>
              <div className="text-sm text-gray-600">Total Amount</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(getTotalConfiguredAmount())}</div>
              <div className="text-sm text-gray-600">Configured</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getRemainingAmount() > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(getRemainingAmount())}
              </div>
              <div className="text-sm text-gray-600">Remaining</div>
            </div>
          </div>
          
          {!isPaymentComplete() && (
            <div className="flex items-center justify-center mt-4 p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-yellow-800 text-sm">
                Please configure payment methods to cover the full amount
              </span>
            </div>
          )}
          
          {isPaymentComplete() && (
            <div className="flex items-center justify-center mt-4 p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800 text-sm">
                Payment configuration complete
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Configurations */}
      <div className="space-y-4">
        {paymentConfigurations.map((config, index) => renderPaymentConfiguration(config, index))}
        
        {!isPaymentComplete() && renderPaymentMethodSelector()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading || isProcessing}
          className="flex items-center px-6 py-3 text-base"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cart
        </Button>
        
        <div className="flex space-x-4">
          <Button
            onClick={onProcessPayment}
            disabled={!isPaymentComplete() || isLoading || isProcessing}
            className="flex items-center px-8 py-3 text-base font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Process Payment
              </>
            )}
          </Button>
          
          <Button
            onClick={onComplete}
            disabled={!isPaymentComplete() || isLoading}
            className="flex items-center px-8 py-3 text-base font-medium bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Completing...
              </div>
            ) : (
              <>
                Complete Order
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
